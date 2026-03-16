import { Prisma } from '@prisma/client';
import type { Run } from '@prisma/client';

import { downloadGeneratedAssetToLocal } from './asset-storage.js';
import { finalizePlannerConversation } from './planner-orchestrator.js';
import { extractPlannerText, findStringDeep } from './planner-text-extraction.js';
import { syncPlannerRefinementProjection } from './planner-refinement-projection.js';
import { prisma } from './prisma.js';

export type SupportedMediaKind = 'IMAGE' | 'VIDEO';

export type RunLifecycleAction =
  | { runId: string; status: string; action: 'processed'; assetId?: string; shotVersionId?: string }
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

function resolveProviderSourceUrl(run: Run) {
  const providerData = readObject(run.outputJson).providerData;
  return findStringDeep(providerData, ['uri', 'url', 'downloadUrl']);
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

export async function finalizePlannerRun(run: Run): Promise<RunLifecycleAction> {
  if (run.resourceType !== 'planner_session' || !run.resourceId || !run.projectId || !run.episodeId) {
    return failRun(run.id, 'RUN_RESOURCE_INVALID', 'Run is missing planner session/project/episode linkage.');
  }

  const plannerSession = await prisma.plannerSession.findUnique({
    where: { id: run.resourceId },
  });

  if (!plannerSession) {
    return failRun(run.id, 'PLANNER_SESSION_NOT_FOUND', 'Planner session not found for run resource.');
  }

  const input = readObject(run.inputJson);
  const output = readObject(run.outputJson);
  const rawPrompt = typeof input.rawPrompt === 'string' ? input.rawPrompt : '未命名策划';
  const generatedText = extractPlannerText(output.providerData, rawPrompt);
  await finalizePlannerConversation({
    run,
    plannerSession,
    generatedText,
    createdById: plannerSession.createdById,
  });

  return {
    runId: run.id,
    status: 'completed',
    action: 'processed',
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
  if (!run.resourceType || !run.resourceId || !run.projectId || !run.episodeId) {
    return failRun(run.id, 'RUN_RESOURCE_INVALID', 'Run is missing resource/project/episode linkage.');
  }

  const projectId = run.projectId;
  const episodeId = run.episodeId;
  const resourceId = run.resourceId;

  if (run.resourceType !== 'shot' && mediaKind !== 'IMAGE') {
    return failRun(run.id, 'RUN_RESOURCE_INVALID', 'Planner entities currently only support image generation.');
  }

  if (run.resourceType === 'planner_subject' || run.resourceType === 'planner_scene' || run.resourceType === 'planner_shot_script') {
    const input = readObject(run.inputJson);
    const prompt = typeof input.prompt === 'string' ? input.prompt : 'planner-generated-image';
    const dimensions = resolveDimensions('IMAGE', run);
    const providerSourceUrl = resolveProviderSourceUrl(run);
    if (!providerSourceUrl) {
      return failRun(run.id, 'PROVIDER_OUTPUT_URL_MISSING', 'Provider output did not include a downloadable image URL.');
    }

    try {
      const storedAsset = await downloadGeneratedAssetToLocal({
        runId: run.id,
        mediaKind: 'IMAGE',
        providerSourceUrl,
      });
      const result = await prisma.$transaction(async (tx) => {
        const project = await tx.project.findUniqueOrThrow({
          where: { id: projectId },
          select: { createdById: true },
        });

        const asset = await tx.asset.create({
          data: {
            ownerUserId: project.createdById,
            projectId,
            episodeId,
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
        await syncPlannerRefinementProjection({
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
        runId: run.id,
        status: 'completed',
        action: 'processed',
        assetId: result.assetId,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Planner entity image finalization failed.';
      return failRun(run.id, 'PLANNER_ENTITY_IMAGE_FINALIZE_FAILED', message);
    }
  }

  if (run.resourceType !== 'shot') {
    return failRun(run.id, 'RUN_RESOURCE_INVALID', 'Unsupported generated run resource type.');
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
  const providerSourceUrl = resolveProviderSourceUrl(run);
  if (!providerSourceUrl) {
    return failRun(run.id, 'PROVIDER_OUTPUT_URL_MISSING', `Provider output did not include a downloadable ${mediaKind.toLowerCase()} URL.`);
  }

  const storedAsset = await downloadGeneratedAssetToLocal({
    runId: run.id,
    mediaKind,
    providerSourceUrl,
  });

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
    runId: run.id,
    status: 'completed',
    action: 'processed',
    assetId: result.assetId,
    shotVersionId: result.shotVersionId,
  };
}
