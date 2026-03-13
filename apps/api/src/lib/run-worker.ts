import type { Run } from '@prisma/client';

import { resolveProviderAdapter } from './provider-adapters.js';
import { prisma } from './prisma.js';
import { failRun, finalizeGeneratedRun, inferMediaKindFromRunType } from './run-lifecycle.js';

export type WorkerAction =
  | { runId: string; status: string; action: 'submitted'; providerJobId: string }
  | { runId: string; status: string; action: 'polled'; providerStatus: string }
  | { runId: string; status: string; action: 'processed'; assetId: string; shotVersionId: string }
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
      },
    });

    const refreshedRun = await prisma.run.findUniqueOrThrow({ where: { id: run.id } });
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
  const adapter = resolveProviderAdapter(run);
  const update = await adapter.poll(run);

  if (update.type === 'failed') {
    return failRun(run.id, update.errorCode, update.errorMessage);
  }

  if (update.type === 'running') {
    await prisma.run.update({
      where: { id: run.id },
      data: {
        providerStatus: update.providerStatus,
        pollAttemptCount: run.pollAttemptCount + 1,
        lastPolledAt: new Date(),
        nextPollAt: update.nextPollAt,
      },
    });

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

  await prisma.run.update({
    where: { id: run.id },
    data: {
      providerStatus: update.providerStatus,
      pollAttemptCount: run.pollAttemptCount + 1,
      lastPolledAt: new Date(),
      nextPollAt: null,
    },
  });

  const refreshedRun = await prisma.run.findUniqueOrThrow({ where: { id: run.id } });
  const mediaKind = inferMediaKindFromRunType(refreshedRun.runType);
  if (!mediaKind) {
    return failRun(refreshedRun.id, 'RUN_TYPE_NOT_SUPPORTED', `Unsupported run type: ${refreshedRun.runType}`);
  }
  return finalizeGeneratedRun(refreshedRun, mediaKind);
}

async function claimNextRun(): Promise<Run | null> {
  const now = new Date();

  const pollableRun = await prisma.run.findFirst({
    where: {
      status: 'RUNNING',
      providerJobId: { not: null },
      nextPollAt: { lte: now },
      runType: {
        in: ['IMAGE_GENERATION', 'VIDEO_GENERATION'],
      },
    },
    orderBy: { nextPollAt: 'asc' },
  });

  if (pollableRun) {
    return pollableRun;
  }

  const queuedRun = await prisma.run.findFirst({
    where: {
      status: 'QUEUED',
      runType: {
        in: ['IMAGE_GENERATION', 'VIDEO_GENERATION'],
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  if (!queuedRun) {
    return null;
  }

  const claim = await prisma.run.updateMany({
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

  return prisma.run.findUnique({
    where: { id: queuedRun.id },
  });
}

export async function processNextQueuedRun(): Promise<WorkerAction | null> {
  const run = await claimNextRun();
  if (!run) {
    return null;
  }

  const mediaKind = inferMediaKindFromRunType(run.runType);
  if (!mediaKind) {
    return failRun(run.id, 'RUN_TYPE_NOT_SUPPORTED', `Unsupported run type: ${run.runType}`);
  }

  if (run.providerJobId) {
    return handleProviderPoll(run);
  }

  return handleProviderSubmission(run);
}
