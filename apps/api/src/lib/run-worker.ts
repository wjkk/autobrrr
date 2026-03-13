import { randomUUID } from 'node:crypto';

import { Prisma } from '@prisma/client';
import type { Run } from '@prisma/client';

import { prisma } from './prisma.js';

type SupportedRunType = 'IMAGE_GENERATION' | 'VIDEO_GENERATION';
type SupportedMediaKind = 'IMAGE' | 'VIDEO';

type WorkerAction =
  | { runId: string; status: string; action: 'submitted'; providerJobId: string }
  | { runId: string; status: string; action: 'polled'; providerStatus: string }
  | { runId: string; status: string; action: 'processed'; assetId: string; shotVersionId: string }
  | { runId: string; status: string; action: 'failed' };

function inferMediaKindFromRunType(runType: string): SupportedMediaKind | null {
  if (runType === 'IMAGE_GENERATION') {
    return 'IMAGE';
  }

  if (runType === 'VIDEO_GENERATION') {
    return 'VIDEO';
  }

  return null;
}

function buildGeneratedAssetUrl(runId: string, mediaKind: SupportedMediaKind) {
  const extension = mediaKind === 'IMAGE' ? 'png' : 'mp4';
  return `https://generated.local/${runId}.${extension}`;
}

function buildGeneratedMimeType(mediaKind: SupportedMediaKind) {
  return mediaKind === 'IMAGE' ? 'image/png' : 'video/mp4';
}

function buildGeneratedFileName(runId: string, mediaKind: SupportedMediaKind) {
  const extension = mediaKind === 'IMAGE' ? 'png' : 'mp4';
  return `generated-${runId}.${extension}`;
}

function inferProviderExecutionMode(run: Run) {
  const input = (run.inputJson ?? {}) as Record<string, unknown>;
  const modelProvider = input.modelProvider as Record<string, unknown> | undefined;
  const providerType = typeof modelProvider?.providerType === 'string' ? modelProvider.providerType : null;
  return providerType === 'proxy' ? 'async' : 'sync';
}

function toIsoDateAfterSeconds(seconds: number) {
  return new Date(Date.now() + seconds * 1000);
}

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function parseVideoOptions(run: Run) {
  const input = readObject(run.inputJson);
  const options = readObject(input.options);
  const durationSeconds =
    typeof options.durationSeconds === 'number' && Number.isFinite(options.durationSeconds) ? Math.max(1, Math.floor(options.durationSeconds)) : 4;
  const aspectRatio = typeof options.aspectRatio === 'string' && options.aspectRatio.trim() ? options.aspectRatio.trim() : '9:16';
  const resolution = typeof options.resolution === 'string' && options.resolution.trim() ? options.resolution.trim() : '720p';

  return {
    durationSeconds,
    aspectRatio,
    resolution,
  };
}

function resolveDimensions(mediaKind: SupportedMediaKind, run: Run) {
  if (mediaKind === 'IMAGE') {
    return { width: 1024, height: 1536, durationMs: null };
  }

  const video = parseVideoOptions(run);
  const dimensionByRatio = (() => {
    switch (video.aspectRatio) {
      case '16:9':
        return { width: 1280, height: 720 };
      case '1:1':
        return { width: 1024, height: 1024 };
      default:
        return { width: 720, height: 1280 };
    }
  })();

  const scaled = video.resolution === '1080p'
    ? { width: Math.round(dimensionByRatio.width * 1.5), height: Math.round(dimensionByRatio.height * 1.5) }
    : dimensionByRatio;

  return {
    width: scaled.width,
    height: scaled.height,
    durationMs: video.durationSeconds * 1000,
  };
}

async function failRun(runId: string, errorCode: string, errorMessage: string): Promise<WorkerAction> {
  const failedRun = await prisma.run.update({
    where: { id: runId },
    data: {
      status: 'FAILED',
      errorCode,
      errorMessage,
      finishedAt: new Date(),
      nextPollAt: null,
    },
  });

  return {
    runId: failedRun.id,
    status: failedRun.status.toLowerCase(),
    action: 'failed',
  };
}

