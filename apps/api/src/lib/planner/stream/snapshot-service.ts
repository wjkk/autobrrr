import { Prisma } from '@prisma/client';

import { prisma } from '../../prisma.js';
import { parseRunInput } from '../../run-input.js';

type PlannerStreamRunRecord = {
  id: string;
  runType: string;
  inputJson: Prisma.JsonValue | null;
  status: string;
};

interface PlannerStreamSnapshotDeps {
  prisma: typeof prisma;
}

const defaultPlannerStreamSnapshotDeps: PlannerStreamSnapshotDeps = {
  prisma,
};

function toStepStatus(status: string) {
  switch (status.toUpperCase()) {
    case 'DONE':
      return 'done';
    case 'RUNNING':
      return 'running';
    case 'FAILED':
      return 'failed';
    default:
      return 'waiting';
  }
}

function readStepDefinitions(run: PlannerStreamRunRecord) {
  if (run.runType !== 'PLANNER_DOC_UPDATE') {
    return [];
  }

  try {
    const input = parseRunInput({
      id: run.id,
      runType: run.runType,
      inputJson: run.inputJson,
    });

    if (!('stepDefinitions' in input) || !Array.isArray(input.stepDefinitions)) {
      return [];
    }

    return input.stepDefinitions.map((step, index) => {
      const title = typeof step.title === 'string' && step.title.trim().length > 0 ? step.title.trim() : `步骤 ${index + 1}`;
      const rawDetails = Array.isArray(step.details) ? step.details.filter((detail): detail is string => typeof detail === 'string') : [];

      return {
        id: typeof step.id === 'string' && step.id.trim().length > 0 ? step.id.trim() : `step-${index + 1}`,
        title,
        details: rawDetails,
      };
    });
  } catch {
    return [];
  }
}

function buildSyntheticSteps(run: PlannerStreamRunRecord) {
  const definitions = readStepDefinitions(run);
  if (definitions.length === 0) {
    return [];
  }

  const normalizedRunStatus = run.status.toUpperCase();

  return definitions.map((step, index) => ({
    id: step.id,
    stepKey: step.id,
    title: step.title,
    status:
      normalizedRunStatus === 'RUNNING'
        ? index === 0
          ? 'running'
          : 'waiting'
        : normalizedRunStatus === 'FAILED' || normalizedRunStatus === 'TIMED_OUT' || normalizedRunStatus === 'CANCELED'
          ? index === 0
            ? 'failed'
            : 'waiting'
          : 'waiting',
    detail: {
      details: step.details,
    },
    sortOrder: index + 1,
  }));
}

async function buildPlannerStreamSnapshotWithDeps(
  args: {
    projectId: string;
    episodeId: string;
    runId?: string;
  },
  deps: PlannerStreamSnapshotDeps,
) {
  const plannerSession = await deps.prisma.plannerSession.findFirst({
    where: {
      projectId: args.projectId,
      episodeId: args.episodeId,
      isActive: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      id: true,
      status: true,
      refinementVersions: {
        where: {
          isActive: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 1,
        select: {
          id: true,
          sourceRunId: true,
          stepAnalysis: {
            orderBy: {
              sortOrder: 'asc',
            },
            select: {
              id: true,
              stepKey: true,
              title: true,
              status: true,
              detailJson: true,
              sortOrder: true,
            },
          },
        },
      },
    },
  });

  const trackedRun = args.runId
    ? await deps.prisma.run.findFirst({
        where: {
          id: args.runId,
          projectId: args.projectId,
          episodeId: args.episodeId,
        },
        select: {
          id: true,
          runType: true,
          status: true,
          inputJson: true,
          errorCode: true,
          errorMessage: true,
        },
      })
    : null;

  const activeRefinement = plannerSession?.refinementVersions[0] ?? null;
  const shouldUsePersistedSteps =
    activeRefinement?.stepAnalysis.length &&
    (!trackedRun || activeRefinement.sourceRunId === trackedRun.id);

  const steps = shouldUsePersistedSteps
    ? activeRefinement.stepAnalysis.map((step) => ({
        id: step.id,
        stepKey: step.stepKey,
        title: step.title,
        status: toStepStatus(step.status),
        detail:
          step.detailJson && typeof step.detailJson === 'object' && !Array.isArray(step.detailJson)
            ? step.detailJson
            : null,
        sortOrder: step.sortOrder,
      }))
    : trackedRun
      ? buildSyntheticSteps(trackedRun)
      : [];

  const runStatus = trackedRun?.status.toLowerCase() ?? null;
  const terminal = runStatus ? ['completed', 'failed', 'canceled', 'timed_out'].includes(runStatus) : false;

  return {
    plannerSessionId: plannerSession?.id ?? null,
    plannerStatus: plannerSession?.status.toLowerCase() ?? null,
    refinementVersionId: activeRefinement?.id ?? null,
    runId: trackedRun?.id ?? null,
    runStatus,
    errorCode: trackedRun?.errorCode ?? null,
    errorMessage: trackedRun?.errorMessage ?? null,
    steps,
    terminal,
  };
}

export async function buildPlannerStreamSnapshot(args: {
  projectId: string;
  episodeId: string;
  runId?: string;
}) {
  return buildPlannerStreamSnapshotWithDeps(args, defaultPlannerStreamSnapshotDeps);
}

export const __testables = {
  toStepStatus,
  readStepDefinitions,
  buildSyntheticSteps,
  buildPlannerStreamSnapshotWithDeps,
};
