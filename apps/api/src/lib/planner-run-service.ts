import type { Run } from '@prisma/client';

import { prisma } from './prisma.js';
import { resolveModelSelection } from './model-registry.js';
import { findOwnedEpisode } from './ownership.js';
import { resolvePlannerAgentSelection } from './planner-agent-registry.js';
import { buildPlannerOutlineRefinementHints } from './planner-outline-doc.js';
import { buildPlannerGenerationPrompt, createPlannerUserMessage } from './planner-orchestrator.js';
import { serializeRunInput } from './run-input.js';
import { resolvePlannerTargetVideoModel } from './planner-target-video-model.js';
import { hasUsableProviderRuntimeConfig, resolveProviderRuntimeConfigForUser } from './provider-runtime-config.js';
import { resolveUserDefaultModelSelection } from './user-model-defaults.js';

interface QueuePlannerGenerateDocRunArgs {
  projectId: string;
  episodeId: string;
  userId: string;
  prompt?: string;
  subtype?: string;
  modelFamily?: string;
  modelEndpoint?: string;
  targetVideoModelFamilySlug?: string;
  idempotencyKey?: string;
}

type QueuePlannerGenerateDocRunError =
  | 'NOT_FOUND'
  | 'MODEL_NOT_FOUND'
  | 'PLANNER_AGENT_NOT_CONFIGURED'
  | 'PROVIDER_NOT_CONFIGURED';

export type QueuePlannerGenerateDocRunResult =
  | {
      ok: true;
      plannerSession: {
        id: string;
        status: 'updating';
      };
      targetStage: 'outline' | 'refinement';
      triggerType: string;
      run: Run;
    }
  | {
      ok: false;
      error: QueuePlannerGenerateDocRunError;
    };

