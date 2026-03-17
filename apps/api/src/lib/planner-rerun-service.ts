import type { Run } from '@prisma/client';

import { resolveModelSelection } from './model-registry.js';
import { resolvePlannerAgentSelection } from './planner-agent-registry.js';
import { buildPlannerGenerationPrompt, createPlannerUserMessage } from './planner-orchestrator.js';
import { getPlannerRerunScopeTriggerType, getPlannerRerunScopeUserLabel, type PlannerRerunScope } from './planner-rerun-scope.js';
import { prisma } from './prisma.js';
import { serializeRunInput } from './run-input.js';
import { resolvePlannerTargetVideoModel } from './planner-target-video-model.js';
import { resolveUserDefaultModelSelection } from './user-model-defaults.js';

interface QueuePlannerPartialRerunArgs {
  projectId: string;
  episodeId: string;
  userId: string;
  rerunScope: PlannerRerunScope;
  prompt?: string;
  modelFamily?: string;
  modelEndpoint?: string;
  targetVideoModelFamilySlug?: string;
  idempotencyKey?: string;
}

type QueuePlannerPartialRerunError =
  | 'NOT_FOUND'
  | 'REFINEMENT_REQUIRED'
  | 'REFINEMENT_LOCKED'
  | 'SCOPE_TARGET_NOT_FOUND'
  | 'MODEL_NOT_FOUND'
  | 'PLANNER_AGENT_NOT_CONFIGURED';

export type QueuePlannerPartialRerunResult =
  | {
      ok: true;
      plannerSession: {
        id: string;
        status: 'updating';
      };
      triggerType: string;
      run: Run;
    }
  | {
      ok: false;
      error: QueuePlannerPartialRerunError;
    };

type PlannerPartialRerunSession = Awaited<ReturnType<typeof findOwnedPlannerSession>>;
type PlannerPartialRerunTarget =
  | Record<string, unknown>
  | Array<Record<string, unknown>>;

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function buildScopeInstruction(args: {
  scope: PlannerRerunScope;
  targetEntity: PlannerPartialRerunTarget;
  prompt: string | undefined;
}) {
  const customPrompt = args.prompt?.trim();

  if (args.scope.type === 'subject') {
    return [
      '你只允许调整一个主体设定，并同步更新与该主体强相关的分镜表述。',
      '不要重写整个故事主题，不要扩张场景数量。',
      `当前目标主体：${JSON.stringify(args.targetEntity)}`,
      customPrompt ? `用户补充要求：${customPrompt}` : '请根据当前主体设定自动优化角色形象、主体列表、以及关联镜头中的主体描写。',
    ].join('\n');
  }

  if (args.scope.type === 'scene') {
    return [
      '你只允许调整一个场景设定，并同步更新与该场景强相关的分镜表述。',
      '不要改动主体关系和故事主线。',
      `当前目标场景：${JSON.stringify(args.targetEntity)}`,
      customPrompt ? `用户补充要求：${customPrompt}` : '请根据当前场景设定自动优化场景列表、环境描述、以及关联镜头中的空间表述。',
    ].join('\n');
  }

  if (args.scope.type === 'act') {
    return [
      '你只允许调整一个幕内的分镜与节奏安排，输出完整的 refinement 文档，但不要改动其他幕的核心内容。',
      '不要重写全部故事主题，不要改动无关主体和无关场景。',
      `当前目标幕：${JSON.stringify(args.targetEntity)}`,
      customPrompt ? `用户补充要求：${customPrompt}` : '请围绕当前幕的节奏、镜头组织和情绪推进做局部优化。',
    ].join('\n');
  }

  return [
    Array.isArray(args.targetEntity) && args.targetEntity.length > 1
      ? '你只允许调整一组指定分镜，输出完整的 refinement 文档，但仅局部修改这些分镜及其必要的上下文描述。'
      : '你只允许调整一个分镜脚本，输出完整的 refinement 文档，但仅局部修改该分镜及其必要的上下文描述。',
    '不要改动无关主体和场景设定。',
    `当前目标分镜：${JSON.stringify(args.targetEntity)}`,
    customPrompt ? `用户补充要求：${customPrompt}` : '请根据当前分镜内容自动优化画面描述、构图、运镜和台词。',
  ].join('\n');
}

