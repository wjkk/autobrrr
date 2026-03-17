import { randomUUID } from 'node:crypto';

import { Prisma } from '@prisma/client';

import { resolveModelSelection } from './model-registry.js';
import { resolvePlannerAgentSelection, type ResolvedPlannerAgentSelection } from './planner-agent-registry.js';
import { parsePlannerAssistantPackage } from './planner-agent-schemas.js';
import { debugRunSchema, type PlannerDebugCompareInput, type PlannerDebugRunInput } from './planner-debug-contract.js';
import type { PlannerStructuredDoc } from './planner-doc.js';
import { buildPlannerGenerationPrompt } from './planner-orchestrator.js';
import { applyPartialRerunScope } from './planner-refinement-partial.js';
import { buildUsageSummary, deriveDiffSummary, readObject } from './planner-debug-shared.js';
import { resolvePlannerTargetVideoModel } from './planner-target-video-model.js';
import { extractPlannerText } from './planner-text-extraction.js';
import { prisma } from './prisma.js';
import { submitTextGeneration } from './provider-gateway.js';
import { resolveProviderRuntimeConfigForUser } from './provider-runtime-config.js';

function readStructuredDoc(value: unknown): PlannerStructuredDoc | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as PlannerStructuredDoc) : null;
}

async function runPlannerTextDebug(args: {
  userId: string;
  providerCode: string | null;
  baseUrl: string | null;
  apiKey: string | null;
  remoteModelKey: string;
  prompt: string;
}) {
  if (!args.providerCode || !args.baseUrl || !args.apiKey) {
    return null;
  }

  return submitTextGeneration({
    providerCode: args.providerCode,
    model: args.remoteModelKey,
    prompt: args.prompt,
    baseUrl: args.baseUrl,
    apiKey: args.apiKey,
    hookMetadata: {
      traceId: `planner-debug:${args.userId}:${args.remoteModelKey}`,
      userId: args.userId,
      resourceType: 'planner_debug',
    },
  });
}

function parseStoredDebugInput(value: unknown) {
  const parsed = debugRunSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error('Stored planner debug run input is invalid.');
  }

  return parsed.data;
}

interface PlannerDebugSelection extends ResolvedPlannerAgentSelection {
  sourceMetadata: {
    configSource: 'draft' | 'published';
    releaseVersion: number | null;
  };
}

async function resolvePlannerDebugSelection(args: {
  contentType: string;
  subtype: string;
  subAgentId?: string;
  configSource: 'draft' | 'published';
}): Promise<PlannerDebugSelection | null> {
  if (args.configSource === 'draft') {
    if (!args.subAgentId) {
      const selection = await resolvePlannerAgentSelection({
        contentType: args.contentType,
        subtype: args.subtype,
      });
      if (!selection) {
        return null;
      }

      return {
        ...selection,
        sourceMetadata: {
          configSource: 'draft',
          releaseVersion: null,
        },
      };
    }

    const subAgent = await prisma.plannerSubAgentProfile.findUnique({
      where: { id: args.subAgentId },
      include: {
        agentProfile: true,
      },
    });
    if (!subAgent || !subAgent.agentProfile) {
      return null;
    }

    return {
      contentType: subAgent.agentProfile.contentType,
      subtype: subAgent.subtype,
      agentProfile: {
        id: subAgent.agentProfile.id,
        slug: subAgent.agentProfile.slug,
        displayName: subAgent.agentProfile.displayName,
        defaultSystemPrompt: subAgent.agentProfile.defaultSystemPrompt,
        defaultDeveloperPrompt: subAgent.agentProfile.defaultDeveloperPrompt,
        defaultStepDefinitionsJson: subAgent.agentProfile.defaultStepDefinitionsJson,
      },
      subAgentProfile: {
        id: subAgent.id,
        slug: subAgent.slug,
        displayName: subAgent.displayName,
        systemPromptOverride: subAgent.systemPromptOverride,
        developerPromptOverride: subAgent.developerPromptOverride,
        stepDefinitionsJson: subAgent.stepDefinitionsJson,
      },
      sourceMetadata: {
        configSource: 'draft' as const,
        releaseVersion: null,
      },
    };
  }

  const draftSelection: PlannerDebugSelection | ResolvedPlannerAgentSelection | null = args.subAgentId
    ? await resolvePlannerDebugSelection({
        contentType: args.contentType,
        subtype: args.subtype,
        subAgentId: args.subAgentId,
        configSource: 'draft',
      })
    : await resolvePlannerAgentSelection({
        contentType: args.contentType,
        subtype: args.subtype,
      });

  if (!draftSelection) {
    return null;
  }

  const latestRelease = await prisma.plannerSubAgentProfileRelease.findFirst({
    where: {
      subAgentProfileId: draftSelection.subAgentProfile.id,
    },
    orderBy: [{ releaseVersion: 'desc' }],
  });

  if (!latestRelease) {
    throw new Error('当前子 agent 还没有已发布快照，无法使用“已发布配置试跑”。');
  }

  return {
    contentType: draftSelection.contentType,
    subtype: draftSelection.subtype,
    agentProfile: draftSelection.agentProfile,
    subAgentProfile: {
      id: draftSelection.subAgentProfile.id,
      slug: draftSelection.subAgentProfile.slug,
      displayName: latestRelease.displayName,
      systemPromptOverride: latestRelease.systemPromptOverride,
      developerPromptOverride: latestRelease.developerPromptOverride,
      stepDefinitionsJson: latestRelease.stepDefinitionsJson,
    },
    sourceMetadata: {
      configSource: 'published' as const,
      releaseVersion: latestRelease.releaseVersion,
    },
  };
}

