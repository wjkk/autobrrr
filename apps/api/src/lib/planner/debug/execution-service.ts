import { randomUUID } from 'node:crypto';

import { Prisma } from '@prisma/client';

import { resolveModelSelection } from '../../model-registry.js';
import { inspectPlannerAssistantPackage } from '../agent/schemas.js';
import { debugRunSchema, type PlannerDebugCompareInput, type PlannerDebugRunInput } from './contract.js';
import { buildPlannerGenerationPrompt, type PlannerPromptSnapshot } from '../orchestration/orchestrator.js';
import { buildUsageSummary, deriveDiffSummary, readObject, readTargetEntityId } from './shared.js';
import { prisma } from '../../prisma.js';
import { submitTextGeneration } from '../../provider-gateway.js';
import { resolveProviderRuntimeConfigForUser } from '../../provider-runtime-config.js';
import type { PlannerStructuredDoc } from '../doc/planner-doc.js';
import { buildPlannerOutlineRefinementHints } from '../doc/outline-doc.js';
import { applyPartialRerunScope } from '../refinement/partial.js';
import { buildPlannerRerunPromptContext } from '../rerun/context.js';
import { parseStoredPlannerRerunScope } from '../rerun/scope.js';
import { resolvePlannerTargetVideoModel } from '../target-video-model.js';
import { extractPlannerText } from '../text-extraction.js';
import {
  buildPlannerDebugModelSelectionSnapshot,
  defaultPlannerDebugSelectionDeps,
  resolvePlannerDebugSelection,
  resolvePlannerDebugSelectionWithDeps,
} from './selection-service.js';

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

interface PlannerDebugDeps {
  prisma: typeof prisma;
}