async function findOrCreateActivePlannerSessionWithDeps(
  projectId: string,
  episodeId: string,
  userId: string,
  deps: {
    prisma: Pick<typeof prisma, 'plannerSession' | 'episode'>;
  },
) {
  const existing = await deps.prisma.plannerSession.findFirst({
    where: {
      projectId,
      episodeId,
      isActive: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (existing) {
    return existing;
  }

  const created = await deps.prisma.plannerSession.create({
    data: {
      projectId,
      episodeId,
      status: 'IDLE',
      isActive: true,
      createdById: userId,
    },
  });

  await deps.prisma.episode.update({
    where: { id: episodeId },
    data: {
      activePlannerSessionId: created.id,
    },
  });

  return created;
}

async function findOrCreateActivePlannerSession(projectId: string, episodeId: string, userId: string) {
  return findOrCreateActivePlannerSessionWithDeps(projectId, episodeId, userId, { prisma });
}

async function queuePlannerGenerateDocRunWithDeps(
  args: QueuePlannerGenerateDocRunArgs,
  deps: {
    findOwnedEpisode: typeof findOwnedEpisode;
    resolveUserDefaultModelSelection: typeof resolveUserDefaultModelSelection;
    resolveModelSelection: typeof resolveModelSelection;
    findOrCreateActivePlannerSession: typeof findOrCreateActivePlannerSessionWithDeps;
    resolvePlannerAgentSelection: typeof resolvePlannerAgentSelection;
    resolvePlannerTargetVideoModel: typeof resolvePlannerTargetVideoModel;
    resolveProviderRuntimeConfigForUser: typeof resolveProviderRuntimeConfigForUser;
    buildPlannerGenerationPrompt: typeof buildPlannerGenerationPrompt;
    createPlannerUserMessage: typeof createPlannerUserMessage;
    prisma: Pick<typeof prisma, 'projectCreationConfig' | 'plannerMessage' | 'plannerOutlineVersion' | 'plannerRefinementVersion' | '$transaction' | 'plannerSession' | 'episode'>;
  },
): Promise<QueuePlannerGenerateDocRunResult> {
  const episode = await deps.findOwnedEpisode(args.projectId, args.episodeId, args.userId);
  if (!episode) {
    return { ok: false, error: 'NOT_FOUND' };
  }

  const userDefaultModel = !args.modelFamily && !args.modelEndpoint
    ? await deps.resolveUserDefaultModelSelection(args.userId, 'TEXT')
    : null;

  const resolvedModel = await deps.resolveModelSelection({
    modelKind: 'TEXT',
    familySlug: args.modelFamily ?? userDefaultModel?.familySlug,
    endpointSlug: args.modelEndpoint ?? userDefaultModel?.endpointSlug,
    strategy: 'default',
  });
  if (!resolvedModel) {
    return { ok: false, error: 'MODEL_NOT_FOUND' };
  }

  const providerRuntimeConfig = await deps.resolveProviderRuntimeConfigForUser({
    userId: args.userId,
    providerId: resolvedModel.provider.id,
    fallbackCode: resolvedModel.provider.code,
    fallbackBaseUrl: resolvedModel.provider.baseUrl,
  });
  if (!hasUsableProviderRuntimeConfig(providerRuntimeConfig)) {
    return { ok: false, error: 'PROVIDER_NOT_CONFIGURED' };
  }

  const plannerSession = await deps.findOrCreateActivePlannerSession(episode.project.id, episode.id, args.userId, { prisma: deps.prisma });
  const creationConfig = await deps.prisma.projectCreationConfig.findUnique({
    where: {
      projectId: episode.project.id,
    },
    include: {
      subjectProfile: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      stylePreset: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      imageModelEndpoint: {
        select: {
          id: true,
          slug: true,
          label: true,
        },
      },
    },
  });
  const rawPrompt = args.prompt ?? episode.summary ?? episode.project.title;
  const selectedContentType = creationConfig?.selectedTab ?? '短剧漫剧';
  const selection = await deps.resolvePlannerAgentSelection({
    contentType: selectedContentType,
    subtype: args.subtype ?? creationConfig?.selectedSubtype,
  });
  if (!selection) {
    return { ok: false, error: 'PLANNER_AGENT_NOT_CONFIGURED' };
  }

  const recentMessages = await deps.prisma.plannerMessage.findMany({
    where: {
      plannerSessionId: plannerSession.id,
    },
    orderBy: { createdAt: 'desc' },
    take: 8,
  });

  const activeOutline = await deps.prisma.plannerOutlineVersion.findFirst({
    where: {
      plannerSessionId: plannerSession.id,
      isActive: true,
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      versionNumber: true,
      outlineDocJson: true,
    },
  });

  const activeRefinement = await deps.prisma.plannerRefinementVersion.findFirst({
    where: {
      plannerSessionId: plannerSession.id,
      isActive: true,
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      versionNumber: true,
      structuredDocJson: true,
    },
  });

  const targetStage: 'outline' | 'refinement' = plannerSession.outlineConfirmedAt ? 'refinement' : 'outline';
  const triggerType = targetStage === 'outline'
    ? (activeOutline ? 'update_outline' : 'generate_outline')
    : (activeRefinement ? 'follow_up' : 'generate_doc');
  const targetVideoModel = await deps.resolvePlannerTargetVideoModel({
    requestedFamilySlug: args.targetVideoModelFamilySlug,
    settingsJson: creationConfig?.settingsJson,
  });
  const outlineRefinementHints = buildPlannerOutlineRefinementHints(activeOutline?.outlineDocJson ?? null);

  const promptPackage = deps.buildPlannerGenerationPrompt({
    selection,
    targetStage,
    userPrompt: rawPrompt,
    projectTitle: episode.project.title,
    episodeTitle: episode.title,
    contentMode: episode.project.contentMode,
    scriptContent: creationConfig?.scriptContent,
    selectedSubjectName: creationConfig?.subjectProfile?.name,
    selectedStyleName: creationConfig?.stylePreset?.name,
    selectedImageModelLabel: creationConfig?.imageModelEndpoint?.label,
    targetVideoModelFamilySlug: targetVideoModel?.familySlug ?? null,
    targetVideoModelSummary: targetVideoModel?.summary ?? null,
    priorMessages: recentMessages
      .reverse()
      .map((message) => {
        const content = message.contentJson && typeof message.contentJson === 'object' && !Array.isArray(message.contentJson)
          ? (message.contentJson as Record<string, unknown>)
          : {};

        return {
          role: message.role.toLowerCase(),
          text: typeof content.text === 'string' ? content.text : JSON.stringify(content),
        };
      }),
    currentOutlineDoc: activeOutline?.outlineDocJson,
    currentStructuredDoc: activeRefinement?.structuredDocJson,
  });

  const run = await deps.prisma.$transaction(async (tx) => {
    await tx.plannerSession.update({
      where: { id: plannerSession.id },
      data: {
        status: 'UPDATING',
      },
    });

    await deps.createPlannerUserMessage({
      db: tx,
      plannerSessionId: plannerSession.id,
      userId: args.userId,
      prompt: rawPrompt,
    });

    return tx.run.create({
      data: {
        projectId: episode.project.id,
        episodeId: episode.id,
        modelFamilyId: resolvedModel.family.id,
        modelProviderId: resolvedModel.provider.id,
        modelEndpointId: resolvedModel.endpoint.id,
        runType: 'PLANNER_DOC_UPDATE',
        resourceType: 'planner_session',
        resourceId: plannerSession.id,
        status: 'QUEUED',
        executorType: 'SYSTEM_WORKER',
        idempotencyKey: args.idempotencyKey ?? null,
        inputJson: serializeRunInput({
          plannerSessionId: plannerSession.id,
          episodeId: episode.id,
          projectId: episode.project.id,
          prompt: promptPackage.promptText,
          rawPrompt,
          projectTitle: episode.project.title,
          episodeTitle: episode.title,
          contentMode: episode.project.contentMode,
          contentType: selection.contentType,
          subtype: selection.subtype,
          targetStage,
          triggerType,
          ...(activeOutline ? { sourceOutlineVersionId: activeOutline.id } : {}),
          ...(targetVideoModel ? { targetVideoModelFamilySlug: targetVideoModel.familySlug } : {}),
          outlineRefinementHints: outlineRefinementHints as unknown as Record<string, unknown> | null,
          stepDefinitions: promptPackage.stepDefinitions,
          promptSnapshot: promptPackage.promptSnapshot,
          agentProfile: selection.agentProfile,
          subAgentProfile: selection.subAgentProfile,
          contextSnapshot: {
            selectedTab: creationConfig?.selectedTab ?? selection.contentType,
            selectedSubtype: args.subtype ?? creationConfig?.selectedSubtype ?? selection.subtype,
            scriptSourceName: creationConfig?.scriptSourceName ?? null,
            hasScriptContent: Boolean(creationConfig?.scriptContent),
            selectedSubject: creationConfig?.subjectProfile,
            selectedStyle: creationConfig?.stylePreset,
            selectedImageModel: creationConfig?.imageModelEndpoint,
            selectedVideoModel: targetVideoModel
              ? {
                  familySlug: targetVideoModel.familySlug,
                  familyName: targetVideoModel.familyName,
                  capabilitySummary: targetVideoModel.summary,
                }
              : null,
            priorMessages: recentMessages.map((message) => ({
              role: message.role.toLowerCase(),
              messageType: message.messageType.toLowerCase(),
              content: message.contentJson,
              createdAt: message.createdAt.toISOString(),
            })),
            activeOutline: activeOutline
              ? {
                  id: activeOutline.id,
                  versionNumber: activeOutline.versionNumber,
                  outlineDoc: activeOutline.outlineDocJson,
                  refinementHints: outlineRefinementHints,
                }
              : null,
            activeRefinement: activeRefinement
              ? {
                  id: activeRefinement.id,
                  versionNumber: activeRefinement.versionNumber,
                  structuredDoc: activeRefinement.structuredDocJson,
                }
              : null,
          },
          modelFamily: {
            id: resolvedModel.family.id,
            slug: resolvedModel.family.slug,
            name: resolvedModel.family.name,
          },
          modelProvider: {
            id: resolvedModel.provider.id,
            code: resolvedModel.provider.code,
            name: resolvedModel.provider.name,
            providerType: resolvedModel.provider.providerType.toLowerCase(),
          },
          modelEndpoint: {
            id: resolvedModel.endpoint.id,
            slug: resolvedModel.endpoint.slug,
            label: resolvedModel.endpoint.label,
            remoteModelKey: resolvedModel.endpoint.remoteModelKey,
          },
        }),
      },
    });
  });

  return {
    ok: true,
    plannerSession: {
      id: plannerSession.id,
      status: 'updating',
    },
    targetStage,
    triggerType,
    run,
  };
}

export async function queuePlannerGenerateDocRun(
  args: QueuePlannerGenerateDocRunArgs,
): Promise<QueuePlannerGenerateDocRunResult> {
  return queuePlannerGenerateDocRunWithDeps(args, {
    findOwnedEpisode,
    resolveUserDefaultModelSelection,
    resolveModelSelection,
    findOrCreateActivePlannerSession: findOrCreateActivePlannerSessionWithDeps,
    resolvePlannerAgentSelection,
    resolvePlannerTargetVideoModel,
    resolveProviderRuntimeConfigForUser,
    buildPlannerGenerationPrompt,
    createPlannerUserMessage,
    prisma,
  });
}

export const __testables = {
  findOrCreateActivePlannerSessionWithDeps,
  queuePlannerGenerateDocRunWithDeps,
};
