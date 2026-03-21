import { Prisma } from '@prisma/client';
import type { Run } from '@prisma/client';

import { downloadGeneratedAssetToLocal } from './asset-storage.js';
import type { prisma } from './prisma.js';
import { syncPlannerRefinementProjection } from './planner/refinement/projection.js';
import { readObject } from './json-helpers.js';

export type SupportedMediaKind = 'IMAGE' | 'VIDEO';

interface GeneratedRunFinalizeDeps {
  prisma: typeof prisma;
  downloadGeneratedAssetToLocal: typeof downloadGeneratedAssetToLocal;
  syncPlannerRefinementProjection: typeof syncPlannerRefinementProjection;
}

function buildGeneratedMimeType(mediaKind: SupportedMediaKind) {
  return mediaKind === 'IMAGE' ? 'image/png' : 'video/mp4';
}

function resolveProviderSourceUrl(run: Run) {
  const providerData = readObject(run.outputJson).providerData;
  const completionUrl = readObject(providerData).completionUrl;
  return typeof completionUrl === 'string' && completionUrl.trim() ? completionUrl.trim() : null;
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

export async function finalizePlannerEntityGeneratedRun(
  run: Run,
  resourceId: string,
  deps: GeneratedRunFinalizeDeps,
) {
  const input = readObject(run.inputJson);
  const prompt = typeof input.prompt === 'string' ? input.prompt : 'planner-generated-image';
  const dimensions = resolveDimensions('IMAGE', run);
  const providerSourceUrl = resolveProviderSourceUrl(run);
  if (!providerSourceUrl) {
    throw new Error('Provider output did not include a downloadable image URL.');
  }

  const storedAsset = await deps.downloadGeneratedAssetToLocal({
    runId: run.id,
    mediaKind: 'IMAGE',
    providerSourceUrl,
  });

  const result = await deps.prisma.$transaction(async (tx) => {
    const project = await tx.project.findUniqueOrThrow({
      where: { id: run.projectId as string },
      select: { createdById: true },
    });

    const asset = await tx.asset.create({
      data: {
        ownerUserId: project.createdById,
        projectId: run.projectId as string,
        episodeId: run.episodeId as string,
        mediaKind: 'IMAGE',
        sourceKind: 'GENERATED',
        fileName: storedAsset.fileName,
        mimeType: storedAsset.mimeType ?? buildGeneratedMimeType('IMAGE'),
        fileSizeBytes: storedAsset.fileSizeBytes,
        storageKey: storedAsset.storageKey,
        width: dimensions.width,
        height: dimensions.height,
        durationMs: null,
        sourceUrl: storedAsset.sourceUrl,
        metadataJson: {
          runId: run.id,
          prompt,
          providerJobId: run.providerJobId,
          providerStatus: run.providerStatus,
          generatedAt: new Date().toISOString(),
          providerSourceUrl,
          options: readObject(input.options),
          plannerResourceType: run.resourceType,
          plannerResourceId: resourceId,
        } as Prisma.InputJsonValue,
      },
    });

    let refinementVersionId: string | null = null;

    if (run.resourceType === 'planner_subject') {
      const subject = await tx.plannerSubject.findUnique({
        where: { id: resourceId },
        select: { id: true, refinementVersionId: true, generatedAssetIdsJson: true },
      });
      if (!subject) {
        throw new Error('Planner subject not found for generated image run.');
      }
      refinementVersionId = subject.refinementVersionId;
      const nextGeneratedIds = [
        asset.id,
        ...(
          Array.isArray(subject.generatedAssetIdsJson)
            ? subject.generatedAssetIdsJson.filter((assetId): assetId is string => typeof assetId === 'string' && assetId.length > 0)
            : []
        ),
      ];
      await tx.plannerSubject.update({
        where: { id: subject.id },
        data: {
          generatedAssetIdsJson: Array.from(new Set(nextGeneratedIds)).slice(0, 16) as Prisma.InputJsonValue,
        },
      });
    }

    if (run.resourceType === 'planner_scene') {
      const scene = await tx.plannerScene.findUnique({
        where: { id: resourceId },
        select: { id: true, refinementVersionId: true, generatedAssetIdsJson: true },
      });
      if (!scene) {
        throw new Error('Planner scene not found for generated image run.');
      }
      refinementVersionId = scene.refinementVersionId;
      const nextGeneratedIds = [
        asset.id,
        ...(
          Array.isArray(scene.generatedAssetIdsJson)
            ? scene.generatedAssetIdsJson.filter((assetId): assetId is string => typeof assetId === 'string' && assetId.length > 0)
            : []
        ),
      ];
      await tx.plannerScene.update({
        where: { id: scene.id },
        data: {
          generatedAssetIdsJson: Array.from(new Set(nextGeneratedIds)).slice(0, 16) as Prisma.InputJsonValue,
        },
      });
    }

    if (run.resourceType === 'planner_shot_script') {
      const shotScript = await tx.plannerShotScript.findUnique({
        where: { id: resourceId },
        select: { id: true, refinementVersionId: true, generatedAssetIdsJson: true },
      });
      if (!shotScript) {
        throw new Error('Planner shot script not found for generated image run.');
      }
      refinementVersionId = shotScript.refinementVersionId;
      const nextGeneratedIds = [
        asset.id,
        ...(
          Array.isArray(shotScript.generatedAssetIdsJson)
            ? shotScript.generatedAssetIdsJson.filter((assetId): assetId is string => typeof assetId === 'string' && assetId.length > 0)
            : []
        ),
      ];
      await tx.plannerShotScript.update({
        where: { id: shotScript.id },
        data: {
          generatedAssetIdsJson: Array.from(new Set(nextGeneratedIds)).slice(0, 16) as Prisma.InputJsonValue,
        },
      });
    }

    if (refinementVersionId) {
      await deps.syncPlannerRefinementProjection({
        db: tx,
        refinementVersionId,
      });
    }

    await tx.run.update({
      where: { id: run.id },
      data: {
        status: 'COMPLETED',
        providerStatus: run.providerStatus ?? (run.providerJobId ? 'succeeded' : null),
        outputJson: {
          ...readObject(run.outputJson),
          assetId: asset.id,
          plannerResourceType: run.resourceType,
          plannerResourceId: run.resourceId,
          dimensions,
        },
        finishedAt: new Date(),
        nextPollAt: null,
      },
    });

    return { assetId: asset.id };
  });

  return {
    assetId: result.assetId,
  };
}

export async function finalizeShotGeneratedRun(
  run: Run,
  mediaKind: SupportedMediaKind,
  deps: GeneratedRunFinalizeDeps,
) {
  const shot = await deps.prisma.shot.findUnique({
    where: { id: run.resourceId as string },
  });

  if (!shot) {
    throw new Error('Shot not found for run resource.');
  }

  const input = readObject(run.inputJson);
  const prompt =
    typeof input.prompt === 'string'
      ? input.prompt
      : mediaKind === 'IMAGE'
        ? shot.imagePrompt
        : shot.motionPrompt;
  const dimensions = resolveDimensions(mediaKind, run);
  const providerSourceUrl = resolveProviderSourceUrl(run);
  if (!providerSourceUrl) {
    throw new Error(`Provider output did not include a downloadable ${mediaKind.toLowerCase()} URL.`);
  }

  const storedAsset = await deps.downloadGeneratedAssetToLocal({
    runId: run.id,
    mediaKind,
    providerSourceUrl,
  });

  const result = await deps.prisma.$transaction(async (tx) => {
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
        fileName: storedAsset.fileName,
        mimeType: storedAsset.mimeType ?? buildGeneratedMimeType(mediaKind),
        fileSizeBytes: storedAsset.fileSizeBytes,
        storageKey: storedAsset.storageKey,
        width: dimensions.width,
        height: dimensions.height,
        durationMs: dimensions.durationMs,
        sourceUrl: storedAsset.sourceUrl,
        metadataJson: {
          runId: run.id,
          prompt,
          providerJobId: run.providerJobId,
          providerStatus: run.providerStatus,
          generatedAt: new Date().toISOString(),
          providerSourceUrl,
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
    assetId: result.assetId,
    shotVersionId: result.shotVersionId,
  };
}
