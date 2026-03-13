import { Prisma } from '@prisma/client';
import type { Run } from '@prisma/client';

import { prisma } from './prisma.js';

export type SupportedMediaKind = 'IMAGE' | 'VIDEO';

export type RunLifecycleAction =
  | { runId: string; status: string; action: 'processed'; assetId: string; shotVersionId: string }
  | { runId: string; status: string; action: 'failed' };

export function inferMediaKindFromRunType(runType: string): SupportedMediaKind | null {
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

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function findStringDeep(value: unknown, keys: string[]): string | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const direct = typeof record[key] === 'string' && record[key] ? (record[key] as string) : null;
    if (direct) {
      return direct;
    }
  }

  for (const nested of Object.values(record)) {
    const found = findStringDeep(nested, keys);
    if (found) {
      return found;
    }
  }

  return null;
}

function resolveProviderSourceUrl(run: Run, mediaKind: SupportedMediaKind) {
  const providerData = readObject(run.outputJson).providerData;
  const providerUrl = findStringDeep(providerData, ['uri', 'url', 'downloadUrl']);
  if (providerUrl) {
    return providerUrl;
  }

  return buildGeneratedAssetUrl(run.id, mediaKind);
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

  const scaled =
    video.resolution === '1080p'
      ? { width: Math.round(dimensionByRatio.width * 1.5), height: Math.round(dimensionByRatio.height * 1.5) }
      : dimensionByRatio;

  return {
    width: scaled.width,
    height: scaled.height,
    durationMs: video.durationSeconds * 1000,
  };
}

export async function failRun(runId: string, errorCode: string, errorMessage: string): Promise<RunLifecycleAction> {
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

export async function finalizeGeneratedRun(run: Run, mediaKind: SupportedMediaKind): Promise<RunLifecycleAction> {
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
        sourceUrl: resolveProviderSourceUrl(run, mediaKind),
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
        providerStatus: run.providerStatus ?? (run.providerJobId ? 'succeeded' : null),
        outputJson: {
          ...readObject(run.outputJson),
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
