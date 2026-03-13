import { Prisma } from '@prisma/client';
import type { Run } from '@prisma/client';

import { parsePlannerStructuredDoc } from './planner-doc.js';
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

function extractPlannerText(providerData: unknown, fallbackPrompt: string) {
  const record = readObject(providerData);

  if (typeof record.output_text === 'string' && record.output_text.trim()) {
    return record.output_text.trim();
  }

  const outputs = Array.isArray(record.output) ? record.output : [];
  for (const output of outputs) {
    const content = Array.isArray(readObject(output).content) ? (readObject(output).content as unknown[]) : [];
    for (const item of content) {
      const candidate = readObject(item);
      const text = typeof candidate.text === 'string' ? candidate.text.trim() : '';
      if (text) {
        return text;
      }
    }
  }

  const choices = Array.isArray(record.choices) ? record.choices : [];
  for (const choice of choices) {
    const message = readObject(readObject(choice).message);
    const content = message.content;
    if (typeof content === 'string' && content.trim()) {
      return content.trim();
    }
  }

  const candidates = Array.isArray(record.candidates) ? record.candidates : [];
  for (const candidate of candidates) {
    const content = readObject(readObject(candidate).content);
    const parts = Array.isArray(content.parts) ? content.parts : [];
    const textPart = parts.find((part) => typeof readObject(part).text === 'string');
    const text = textPart ? (readObject(textPart).text as string).trim() : '';
    if (text) {
      return text;
    }
  }

  return `【策划草案】
主题：${fallbackPrompt}

1. 故事梗概：围绕该主题生成单集短片策划。
2. 视觉风格：保持角色一致性与镜头节奏。
3. 分镜方向：先建立场景，再推进动作与情绪变化。`;
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
  const structuredDoc = parsePlannerStructuredDoc({
    rawText: generatedText,
    userPrompt: rawPrompt,
    projectTitle: typeof input.projectTitle === 'string' ? input.projectTitle : '未命名项目',
    episodeTitle: typeof input.episodeTitle === 'string' ? input.episodeTitle : '第1集',
  });

  await prisma.$transaction(async (tx) => {
    await tx.plannerSession.update({
      where: { id: plannerSession.id },
      data: {
        status: 'READY',
      },
    });

    await tx.project.update({
      where: { id: plannerSession.projectId },
      data: {
        status: 'READY_FOR_STORYBOARD',
      },
    });

    await tx.episode.update({
      where: { id: plannerSession.episodeId },
      data: {
        status: 'READY_FOR_STORYBOARD',
      },
    });

    await tx.run.update({
      where: { id: run.id },
      data: {
        status: 'COMPLETED',
        providerStatus: run.providerStatus ?? 'succeeded',
        outputJson: {
          ...output,
          generatedText,
          structuredDoc,
          plannerSessionId: plannerSession.id,
        },
        finishedAt: new Date(),
        nextPollAt: null,
      },
    });
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
