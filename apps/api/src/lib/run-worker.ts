import { Prisma } from '@prisma/client';
import type { Run } from '@prisma/client';

import { readObject } from './json-helpers.js';
import { resolveProviderAdapter, type ProviderAdapterUpdate } from './provider-adapters.js';
import { prisma } from './prisma.js';
import { failRun, finalizeGeneratedRun, finalizePlannerRun, inferMediaKindFromRunType } from './run-lifecycle.js';

function buildProviderOutputJson(run: Run, update: ProviderAdapterUpdate) {
  if (!('providerOutput' in update) || !update.providerOutput) {
    return undefined;
  }

  const currentOutput = run.outputJson && typeof run.outputJson === 'object' && !Array.isArray(run.outputJson)
    ? (run.outputJson as Record<string, unknown>)
    : {};
  const providerData =
    update.type === 'completed' && update.completionUrl && !('completionUrl' in update.providerOutput)
      ? { ...update.providerOutput, completionUrl: update.completionUrl, downloadUrl: update.completionUrl }
      : update.providerOutput;

  return {
    ...currentOutput,
    executionMode:
      providerData && typeof providerData === 'object' && 'mocked' in providerData
        ? providerData.mocked === true ? 'fallback' : 'live'
        : 'live',
    providerData,
  } as Prisma.InputJsonValue;
}

function toTerminalWorkerAction(run: Run): WorkerAction {
  if (run.status === 'COMPLETED') {
    const output = readObject(run.outputJson);
    const assetId = typeof output.assetId === 'string' ? output.assetId : undefined;
    const shotVersionId = typeof output.shotVersionId === 'string' ? output.shotVersionId : undefined;
    return {
      runId: run.id,
      status: 'completed',
      action: 'processed',
      ...(assetId ? { assetId } : {}),
      ...(shotVersionId ? { shotVersionId } : {}),
    };
  }

  return {
    runId: run.id,
    status: run.status.toLowerCase(),
    action: 'failed',
  };
}

async function processClaimedRunWithDeps(
  run: Run,
  deps: {
    handleProviderSubmission: (run: Run) => Promise<WorkerAction>;
    handleProviderPoll: (run: Run) => Promise<WorkerAction>;
    failRun: typeof failRun;
    inferMediaKindFromRunType: typeof inferMediaKindFromRunType;
  },
) {
  if (run.runType === 'PLANNER_DOC_UPDATE') {
    if (run.providerJobId) {
      return deps.handleProviderPoll(run);
    }

    return deps.handleProviderSubmission(run);
  }

  const mediaKind = deps.inferMediaKindFromRunType(run.runType);
  if (!mediaKind) {
    return deps.failRun(run.id, 'RUN_TYPE_NOT_SUPPORTED', `Unsupported run type: ${run.runType}`);
  }

  if (run.providerJobId) {
    return deps.handleProviderPoll(run);
  }

  return deps.handleProviderSubmission(run);
}

export type WorkerAction =
  | { runId: string; status: string; action: 'submitted'; providerJobId: string }
  | { runId: string; status: string; action: 'polled'; providerStatus: string }
  | { runId: string; status: string; action: 'processed'; assetId?: string; shotVersionId?: string }
  | { runId: string; status: string; action: 'failed' };

async function handleProviderSubmission(run: Run): Promise<WorkerAction> {
  const adapter = resolveProviderAdapter(run);
  const update = await adapter.submit(run);

  if (update.type === 'failed') {
    return failRun(run.id, update.errorCode, update.errorMessage);
  }

  if (update.type === 'completed') {
    await prisma.run.update({
      where: { id: run.id },
      data: {
        providerStatus: update.providerStatus,
        nextPollAt: null,
        outputJson: buildProviderOutputJson(run, update),
      },
    });

    const refreshedRun = await prisma.run.findUniqueOrThrow({ where: { id: run.id } });
    if (refreshedRun.runType === 'PLANNER_DOC_UPDATE') {
      return finalizePlannerRun(refreshedRun);
    }

    const mediaKind = inferMediaKindFromRunType(refreshedRun.runType);
    if (!mediaKind) {
      return failRun(refreshedRun.id, 'RUN_TYPE_NOT_SUPPORTED', `Unsupported run type: ${refreshedRun.runType}`);
    }
    return finalizeGeneratedRun(refreshedRun, mediaKind);
  }

  if (update.type !== 'submitted') {
    return failRun(run.id, 'PROVIDER_SUBMIT_INVALID_STATE', 'Provider adapter returned an invalid submission state.');
  }

  await prisma.run.update({
    where: { id: run.id },
    data: {
      providerJobId: update.providerJobId,
      providerCallbackToken: update.providerCallbackToken ?? run.providerCallbackToken,
      providerStatus: update.providerStatus,
      nextPollAt: update.nextPollAt,
      outputJson: buildProviderOutputJson(run, update),
    },
  });

  return {
    runId: run.id,
    status: 'running',
    action: 'submitted',
    providerJobId: update.providerJobId,
  };
}