async function findOwnedPlannerSession(projectId: string, episodeId: string, userId: string) {
  return prisma.plannerSession.findFirst({
    where: {
      projectId,
      episodeId,
      isActive: true,
      project: {
        createdById: userId,
      },
    },
    include: {
      project: {
        select: {
          id: true,
          title: true,
          contentMode: true,
          creationConfig: {
            include: {
              subjectProfile: {
                select: { id: true, name: true, slug: true },
              },
              stylePreset: {
                select: { id: true, name: true, slug: true },
              },
              imageModelEndpoint: {
                select: { id: true, slug: true, label: true },
              },
            },
          },
        },
      },
      episode: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });
}

async function findActiveRefinement(plannerSessionId: string) {
  return prisma.plannerRefinementVersion.findFirst({
    where: {
      plannerSessionId,
      isActive: true,
    },
    select: {
      id: true,
      structuredDocJson: true,
      isConfirmed: true,
    },
  });
}

async function findTargetEntity(args: {
  refinementVersionId: string;
  rerunScope: PlannerRerunScope;
}, deps: {
  prisma: Pick<typeof prisma, 'plannerSubject' | 'plannerScene' | 'plannerShotScript'>;
}) {
  const [targetSubject, targetScene, targetShots, targetActShots] = await Promise.all([
    args.rerunScope.type === 'subject'
      ? deps.prisma.plannerSubject.findFirst({
          where: {
            id: args.rerunScope.subjectId,
            refinementVersionId: args.refinementVersionId,
          },
        })
      : Promise.resolve(null),
    args.rerunScope.type === 'scene'
      ? deps.prisma.plannerScene.findFirst({
          where: {
            id: args.rerunScope.sceneId,
            refinementVersionId: args.refinementVersionId,
          },
        })
      : Promise.resolve(null),
    args.rerunScope.type === 'shot'
      ? deps.prisma.plannerShotScript.findMany({
          where: {
            id: { in: args.rerunScope.shotIds },
            refinementVersionId: args.refinementVersionId,
          },
          orderBy: { sortOrder: 'asc' },
        })
      : Promise.resolve([]),
    args.rerunScope.type === 'act'
      ? deps.prisma.plannerShotScript.findMany({
          where: {
            actKey: args.rerunScope.actId,
            refinementVersionId: args.refinementVersionId,
          },
          orderBy: { sortOrder: 'asc' },
        })
      : Promise.resolve([]),
  ]);

  const targetEntity =
    targetSubject
    ?? targetScene
    ?? (args.rerunScope.type === 'act'
      ? {
          actKey: args.rerunScope.actId,
          shots: targetActShots,
        }
      : targetShots);

  const isMissing =
    !targetEntity
    || (Array.isArray(targetEntity) && targetEntity.length === 0)
    || (args.rerunScope.type === 'act' && targetActShots.length === 0);

  if (isMissing) {
    return null;
  }

  return cloneJson(targetEntity) as PlannerPartialRerunTarget;
}

async function buildActiveOutlineSnapshot(plannerSessionId: string, outlineConfirmedAt: Date | null) {
  if (!outlineConfirmedAt) {
    return null;
  }

  const outline = await prisma.plannerOutlineVersion.findFirst({
    where: {
      plannerSessionId,
      isActive: true,
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      versionNumber: true,
      outlineDocJson: true,
    },
  });

  if (!outline) {
    return null;
  }

  return {
    id: outline.id,
    versionNumber: outline.versionNumber,
    outlineDoc: outline.outlineDocJson,
  };
}

export async function queuePlannerPartialRerun(
  args: QueuePlannerPartialRerunArgs,
): Promise<QueuePlannerPartialRerunResult> {
  const plannerSession = await findOwnedPlannerSession(args.projectId, args.episodeId, args.userId);
  if (!plannerSession) {
    return { ok: false, error: 'NOT_FOUND' };
  }

  const activeRefinement = await findActiveRefinement(plannerSession.id);
  if (!activeRefinement?.structuredDocJson) {
    return { ok: false, error: 'REFINEMENT_REQUIRED' };
  }

  if (activeRefinement.isConfirmed) {
    return { ok: false, error: 'REFINEMENT_LOCKED' };
  }

  const [targetEntity, recentMessages] = await Promise.all([
    findTargetEntity({
      refinementVersionId: activeRefinement.id,
      rerunScope: args.rerunScope,
    }, { prisma }),
    prisma.plannerMessage.findMany({
      where: {
        plannerSessionId: plannerSession.id,
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
  ]);

  if (!targetEntity) {
    return { ok: false, error: 'SCOPE_TARGET_NOT_FOUND' };
  }

  const userDefaultModel = !args.modelFamily && !args.modelEndpoint
    ? await resolveUserDefaultModelSelection(args.userId, 'TEXT')
    : null;

  const resolvedModel = await resolveModelSelection({
    modelKind: 'TEXT',
    familySlug: args.modelFamily ?? userDefaultModel?.familySlug,
    endpointSlug: args.modelEndpoint ?? userDefaultModel?.endpointSlug,
    strategy: 'default',
  });
  if (!resolvedModel) {
    return { ok: false, error: 'MODEL_NOT_FOUND' };
  }

  const selection = await resolvePlannerAgentSelection({
    contentType: plannerSession.project.creationConfig?.selectedTab ?? '短剧漫剧',
    subtype: plannerSession.project.creationConfig?.selectedSubtype ?? undefined,
  });
  if (!selection) {
    return { ok: false, error: 'PLANNER_AGENT_NOT_CONFIGURED' };
  }

  const targetVideoModel = await resolvePlannerTargetVideoModel({
    requestedFamilySlug: args.targetVideoModelFamilySlug,
    settingsJson: plannerSession.project.creationConfig?.settingsJson,
  });

  const promptPackage = buildPlannerGenerationPrompt({
    selection,
    targetStage: 'refinement',
    userPrompt: buildScopeInstruction({
      scope: args.rerunScope,
      targetEntity,
      prompt: args.prompt,
    }),
    projectTitle: plannerSession.project.title,
    episodeTitle: plannerSession.episode.title,
    contentMode: plannerSession.project.contentMode,
    scriptContent: plannerSession.project.creationConfig?.scriptContent ?? null,
    selectedSubjectName: plannerSession.project.creationConfig?.subjectProfile?.name ?? null,
    selectedStyleName: plannerSession.project.creationConfig?.stylePreset?.name ?? null,
    selectedImageModelLabel: plannerSession.project.creationConfig?.imageModelEndpoint?.label ?? null,
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
    currentStructuredDoc: activeRefinement.structuredDocJson,
  });

  const triggerType = getPlannerRerunScopeTriggerType(args.rerunScope);
  const rawPrompt = args.prompt?.trim() || getPlannerRerunScopeUserLabel(args.rerunScope);

  const run = await prisma.$transaction(async (tx) => {
    await tx.plannerSession.update({
      where: { id: plannerSession.id },
      data: {
        status: 'UPDATING',
      },
    });

    await createPlannerUserMessage({
      db: tx,
      plannerSessionId: plannerSession.id,
      userId: args.userId,
      prompt: rawPrompt,
    });

    const activeOutline = await buildActiveOutlineSnapshot(plannerSession.id, plannerSession.outlineConfirmedAt);

    return tx.run.create({
      data: {
        projectId: plannerSession.project.id,
        episodeId: plannerSession.episode.id,
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
          episodeId: plannerSession.episode.id,
          projectId: plannerSession.project.id,
          prompt: promptPackage.promptText,
          rawPrompt,
          projectTitle: plannerSession.project.title,
          episodeTitle: plannerSession.episode.title,
          contentMode: plannerSession.project.contentMode,
          contentType: selection.contentType,
          subtype: selection.subtype,
          targetStage: 'refinement',
          triggerType,
          ...(targetVideoModel ? { targetVideoModelFamilySlug: targetVideoModel.familySlug } : {}),
          scope: triggerType,
          targetEntityId:
            args.rerunScope.type === 'subject'
              ? args.rerunScope.subjectId
              : args.rerunScope.type === 'scene'
                ? args.rerunScope.sceneId
                : args.rerunScope.type === 'shot'
                  ? args.rerunScope.shotIds[0]
                  : args.rerunScope.actId,
          rerunScope: args.rerunScope,
          targetEntity,
          stepDefinitions: promptPackage.stepDefinitions,
          promptSnapshot: promptPackage.promptSnapshot,
          agentProfile: selection.agentProfile,
          subAgentProfile: selection.subAgentProfile,
          contextSnapshot: {
            selectedTab: plannerSession.project.creationConfig?.selectedTab ?? selection.contentType,
            selectedSubtype: plannerSession.project.creationConfig?.selectedSubtype ?? selection.subtype,
            selectedSubject: plannerSession.project.creationConfig?.subjectProfile,
            selectedStyle: plannerSession.project.creationConfig?.stylePreset,
            selectedImageModel: plannerSession.project.creationConfig?.imageModelEndpoint,
            selectedVideoModel: targetVideoModel
              ? {
                  familySlug: targetVideoModel.familySlug,
                  familyName: targetVideoModel.familyName,
                  capabilitySummary: targetVideoModel.summary,
                }
              : null,
            activeOutline,
            activeRefinement: {
              id: activeRefinement.id,
              structuredDoc: activeRefinement.structuredDocJson,
            },
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
    triggerType,
    run,
  };
}

export const __testables = {
  cloneJson,
  buildScopeInstruction,
  findTargetEntity,
};