async function finalizeGeneratedRun(run: Run, mediaKind: SupportedMediaKind): Promise<WorkerAction> {
  if (run.resourceType !== 'shot' || !run.resourceId || !run.projectId || !run.episodeId) {
    return failRun(run.id, 'RUN_RESOURCE_INVALID', 'Run is missing shot/project/episode linkage.');
  }

  const shot = await prisma.shot.findUnique({
    where: { id: run.resourceId },
  });

  if (!shot) {
    return failRun(run.id, 'SHOT_NOT_FOUND', 'Shot not found for run resource.');
  }

  const input = readObject(run.inputJson);
  const prompt =
    typeof input.prompt === 'string'
      ? input.prompt
      : mediaKind === 'IMAGE'
        ? shot.imagePrompt
        : shot.motionPrompt;
  const dimensions = resolveDimensions(mediaKind, run);

  const result = await prisma.$transaction(async (tx) => {
    const project = await tx.project.findUniqueOrThrow({
      where: { id: shot.projectId },
      select: { createdById: true },
    });

    const nextVersionNumber =
      (
        await tx.shotVersion.aggregate({
          where: { shotId: shot.id },
          _max: { versionNumber: true },
        })
      )._max.versionNumber ?? 0;

    const asset = await tx.asset.create({
      data: {
        ownerUserId: project.createdById,
        projectId: shot.projectId,
        episodeId: shot.episodeId,
        mediaKind,
        sourceKind: 'GENERATED',
        fileName: buildGeneratedFileName(run.id, mediaKind),
        mimeType: buildGeneratedMimeType(mediaKind),
        width: dimensions.width,
        height: dimensions.height,
        durationMs: dimensions.durationMs,
        sourceUrl: buildGeneratedAssetUrl(run.id, mediaKind),
        metadataJson: {
          runId: run.id,
          prompt,
          providerJobId: run.providerJobId,
          providerStatus: run.providerStatus,
          generatedAt: new Date().toISOString(),
          options: readObject(input.options),
        } as Prisma.InputJsonValue,
      },
    });

    if (shot.activeVersionId) {
      await tx.shotVersion.updateMany({
        where: { id: shot.activeVersionId, shotId: shot.id },
        data: { status: 'ARCHIVED' },
      });
    }

    const version = await tx.shotVersion.create({
      data: {
        shotId: shot.id,
        projectId: shot.projectId,
        episodeId: shot.episodeId,
        versionNumber: nextVersionNumber + 1,
        label: `${mediaKind === 'IMAGE' ? '图片' : '视频'}版本 ${nextVersionNumber + 1}`,
        mediaKind,
        status: 'ACTIVE',
        outputAssetId: asset.id,
      },
    });

    await tx.shot.update({
      where: { id: shot.id },
      data: {
        status: 'SUCCESS',
        activeVersionId: version.id,
      },
    });

    await tx.run.update({
      where: { id: run.id },
      data: {
        status: 'COMPLETED',
        providerStatus: run.providerJobId ? 'succeeded' : null,
        outputJson: {
          assetId: asset.id,
          shotVersionId: version.id,
          activeVersionId: version.id,
          shotStatus: 'SUCCESS',
          dimensions,
        },
        finishedAt: new Date(),
        nextPollAt: null,
      },
    });

    return {
      assetId: asset.id,
      shotVersionId: version.id,
    };
  });

  return {
    runId: run.id,
    status: 'completed',
    action: 'processed',
    assetId: result.assetId,
    shotVersionId: result.shotVersionId,
  };
}

async function submitAsyncRun(run: Run): Promise<WorkerAction> {
  const providerJobId = run.providerJobId ?? `job_${randomUUID()}`;
  await prisma.run.update({
    where: { id: run.id },
    data: {
      providerJobId,
      providerCallbackToken: run.providerCallbackToken ?? randomUUID(),
      providerStatus: 'submitted',
      nextPollAt: toIsoDateAfterSeconds(1),
    },
  });

  return {
    runId: run.id,
    status: 'running',
    action: 'submitted',
    providerJobId,
  };
}

async function pollAsyncRun(run: Run, mediaKind: SupportedMediaKind): Promise<WorkerAction> {
  const nextAttempt = run.pollAttemptCount + 1;
  const isReady = nextAttempt >= 2;

  if (!isReady) {
    await prisma.run.update({
      where: { id: run.id },
      data: {
        providerStatus: 'processing',
        pollAttemptCount: nextAttempt,
        lastPolledAt: new Date(),
        nextPollAt: toIsoDateAfterSeconds(1),
      },
    });

    return {
      runId: run.id,
      status: 'running',
      action: 'polled',
      providerStatus: 'processing',
    };
  }

  await prisma.run.update({
    where: { id: run.id },
    data: {
      providerStatus: 'processing',
      pollAttemptCount: nextAttempt,
      lastPolledAt: new Date(),
      nextPollAt: null,
    },
  });

  const refreshedRun = await prisma.run.findUniqueOrThrow({
    where: { id: run.id },
  });

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

  const mediaKind = inferMediaKindFromRunType(run.runType as SupportedRunType);
  if (!mediaKind) {
    return failRun(run.id, 'RUN_TYPE_NOT_SUPPORTED', `Unsupported run type: ${run.runType}`);
  }

  if (run.providerJobId) {
    return pollAsyncRun(run, mediaKind);
  }

  const executionMode = inferProviderExecutionMode(run);
  if (executionMode === 'async') {
    return submitAsyncRun(run);
  }

  return finalizeGeneratedRun(run, mediaKind);
}