async function handleProviderPoll(run: Run): Promise<WorkerAction> {
  const activeRun = await prisma.run.findUniqueOrThrow({ where: { id: run.id } });
  if (activeRun.status !== 'RUNNING') {
    return toTerminalWorkerAction(activeRun);
  }

  const adapter = resolveProviderAdapter(run);
  const update = await adapter.poll(run);

  if (update.type === 'failed') {
    return failRun(run.id, update.errorCode, update.errorMessage);
  }

  if (update.type === 'running') {
    const runningUpdate = await prisma.run.updateMany({
      where: {
        id: run.id,
        status: 'RUNNING',
      },
      data: {
        providerStatus: update.providerStatus,
        pollAttemptCount: run.pollAttemptCount + 1,
        lastPolledAt: new Date(),
        nextPollAt: update.nextPollAt,
        outputJson: buildProviderOutputJson(run, update),
      },
    });

    if (runningUpdate.count !== 1) {
      const latestRun = await prisma.run.findUniqueOrThrow({ where: { id: run.id } });
      return toTerminalWorkerAction(latestRun);
    }

    return {
      runId: run.id,
      status: 'running',
      action: 'polled',
      providerStatus: update.providerStatus,
    };
  }

  if (update.type !== 'completed') {
    return failRun(run.id, 'PROVIDER_POLL_INVALID_STATE', 'Provider adapter returned an invalid poll state.');
  }

  const completedUpdate = await prisma.run.updateMany({
    where: {
      id: run.id,
      status: 'RUNNING',
    },
    data: {
      providerStatus: update.providerStatus,
      pollAttemptCount: run.pollAttemptCount + 1,
      lastPolledAt: new Date(),
      nextPollAt: null,
      outputJson: buildProviderOutputJson(run, update),
    },
  });

  if (completedUpdate.count !== 1) {
    const latestRun = await prisma.run.findUniqueOrThrow({ where: { id: run.id } });
    return toTerminalWorkerAction(latestRun);
  }

  const refreshedRun = await prisma.run.findUniqueOrThrow({ where: { id: run.id } });
  if (refreshedRun.runType === 'PLANNER_DOC_UPDATE') {
    return finalizePlannerRun(refreshedRun);
  }

  const mediaKind = inferMediaKindFromRunType(refreshedRun.runType);
  if (!mediaKind) {
    return failRun(refreshedRun.id, 'RUN_TYPE_NOT_SUPPORTED', `Unsupported run type: ${refreshedRun.runType}`);
  }
  return finalizeGeneratedRun(refreshedRun, mediaKind);
}

async function claimNextRunWithDeps(deps: {
  findFirst: typeof prisma.run.findFirst;
  updateMany: typeof prisma.run.updateMany;
  findUnique: typeof prisma.run.findUnique;
}): Promise<Run | null> {
  const now = new Date();

  const pollableRun = await deps.findFirst({
    where: {
      status: 'RUNNING',
      providerJobId: { not: null },
      nextPollAt: { lte: now },
      runType: {
        in: ['PLANNER_DOC_UPDATE', 'IMAGE_GENERATION', 'VIDEO_GENERATION'],
      },
    },
    orderBy: { nextPollAt: 'asc' },
  });

  if (pollableRun) {
    return pollableRun;
  }

  const queuedRun = await deps.findFirst({
    where: {
      status: 'QUEUED',
      runType: {
        in: ['PLANNER_DOC_UPDATE', 'IMAGE_GENERATION', 'VIDEO_GENERATION'],
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  if (!queuedRun) {
    return null;
  }

  const claim = await deps.updateMany({
    where: {
      id: queuedRun.id,
      status: 'QUEUED',
    },
    data: {
      status: 'RUNNING',
      startedAt: new Date(),
    },
  });

  if (claim.count !== 1) {
    return null;
  }

  return deps.findUnique({
    where: { id: queuedRun.id },
  });
}

export async function processNextQueuedRun(): Promise<WorkerAction | null> {
  const run = await claimNextRunWithDeps({
    findFirst: prisma.run.findFirst.bind(prisma.run),
    updateMany: prisma.run.updateMany.bind(prisma.run),
    findUnique: prisma.run.findUnique.bind(prisma.run),
  });
  if (!run) {
    return null;
  }

  return processClaimedRunWithDeps(run, {
    handleProviderSubmission,
    handleProviderPoll,
    failRun,
    inferMediaKindFromRunType,
  });
}

export const __testables = {
  buildProviderOutputJson,
  toTerminalWorkerAction,
  handleProviderPoll,
  processClaimedRunWithDeps,
  claimNextRunWithDeps,
};
