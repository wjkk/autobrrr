import { prisma } from './prisma.js';
import { buildUsageSummary, deriveDiffSummary, readObject, readPromptSnapshot, readString } from './planner-debug-shared.js';

export async function listPlannerDebugRuns(userId: string, query: {
  limit: number;
  subAgentSlug?: string;
  compareGroupKey?: string;
}) {
  const runs = await prisma.plannerDebugRun.findMany({
    where: {
      userId,
      ...(query.compareGroupKey ? { compareGroupKey: query.compareGroupKey } : {}),
      ...(query.subAgentSlug
        ? {
            subAgentProfile: {
              slug: query.subAgentSlug,
            },
          }
        : {}),
    },
    take: query.limit,
    orderBy: { createdAt: 'desc' },
    include: {
      agentProfile: {
        select: {
          id: true,
          slug: true,
          displayName: true,
        },
      },
      subAgentProfile: {
        select: {
          id: true,
          slug: true,
          subtype: true,
          displayName: true,
        },
      },
    },
  });

  return runs.map((run) => ({
    id: run.id,
    compareGroupKey: run.compareGroupKey,
    compareLabel: run.compareLabel,
    executionMode: run.executionMode.toLowerCase(),
    createdAt: run.createdAt.toISOString(),
    errorMessage: run.errorMessage,
    agentProfile: run.agentProfile,
    subAgentProfile: run.subAgentProfile,
  }));
}

export async function getPlannerDebugRunDetail(userId: string, runId: string) {
  const run = await prisma.plannerDebugRun.findFirst({
    where: {
      id: runId,
      userId,
    },
    include: {
      agentProfile: {
        select: {
          id: true,
          slug: true,
          displayName: true,
        },
      },
      subAgentProfile: {
        select: {
          id: true,
          slug: true,
          subtype: true,
          displayName: true,
        },
      },
    },
  });

  if (!run) {
    return null;
  }

  return {
    id: run.id,
    compareGroupKey: run.compareGroupKey,
    compareLabel: run.compareLabel,
    executionMode: run.executionMode.toLowerCase(),
    createdAt: run.createdAt.toISOString(),
    errorMessage: run.errorMessage,
    replaySourceRunId: readString(readObject(run.inputJson).replaySourceRunId),
    agentProfile: run.agentProfile,
    subAgentProfile: run.subAgentProfile,
    model: run.modelSnapshotJson,
    input: run.inputJson,
    finalPrompt: run.finalPrompt,
    promptSnapshot: readPromptSnapshot(readObject(run.inputJson).promptSnapshot),
    rawText: run.rawText,
    providerOutput: run.providerOutputJson,
    assistantPackage: run.assistantPackageJson,
    usage: buildUsageSummary({
      providerOutput: run.providerOutputJson,
      prompt: run.finalPrompt,
      rawText: run.rawText,
      modelSnapshot: run.modelSnapshotJson,
    }),
    diffSummary: deriveDiffSummary({
      targetStage: readObject(run.inputJson).targetStage === 'outline' ? 'outline' : 'refinement',
      partialRerunScope:
        readObject(run.inputJson).partialRerunScope === 'subject_only' ||
        readObject(run.inputJson).partialRerunScope === 'scene_only' ||
        readObject(run.inputJson).partialRerunScope === 'shots_only'
          ? (readObject(run.inputJson).partialRerunScope as 'subject_only' | 'scene_only' | 'shots_only')
          : 'none',
      currentStructuredDoc: readObject(run.inputJson).currentStructuredDoc as Record<string, unknown> | undefined,
      targetEntity: readObject(run.inputJson).targetEntity as Record<string, unknown> | undefined,
      assistantPackage: readObject(run.assistantPackageJson),
    }),
  };
}