export async function executePlannerDebugRun(args: PlannerDebugRunInput & {
  userId: string;
  compareGroupKey?: string;
  compareLabel?: string;
  replaySourceRunId?: string;
}) {
  const selection = await resolvePlannerDebugSelection({
    contentType: args.contentType,
    subtype: args.subtype,
    subAgentId: args.subAgentId,
    configSource: args.configSource,
  });
  if (!selection) {
    throw new Error('No active planner sub-agent matched the requested content type and subtype.');
  }

  const resolvedModel = await resolveModelSelection({
    modelKind: 'TEXT',
    familySlug: args.modelFamily,
    endpointSlug: args.modelEndpoint,
    strategy: 'default',
  });
  if (!resolvedModel) {
    throw new Error('No active text model endpoint matched the selection.');
  }

  const promptPackage = buildPlannerGenerationPrompt({
    ...(await resolvePlannerTargetVideoModel({
      requestedFamilySlug: args.targetVideoModelFamilySlug,
    }).then((targetVideoModel) => ({
      targetVideoModelFamilySlug: targetVideoModel?.familySlug ?? null,
      targetVideoModelSummary: targetVideoModel?.summary ?? null,
    }))),
    selection,
    targetStage: args.targetStage,
    userPrompt: args.userPrompt,
    projectTitle: args.projectTitle,
    episodeTitle: args.episodeTitle,
    scriptContent: args.scriptContent,
    selectedSubjectName: args.selectedSubjectName,
    selectedStyleName: args.selectedStyleName,
    selectedImageModelLabel: args.selectedImageModelLabel,
    priorMessages: args.priorMessages ?? [],
    currentOutlineDoc: args.currentOutlineDoc,
    currentStructuredDoc: args.currentStructuredDoc,
  });

  const runtimeConfig = await resolveProviderRuntimeConfigForUser({
    userId: args.userId,
    providerId: resolvedModel.provider.id,
    fallbackCode: resolvedModel.provider.code,
    fallbackBaseUrl: resolvedModel.provider.baseUrl,
  });

  let providerOutput: Record<string, unknown> | null = null;
  let rawText: string | null = null;
  let errorMessage: string | null = null;
  let executionMode: 'live' | 'fallback' = 'fallback';

  try {
    providerOutput = await runPlannerTextDebug({
      userId: args.userId,
      providerCode: runtimeConfig.providerCode,
      baseUrl: runtimeConfig.baseUrl,
      apiKey: runtimeConfig.apiKey,
      remoteModelKey: resolvedModel.endpoint.remoteModelKey,
      prompt: promptPackage.promptText,
    });
    if (providerOutput) {
      rawText = extractPlannerText(providerOutput, args.userPrompt);
      executionMode = 'live';
    }
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : '调试调用失败，已回退到本地解析结果。';
    rawText = errorMessage;
  }

  const parsedAssistantPackage = parsePlannerAssistantPackage({
    targetStage: args.targetStage,
    rawText: rawText ?? '',
    userPrompt: args.userPrompt,
    projectTitle: args.projectTitle,
    episodeTitle: args.episodeTitle,
    defaultSteps: promptPackage.stepDefinitions,
    contentType: selection.contentType,
    subtype: selection.subtype,
  });
  const assistantPackage =
    args.targetStage === 'refinement' &&
    args.partialRerunScope &&
    args.partialRerunScope !== 'none' &&
    parsedAssistantPackage.stage === 'refinement'
      ? {
          ...parsedAssistantPackage,
          structuredDoc: applyPartialRerunScope({
            previousDoc: readStructuredDoc(args.currentStructuredDoc),
            nextDoc: parsedAssistantPackage.structuredDoc,
            input: {
              scope: args.partialRerunScope,
              targetEntity: args.targetEntity ?? {},
            },
          }),
        }
      : parsedAssistantPackage;

  const debugRun = await prisma.plannerDebugRun.create({
    data: {
      userId: args.userId,
      agentProfileId: selection.agentProfile.id,
      subAgentProfileId: selection.subAgentProfile.id,
      compareGroupKey: args.compareGroupKey ?? null,
      compareLabel: args.compareLabel ?? null,
      executionMode: executionMode.toUpperCase(),
      modelSnapshotJson: {
        family: {
          id: resolvedModel.family.id,
          slug: resolvedModel.family.slug,
          name: resolvedModel.family.name,
        },
        provider: {
          id: resolvedModel.provider.id,
          code: resolvedModel.provider.code,
          name: resolvedModel.provider.name,
        },
        endpoint: {
          id: resolvedModel.endpoint.id,
          slug: resolvedModel.endpoint.slug,
          label: resolvedModel.endpoint.label,
          remoteModelKey: resolvedModel.endpoint.remoteModelKey,
          costConfig: resolvedModel.endpoint.costConfigJson ?? null,
        },
      },
      inputJson: {
        contentType: args.contentType,
        subtype: args.subtype,
        subAgentId: args.subAgentId ?? null,
        configSource: args.configSource,
        targetStage: args.targetStage,
        partialRerunScope: args.partialRerunScope ?? 'none',
        projectTitle: args.projectTitle,
        episodeTitle: args.episodeTitle,
        userPrompt: args.userPrompt,
        scriptContent: args.scriptContent ?? null,
        selectedSubjectName: args.selectedSubjectName ?? null,
        selectedStyleName: args.selectedStyleName ?? null,
        selectedImageModelLabel: args.selectedImageModelLabel ?? null,
        priorMessages: args.priorMessages ?? [],
        currentOutlineDoc: args.currentOutlineDoc ?? null,
        currentStructuredDoc: args.currentStructuredDoc ?? null,
        targetEntity: args.targetEntity ?? null,
        plannerAssets: args.plannerAssets ?? [],
        replaySourceRunId: args.replaySourceRunId ?? null,
        promptSnapshot: promptPackage.promptSnapshot,
      } as Prisma.InputJsonValue,
      finalPrompt: promptPackage.promptText,
      rawText,
      providerOutputJson: (providerOutput ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      assistantPackageJson: assistantPackage as Prisma.InputJsonValue,
      errorMessage,
    },
    select: {
      id: true,
      createdAt: true,
    },
  });

  return {
    debugRunId: debugRun.id,
    createdAt: debugRun.createdAt.toISOString(),
    executionMode,
    configSource: selection.sourceMetadata.configSource,
    releaseVersion: selection.sourceMetadata.releaseVersion,
    replaySourceRunId: args.replaySourceRunId ?? null,
    errorMessage,
    agentProfile: {
      id: selection.agentProfile.id,
      slug: selection.agentProfile.slug,
      displayName: selection.agentProfile.displayName,
    },
    subAgentProfile: {
      id: selection.subAgentProfile.id,
      slug: selection.subAgentProfile.slug,
      subtype: selection.subtype,
      displayName: selection.subAgentProfile.displayName,
    },
    model: {
      family: {
        id: resolvedModel.family.id,
        slug: resolvedModel.family.slug,
        name: resolvedModel.family.name,
      },
      provider: {
        id: resolvedModel.provider.id,
        code: resolvedModel.provider.code,
        name: resolvedModel.provider.name,
      },
      endpoint: {
        id: resolvedModel.endpoint.id,
        slug: resolvedModel.endpoint.slug,
        label: resolvedModel.endpoint.label,
        remoteModelKey: resolvedModel.endpoint.remoteModelKey,
        costConfig: resolvedModel.endpoint.costConfigJson ?? null,
      },
    },
    finalPrompt: promptPackage.promptText,
    promptSnapshot: promptPackage.promptSnapshot,
    rawText,
    providerOutput,
    assistantPackage,
    input: {
      contentType: args.contentType,
      subtype: args.subtype,
      targetStage: args.targetStage,
      partialRerunScope: args.partialRerunScope ?? 'none',
      projectTitle: args.projectTitle,
      episodeTitle: args.episodeTitle,
      userPrompt: args.userPrompt,
      scriptContent: args.scriptContent ?? null,
      selectedSubjectName: args.selectedSubjectName ?? null,
      selectedStyleName: args.selectedStyleName ?? null,
      selectedImageModelLabel: args.selectedImageModelLabel ?? null,
      priorMessages: args.priorMessages ?? [],
      currentOutlineDoc: args.currentOutlineDoc ?? null,
      currentStructuredDoc: args.currentStructuredDoc ?? null,
      targetEntity: args.targetEntity ?? null,
      plannerAssets: args.plannerAssets ?? [],
    },
    usage: buildUsageSummary({
      providerOutput,
      prompt: promptPackage.promptText,
      rawText,
      modelSnapshot: {
        endpoint: {
          costConfig: resolvedModel.endpoint.costConfigJson ?? null,
        },
      },
    }),
    diffSummary: deriveDiffSummary({
      targetStage: args.targetStage,
      partialRerunScope: args.partialRerunScope,
      currentStructuredDoc: readObject(args.currentStructuredDoc) as Record<string, unknown> | undefined,
      targetEntity: readObject(args.targetEntity) as Record<string, unknown> | undefined,
      assistantPackage: assistantPackage as Record<string, unknown>,
    }),
  };
}

export async function replayPlannerDebugRun(userId: string, runId: string) {
  const run = await prisma.plannerDebugRun.findFirst({
    where: {
      id: runId,
      userId,
    },
    select: {
      id: true,
      inputJson: true,
    },
  });

  if (!run) {
    return null;
  }

  const input = parseStoredDebugInput(run.inputJson);
  return executePlannerDebugRun({
    userId,
    ...input,
    replaySourceRunId: run.id,
  });
}

export async function comparePlannerDebugRuns(userId: string, payload: PlannerDebugCompareInput) {
  const [leftSubAgent, rightSubAgent] = await Promise.all([
    prisma.plannerSubAgentProfile.findUnique({
      where: { id: payload.leftSubAgentId },
      include: { agentProfile: true },
    }),
    prisma.plannerSubAgentProfile.findUnique({
      where: { id: payload.rightSubAgentId },
      include: { agentProfile: true },
    }),
  ]);

  if (!leftSubAgent || !rightSubAgent) {
    return null;
  }

  const compareGroupKey = randomUUID();

  const [leftResult, rightResult] = await Promise.all([
    executePlannerDebugRun({
      userId,
      contentType: leftSubAgent.agentProfile.contentType,
      subtype: leftSubAgent.subtype,
      subAgentId: leftSubAgent.id,
      configSource: payload.configSource,
      targetStage: payload.targetStage,
      projectTitle: payload.projectTitle,
      episodeTitle: payload.episodeTitle,
      userPrompt: payload.userPrompt,
      scriptContent: payload.scriptContent,
      selectedSubjectName: payload.selectedSubjectName,
      selectedStyleName: payload.selectedStyleName,
      selectedImageModelLabel: payload.selectedImageModelLabel,
      targetVideoModelFamilySlug: payload.targetVideoModelFamilySlug,
      priorMessages: payload.priorMessages,
      currentOutlineDoc: payload.currentOutlineDoc,
      currentStructuredDoc: payload.currentStructuredDoc,
      partialRerunScope: payload.partialRerunScope,
      targetEntity: payload.targetEntity,
      plannerAssets: payload.plannerAssets,
      modelFamily: payload.modelFamily,
      modelEndpoint: payload.modelEndpoint,
      compareGroupKey,
      compareLabel: 'A',
    }),
    executePlannerDebugRun({
      userId,
      contentType: rightSubAgent.agentProfile.contentType,
      subtype: rightSubAgent.subtype,
      subAgentId: rightSubAgent.id,
      configSource: payload.configSource,
      targetStage: payload.targetStage,
      projectTitle: payload.projectTitle,
      episodeTitle: payload.episodeTitle,
      userPrompt: payload.userPrompt,
      scriptContent: payload.scriptContent,
      selectedSubjectName: payload.selectedSubjectName,
      selectedStyleName: payload.selectedStyleName,
      selectedImageModelLabel: payload.selectedImageModelLabel,
      targetVideoModelFamilySlug: payload.targetVideoModelFamilySlug,
      priorMessages: payload.priorMessages,
      currentOutlineDoc: payload.currentOutlineDoc,
      currentStructuredDoc: payload.currentStructuredDoc,
      partialRerunScope: payload.partialRerunScope,
      targetEntity: payload.targetEntity,
      plannerAssets: payload.plannerAssets,
      modelFamily: payload.modelFamily,
      modelEndpoint: payload.modelEndpoint,
      compareGroupKey,
      compareLabel: 'B',
    }),
  ]);

  return {
    compareGroupKey,
    left: leftResult,
    right: rightResult,
  };
}

export function toPrismaJsonInput(value: Prisma.JsonValue | null | undefined) {
  if (value === null || value === undefined) {
    return undefined;
  }

  return value as Prisma.InputJsonValue;
}