const defaultPlannerDebugDeps: PlannerDebugDeps = {
  prisma,
};

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

  const targetVideoModel = await resolvePlannerTargetVideoModel({
    requestedFamilySlug: args.targetVideoModelFamilySlug,
  });
  const outlineRefinementHints = buildPlannerOutlineRefinementHints(args.currentOutlineDoc ?? null);
  const rerunScope = parseStoredPlannerRerunScope({
    scope: args.partialRerunScope,
    targetEntityId: readTargetEntityId(args.targetEntity),
  });
  const rerunContext =
    args.targetStage === 'refinement' && rerunScope && args.targetEntity
      ? buildPlannerRerunPromptContext({
          scope: rerunScope,
          targetEntity: args.targetEntity,
          structuredDoc: args.currentStructuredDoc ?? null,
        })
      : null;
  const modelSelectionSnapshot = buildPlannerDebugModelSelectionSnapshot({
    requestedModelFamilySlug: args.modelFamily,
    requestedModelEndpointSlug: args.modelEndpoint,
    resolvedModel,
    targetVideoModel,
  });

  const promptPackage = buildPlannerGenerationPrompt({
    targetVideoModelFamilySlug: targetVideoModel?.familySlug ?? null,
    targetVideoModelSummary: targetVideoModel?.summary ?? null,
    modelSelectionSnapshot,
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
    rerunContext,
  });
  const promptSnapshot: PlannerPromptSnapshot = {
    ...promptPackage.promptSnapshot,
    modelSelectionSnapshot,
  };
  const promptSnapshotJson = promptSnapshot as unknown as Prisma.InputJsonValue;

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

  const assistantPackageInspection = inspectPlannerAssistantPackage({
    targetStage: args.targetStage,
    rawText: rawText ?? '',
    userPrompt: args.userPrompt,
    projectTitle: args.projectTitle,
    episodeTitle: args.episodeTitle,
    defaultSteps: promptPackage.stepDefinitions,
    contentType: selection.contentType,
    subtype: selection.subtype,
  });
  const parsedAssistantPackage = assistantPackageInspection.assistantPackage;
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
              targetEntityId: readTargetEntityId(args.targetEntity),
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
        projectId: args.projectId ?? null,
        episodeId: args.episodeId ?? null,
        projectTitle: args.projectTitle,
        episodeTitle: args.episodeTitle,
        userPrompt: args.userPrompt,
        scriptContent: args.scriptContent ?? null,
        selectedSubjectName: args.selectedSubjectName ?? null,
        selectedStyleName: args.selectedStyleName ?? null,
        selectedImageModelLabel: args.selectedImageModelLabel ?? null,
        priorMessages: args.priorMessages ?? [],
        currentOutlineDoc: args.currentOutlineDoc ?? null,
        outlineRefinementHints,
        currentStructuredDoc: args.currentStructuredDoc ?? null,
        targetEntity: args.targetEntity ?? null,
        rerunContext,
        plannerAssets: args.plannerAssets ?? [],
        replaySourceRunId: args.replaySourceRunId ?? null,
        promptSnapshot: promptSnapshotJson,
        assistantPackageInspection: {
          rawCandidate: assistantPackageInspection.rawCandidate,
          normalizedCandidate: assistantPackageInspection.normalizedCandidate,
        },
      } as unknown as Prisma.InputJsonValue,
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
    promptSnapshot,
    rawText,
    providerOutput,
    assistantPackage,
    input: {
      contentType: args.contentType,
      subtype: args.subtype,
      targetStage: args.targetStage,
      partialRerunScope: args.partialRerunScope ?? 'none',
      projectId: args.projectId ?? null,
      episodeId: args.episodeId ?? null,
      projectTitle: args.projectTitle,
      episodeTitle: args.episodeTitle,
      userPrompt: args.userPrompt,
      scriptContent: args.scriptContent ?? null,
      selectedSubjectName: args.selectedSubjectName ?? null,
      selectedStyleName: args.selectedStyleName ?? null,
      selectedImageModelLabel: args.selectedImageModelLabel ?? null,
      priorMessages: args.priorMessages ?? [],
      currentOutlineDoc: args.currentOutlineDoc ?? null,
      outlineRefinementHints,
      currentStructuredDoc: args.currentStructuredDoc ?? null,
      targetEntity: args.targetEntity ?? null,
      rerunContext,
      plannerAssets: args.plannerAssets ?? [],
      assistantPackageInspection: {
        rawCandidate: assistantPackageInspection.rawCandidate,
        normalizedCandidate: assistantPackageInspection.normalizedCandidate,
      },
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

async function replayPlannerDebugRunWithDeps(
  userId: string,
  runId: string,
  deps: Pick<PlannerDebugDeps, 'prisma'> & {
    executePlannerDebugRun: typeof executePlannerDebugRun;
  },
) {
  const run = await deps.prisma.plannerDebugRun.findFirst({
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
  return deps.executePlannerDebugRun({
    userId,
    ...input,
    replaySourceRunId: run.id,
  });
}

export async function replayPlannerDebugRun(userId: string, runId: string) {
  return replayPlannerDebugRunWithDeps(userId, runId, {
    prisma,
    executePlannerDebugRun,
  });
}

async function comparePlannerDebugRunsWithDeps(
  userId: string,
  payload: PlannerDebugCompareInput,
  deps: Pick<PlannerDebugDeps, 'prisma'> & {
    executePlannerDebugRun: typeof executePlannerDebugRun;
  },
) {
  const [leftSubAgent, rightSubAgent] = await Promise.all([
    deps.prisma.plannerSubAgentProfile.findUnique({
      where: { id: payload.leftSubAgentId },
      include: { agentProfile: true },
    }),
    deps.prisma.plannerSubAgentProfile.findUnique({
      where: { id: payload.rightSubAgentId },
      include: { agentProfile: true },
    }),
  ]);

  if (!leftSubAgent || !rightSubAgent) {
    return null;
  }

  const compareGroupKey = randomUUID();

  const [leftResult, rightResult] = await Promise.all([
    deps.executePlannerDebugRun({
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
    deps.executePlannerDebugRun({
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

export async function comparePlannerDebugRuns(userId: string, payload: PlannerDebugCompareInput) {
  return comparePlannerDebugRunsWithDeps(userId, payload, {
    prisma,
    executePlannerDebugRun,
  });
}

export function toPrismaJsonInput(value: Prisma.JsonValue | null | undefined) {
  if (value === null || value === undefined) {
    return undefined;
  }

  return value as Prisma.InputJsonValue;
}

export const __testables = {
  parseStoredDebugInput,
  resolvePlannerDebugSelectionWithDeps: (args: Parameters<typeof resolvePlannerDebugSelectionWithDeps>[0], deps: Parameters<typeof resolvePlannerDebugSelectionWithDeps>[1]) =>
    resolvePlannerDebugSelectionWithDeps(args, {
      ...defaultPlannerDebugSelectionDeps,
      ...deps,
    }),
  replayPlannerDebugRunWithDeps,
  comparePlannerDebugRunsWithDeps,
};
