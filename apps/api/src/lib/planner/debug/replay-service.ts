import { prisma } from '../../prisma.js';
import { parseStoredDebugInput } from './execution-shared.js';
import { executePlannerDebugRun } from './execution-service.js';

async function replayPlannerDebugRunWithDeps(
  userId: string,
  runId: string,
  deps: {
    prisma: typeof prisma;
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

export const __testables = {
  replayPlannerDebugRunWithDeps,
};
