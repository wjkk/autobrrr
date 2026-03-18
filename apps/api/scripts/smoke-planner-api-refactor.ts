import { strict as assert } from 'node:assert';

import type { Prisma } from '@prisma/client';

import { finalizeGeneratedRun } from '../src/lib/run-lifecycle.js';
import { syncPlannerRefinementDerivedData } from '../src/lib/planner-refinement-sync.js';
import { syncPlannerRefinementProjection } from '../src/lib/planner-refinement-projection.js';
import { prisma } from '../src/lib/prisma.js';

const apiBaseUrl = (process.env.API_BASE_URL ?? 'http://127.0.0.1:8787').replace(/\/$/, '');
const email = process.env.SMOKE_EMAIL ?? `planner-refactor-${Date.now()}@example.com`;
const password = process.env.SMOKE_PASSWORD ?? 'password123';
const tinyPngDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a4k0AAAAASUVORK5CYII=';

function apiUrl(path: string) {
  return `${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

interface ApiSuccess<T> {
  ok: true;
  data: T;
}

interface ApiFailure {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

async function assertDatabaseReady() {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Database is not reachable for smoke-planner-api-refactor. Start MySQL for ${process.env.DATABASE_URL ?? 'DATABASE_URL'} before rerunning. (${message})`);
  }
}

async function request<T>(path: string, init?: RequestInit & { cookie?: string }) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
      ...(init?.cookie ? { Cookie: init.cookie } : {}),
    },
  });

  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || !payload.ok) {
    const errorPayload = payload as ApiFailure;
    throw new Error(`${path} failed: ${errorPayload.error?.code ?? response.status} ${errorPayload.error?.message ?? 'Unknown error'}`);
  }

  return {
    data: payload.data,
    setCookie: response.headers.get('set-cookie'),
  };
}

async function requestExpectError(
  path: string,
  expectedCode: string,
  init?: RequestInit & { cookie?: string },
) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
      ...(init?.cookie ? { Cookie: init.cookie } : {}),
    },
  });

  const payload = (await response.json()) as ApiFailure;
  assert.equal(response.ok, false);
  assert.equal(payload.ok, false);
  assert.equal(payload.error.code, expectedCode);
  return payload;
}

async function readFirstPlannerStreamEvent(path: string, cookie: string) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: 'GET',
    headers: {
      Accept: 'text/event-stream',
      Cookie: cookie,
    },
  });

  assert.equal(response.ok, true);
  assert.ok(response.body);

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const marker = '\n\n';
    const markerIndex = buffer.indexOf(marker);
    if (markerIndex === -1) {
      continue;
    }

    const eventBlock = buffer.slice(0, markerIndex);
    const dataLine = eventBlock
      .split('\n')
      .find((line) => line.startsWith('data: '));

    await reader.cancel();

    if (!dataLine) {
      throw new Error('Planner stream did not emit a data line.');
    }

    return JSON.parse(dataLine.slice('data: '.length)) as {
      runId: string | null;
      runStatus: string | null;
      steps: Array<{ title: string; status: string }>;
      terminal: boolean;
    };
  }

  throw new Error('Planner stream closed before emitting an event.');
}

function requireCookie(setCookieHeader: string | null) {
  if (!setCookieHeader) {
    throw new Error('Missing set-cookie header from login response.');
  }
  return setCookieHeader.split(';', 1)[0] ?? '';
}

function buildSeedStructuredDoc() {
  return {
    projectTitle: '雨夜机械猫',
    episodeTitle: '第一集',
    episodeCount: 1,
    pointCost: 38,
    summaryBullets: ['机械猫在雨夜追查失落记忆。'],
    highlights: [{ title: '追逐', description: '用雨夜和霓虹建立悬疑氛围。' }],
    styleBullets: ['赛博雨夜，电影感。'],
    subjectBullets: ['机械猫：冷静、敏锐。'],
    subjects: [{ entityKey: 'subject-seed', title: '机械猫', prompt: '雨夜中的机械猫', generatedAssetIds: ['asset-seed-subject'] }],
    sceneBullets: ['霓虹巷口。'],
    scenes: [{ entityKey: 'scene-seed', title: '霓虹巷口', prompt: '霓虹雨夜巷口', generatedAssetIds: ['asset-seed-scene'] }],
    scriptSummary: ['1 个场景，1 个主体，1 个分镜。'],
    acts: [
      {
        title: '第一幕',
        time: '夜',
        location: '霓虹巷口',
        shots: [
          {
            entityKey: 'shot-seed',
            title: '分镜01-1',
            visual: '机械猫在雨夜巷口停下脚步',
            composition: '中景',
            motion: '推镜',
            voice: '旁白',
            line: '它知道记忆就在这里。',
            targetModelFamilySlug: 'ark-seedance-2-video',
            generatedAssetIds: ['asset-seed-shot'],
          },
        ],
      },
    ],
  } satisfies Prisma.InputJsonValue;
}

async function seedPlannerState(args: {
  userId: string;
  projectId: string;
  episodeId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const textProvider = await tx.modelProvider.upsert({
      where: { code: 'smoke-text-provider' },
      update: {
        name: 'Smoke Text Provider',
        providerType: 'PROXY',
        baseUrl: apiUrl('/mock/text'),
        enabled: true,
      },
      create: {
        code: 'smoke-text-provider',
        name: 'Smoke Text Provider',
        providerType: 'PROXY',
        baseUrl: apiUrl('/mock/text'),
        enabled: true,
      },
    });
    const textFamily = await tx.modelFamily.upsert({
      where: { slug: 'smoke-text-family' },
      update: {
        name: 'Smoke Text Family',
        modelKind: 'TEXT',
      },
      create: {
        slug: 'smoke-text-family',
        name: 'Smoke Text Family',
        modelKind: 'TEXT',
      },
    });
    const textEndpoint = await tx.modelEndpoint.upsert({
      where: { slug: 'smoke-text-endpoint' },
      update: {
        familyId: textFamily.id,
        providerId: textProvider.id,
        remoteModelKey: 'smoke-text-model',
        label: 'Smoke Text Model',
        status: 'ACTIVE',
        priority: 1,
        isDefault: true,
      },
      create: {
        familyId: textFamily.id,
        providerId: textProvider.id,
        slug: 'smoke-text-endpoint',
        remoteModelKey: 'smoke-text-model',
        label: 'Smoke Text Model',
        status: 'ACTIVE',
        priority: 1,
        isDefault: true,
      },
    });
    const plannerAgent = await tx.plannerAgentProfile.upsert({
      where: { slug: 'smoke-planner-agent' },
      update: {
        contentType: '短剧漫剧',
        displayName: 'Smoke Planner Agent',
        description: 'Planner debug/apply smoke agent',
        defaultSystemPrompt: '你是一个用于 smoke 的策划 agent。',
        defaultDeveloperPrompt: '输出合法 JSON。',
        defaultStepDefinitionsJson: [
          {
            id: 'step-1',
            title: '拆解需求',
            status: 'done',
            details: ['识别主体、场景与分镜需求'],
          },
        ] as Prisma.InputJsonValue,
        enabled: true,
        status: 'ACTIVE',
      },
      create: {
        slug: 'smoke-planner-agent',
        contentType: '短剧漫剧',
        displayName: 'Smoke Planner Agent',
        description: 'Planner debug/apply smoke agent',
        defaultSystemPrompt: '你是一个用于 smoke 的策划 agent。',
        defaultDeveloperPrompt: '输出合法 JSON。',
        defaultStepDefinitionsJson: [
          {
            id: 'step-1',
            title: '拆解需求',
            status: 'done',
            details: ['识别主体、场景与分镜需求'],
          },
        ] as Prisma.InputJsonValue,
        enabled: true,
        status: 'ACTIVE',
      },
    });
    const plannerSubAgent = await tx.plannerSubAgentProfile.upsert({
      where: { slug: 'smoke-planner-dialogue' },
      update: {
        agentProfileId: plannerAgent.id,
        subtype: '对话剧情',
        displayName: 'Smoke Dialogue Agent',
        description: 'Planner debug/apply smoke sub-agent',
        systemPromptOverride: '保持输出稳定，便于 smoke 验证。',
        developerPromptOverride: '优先输出 refinement assistant package。',
        stepDefinitionsJson: [
          {
            id: 'step-1',
            title: '整理剧情',
            status: 'done',
            details: ['基于输入上下文补齐 refinement 文档'],
          },
        ] as Prisma.InputJsonValue,
        enabled: true,
        status: 'ACTIVE',
      },
      create: {
        agentProfileId: plannerAgent.id,
        slug: 'smoke-planner-dialogue',
        subtype: '对话剧情',
        displayName: 'Smoke Dialogue Agent',
        description: 'Planner debug/apply smoke sub-agent',
        systemPromptOverride: '保持输出稳定，便于 smoke 验证。',
        developerPromptOverride: '优先输出 refinement assistant package。',
        stepDefinitionsJson: [
          {
            id: 'step-1',
            title: '整理剧情',
            status: 'done',
            details: ['基于输入上下文补齐 refinement 文档'],
          },
        ] as Prisma.InputJsonValue,
        enabled: true,
        status: 'ACTIVE',
      },
    });
    const imageProvider = await tx.modelProvider.upsert({
      where: { code: 'smoke-image-provider' },
      update: {
        name: 'Smoke Image Provider',
        providerType: 'PROXY',
        baseUrl: apiUrl('/mock/image'),
        enabled: true,
      },
      create: {
        code: 'smoke-image-provider',
        name: 'Smoke Image Provider',
        providerType: 'PROXY',
        baseUrl: apiUrl('/mock/image'),
        enabled: true,
      },
    });
    const imageFamily = await tx.modelFamily.upsert({
      where: { slug: 'smoke-image-family' },
      update: {
        name: 'Smoke Image Family',
        modelKind: 'IMAGE',
      },
      create: {
        slug: 'smoke-image-family',
        name: 'Smoke Image Family',
        modelKind: 'IMAGE',
      },
    });
    const imageEndpoint = await tx.modelEndpoint.upsert({
      where: { slug: 'smoke-image-endpoint' },
      update: {
        familyId: imageFamily.id,
        providerId: imageProvider.id,
        remoteModelKey: 'smoke-image-model',
        label: 'Smoke Image Model',
        status: 'ACTIVE',
        priority: 1,
        isDefault: true,
      },
      create: {
        familyId: imageFamily.id,
        providerId: imageProvider.id,
        slug: 'smoke-image-endpoint',
        remoteModelKey: 'smoke-image-model',
        label: 'Smoke Image Model',
        status: 'ACTIVE',
        priority: 1,
        isDefault: true,
      },
    });
    await tx.userProviderConfig.upsert({
      where: {
        userId_providerId: {
          userId: args.userId,
          providerId: textProvider.id,
        },
      },
      update: {
        apiKey: 'smoke-text-key',
        baseUrlOverride: textProvider.baseUrl,
        enabled: true,
      },
      create: {
        userId: args.userId,
        providerId: textProvider.id,
        apiKey: 'smoke-text-key',
        baseUrlOverride: textProvider.baseUrl,
        enabled: true,
      },
    });
    await tx.userProviderConfig.upsert({
      where: {
        userId_providerId: {
          userId: args.userId,
          providerId: imageProvider.id,
        },
      },
      update: {
        apiKey: 'smoke-image-key',
        baseUrlOverride: imageProvider.baseUrl,
        enabled: true,
      },
      create: {
        userId: args.userId,
        providerId: imageProvider.id,
        apiKey: 'smoke-image-key',
        baseUrlOverride: imageProvider.baseUrl,
        enabled: true,
      },
    });

    await tx.modelFamily.upsert({
      where: { slug: 'ark-seedance-2-video' },
      update: {
        name: 'ARK Seedance 2.0 Video',
        modelKind: 'VIDEO',
        capabilityJson: {
          supportsMultiShot: true,
          maxShotsPerGeneration: 6,
          timestampMeaning: 'narrative-hint',
          audioDescStyle: 'inline',
          referenceImageSupport: 'full',
          maxReferenceImages: 9,
          maxReferenceVideos: 3,
          maxReferenceAudios: 3,
          cameraVocab: 'chinese',
          maxDurationSeconds: 15,
          maxResolution: '2K',
          promptStyle: 'narrative',
        } as Prisma.InputJsonValue,
      },
      create: {
        slug: 'ark-seedance-2-video',
        name: 'ARK Seedance 2.0 Video',
        modelKind: 'VIDEO',
        capabilityJson: {
          supportsMultiShot: true,
          maxShotsPerGeneration: 6,
          timestampMeaning: 'narrative-hint',
          audioDescStyle: 'inline',
          referenceImageSupport: 'full',
          maxReferenceImages: 9,
          maxReferenceVideos: 3,
          maxReferenceAudios: 3,
          cameraVocab: 'chinese',
          maxDurationSeconds: 15,
          maxResolution: '2K',
          promptStyle: 'narrative',
        } as Prisma.InputJsonValue,
      },
    });

    const existingPlannerSession = await tx.plannerSession.findFirst({
      where: {
        projectId: args.projectId,
        episodeId: args.episodeId,
        isActive: true,
      },
    });

    const plannerSession = existingPlannerSession
      ? await tx.plannerSession.update({
          where: { id: existingPlannerSession.id },
          data: {
            status: 'READY',
            isActive: true,
            outlineConfirmedAt: new Date(),
          },
        })
      : await tx.plannerSession.create({
          data: {
            projectId: args.projectId,
            episodeId: args.episodeId,
            status: 'READY',
            isActive: true,
            outlineConfirmedAt: new Date(),
            createdById: args.userId,
          },
        });

    await tx.episode.update({
      where: { id: args.episodeId },
      data: {
        activePlannerSessionId: plannerSession.id,
      },
    });

    const refinement = await tx.plannerRefinementVersion.create({
      data: {
        plannerSessionId: plannerSession.id,
        versionNumber: 1,
        triggerType: 'confirm_outline',
        status: 'READY',
        documentTitle: '雨夜机械猫',
        structuredDocJson: buildSeedStructuredDoc(),
        isActive: true,
        createdById: args.userId,
      },
    });

    const subjectAsset = await tx.asset.create({
      data: {
        ownerUserId: args.userId,
        projectId: args.projectId,
        episodeId: args.episodeId,
        mediaKind: 'IMAGE',
        sourceKind: 'GENERATED',
        fileName: 'subject-seed.png',
        sourceUrl: apiUrl('/uploads/generated/subject-seed.png'),
      },
    });
    const sceneAsset = await tx.asset.create({
      data: {
        ownerUserId: args.userId,
        projectId: args.projectId,
        episodeId: args.episodeId,
        mediaKind: 'IMAGE',
        sourceKind: 'GENERATED',
        fileName: 'scene-seed.png',
        sourceUrl: apiUrl('/uploads/generated/scene-seed.png'),
      },
    });
    const shotAsset = await tx.asset.create({
      data: {
        ownerUserId: args.userId,
        projectId: args.projectId,
        episodeId: args.episodeId,
        mediaKind: 'IMAGE',
        sourceKind: 'GENERATED',
        fileName: 'shot-seed.png',
        sourceUrl: apiUrl('/uploads/generated/shot-seed.png'),
      },
    });
    const replacementSubjectAsset = await tx.asset.create({
      data: {
        ownerUserId: args.userId,
        projectId: args.projectId,
        episodeId: args.episodeId,
        mediaKind: 'IMAGE',
        sourceKind: 'GENERATED',
        fileName: 'subject-replacement.png',
        sourceUrl: apiUrl('/uploads/generated/subject-replacement.png'),
      },
    });

    const subject = await tx.plannerSubject.create({
      data: {
        refinementVersionId: refinement.id,
        name: '机械猫',
        role: '主角',
        appearance: '银灰色机械猫，雨夜反光金属外壳',
        prompt: '银灰色机械猫，雨夜，霓虹反光',
        generatedAssetIdsJson: [subjectAsset.id] as Prisma.InputJsonValue,
        sortOrder: 1,
        editable: true,
      },
    });
    const scene = await tx.plannerScene.create({
      data: {
        refinementVersionId: refinement.id,
        name: '霓虹巷口',
        time: '夜',
        locationType: 'outdoor',
        description: '雨夜中的霓虹巷口',
        prompt: '霓虹雨夜巷口，潮湿地面反光',
        generatedAssetIdsJson: [sceneAsset.id] as Prisma.InputJsonValue,
        sortOrder: 1,
        editable: true,
      },
    });
    const shot = await tx.plannerShotScript.create({
      data: {
        refinementVersionId: refinement.id,
        sceneId: scene.id,
        actKey: 'act-1',
        actTitle: '第一幕',
        shotNo: '分镜01-1',
        title: '分镜01-1',
        targetModelFamilySlug: 'ark-seedance-2-video',
        visualDescription: '机械猫在雨夜巷口停下脚步',
        composition: '中景',
        cameraMotion: '推镜',
        voiceRole: '旁白',
        dialogue: '它知道记忆就在这里。',
        generatedAssetIdsJson: [shotAsset.id] as Prisma.InputJsonValue,
        sortOrder: 1,
      },
    });

    const seedRun = await tx.run.create({
      data: {
        projectId: args.projectId,
        episodeId: args.episodeId,
        runType: 'PLANNER_DOC_UPDATE',
        resourceType: 'planner_session',
        resourceId: plannerSession.id,
        status: 'COMPLETED',
        executorType: 'SYSTEM_WORKER',
        outputJson: {
          structuredDoc: buildSeedStructuredDoc(),
        } as Prisma.InputJsonValue,
        finishedAt: new Date(),
      },
    });

    await syncPlannerRefinementProjection({
      db: tx,
      refinementVersionId: refinement.id,
    });

    return {
      plannerSessionId: plannerSession.id,
      refinementVersionId: refinement.id,
      subjectId: subject.id,
      sceneId: scene.id,
      shotId: shot.id,
      seedRunId: seedRun.id,
      replacementSubjectAssetId: replacementSubjectAsset.id,
      textModelFamilySlug: textFamily.slug,
      textModelEndpointSlug: textEndpoint.slug,
      imageModelFamilySlug: imageFamily.slug,
      imageModelEndpointSlug: imageEndpoint.slug,
      debugAgentContentType: plannerAgent.contentType,
      debugSubAgentId: plannerSubAgent.id,
      debugSubAgentSubtype: plannerSubAgent.subtype,
    };
  });
}

async function main() {
  await assertDatabaseReady();

  const health = await fetch(`${apiBaseUrl}/health`);
  if (!health.ok) {
    throw new Error(`API server is not reachable at ${apiBaseUrl}.`);
  }

  await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      displayName: 'Planner Refactor Smoke',
    }),
  });

  const login = await request<{ id: string; email: string }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  const cookie = requireCookie(login.setCookie);

  const createdProject = await request<{
    projectId: string;
    project: { id: string };
  }>('/api/studio/projects', {
    method: 'POST',
    cookie,
    body: JSON.stringify({
      prompt: '雨夜中的机械猫追查失落记忆',
      contentMode: 'single',
      creationConfig: {
        selectedTab: '短剧漫剧',
        selectedSubtype: '对话剧情',
        settings: {
          multiEpisode: false,
          targetVideoModelFamilySlug: 'ark-seedance-2-video',
        },
      },
    }),
  });

  const projectDetail = await request<{
    id: string;
    currentEpisodeId: string | null;
    episodes: Array<{ id: string }>;
  }>(`/api/studio/projects/${createdProject.data.projectId}`, { cookie });
  const episodeId = projectDetail.data.currentEpisodeId ?? projectDetail.data.episodes[0]?.id;
  if (!episodeId) {
    throw new Error('Missing episode id.');
  }

  const seeded = await seedPlannerState({
    userId: login.data.id,
    projectId: createdProject.data.projectId,
    episodeId,
  });

  const beforeUpdate = await request<{
    activeRefinement: {
      id: string;
      structuredDoc: {
        subjects: Array<{ entityKey?: string; generatedAssetIds?: string[]; title: string }>;
        acts: Array<{ shots: Array<{ targetModelFamilySlug?: string }> }>;
      } | null;
    } | null;
  }>(`/api/projects/${createdProject.data.projectId}/planner/workspace?episodeId=${episodeId}`, { cookie });
  assert.equal(beforeUpdate.data.activeRefinement?.structuredDoc?.subjects[0]?.entityKey, seeded.subjectId);
  assert.equal(beforeUpdate.data.activeRefinement?.structuredDoc?.acts[0]?.shots[0]?.targetModelFamilySlug, 'ark-seedance-2-video');

  await request(`/api/projects/${createdProject.data.projectId}/planner/document`, {
    method: 'PUT',
    cookie,
    body: JSON.stringify({
      episodeId,
      structuredDoc: {
        projectTitle: '雨夜机械猫·改名版',
        episodeTitle: '第一集·追忆',
        episodeCount: 1,
        pointCost: 38,
        summaryBullets: ['机械猫在雨夜继续追查失落记忆。'],
        highlights: [{ title: '追逐升级', description: '节奏更紧，灯光更冷。' }],
        styleBullets: ['赛博雨夜，电影感。'],
        subjectBullets: ['机械猫：更孤独、更警觉。'],
        subjects: [
          {
            entityKey: seeded.subjectId,
            title: '机械猫·改名',
            prompt: '银灰色机械猫，雨夜，霓虹反光，警觉',
            generatedAssetIds: beforeUpdate.data.activeRefinement?.structuredDoc?.subjects[0]?.generatedAssetIds ?? [],
          },
        ],
        sceneBullets: ['霓虹巷口，雨更大。'],
        scenes: [
          {
            entityKey: seeded.sceneId,
            title: '霓虹巷口·改名',
            prompt: '霓虹雨夜巷口，潮湿地面反光，风更强',
            generatedAssetIds: ['placeholder-scene'],
          },
        ],
        scriptSummary: ['1 个场景，1 个主体，1 个分镜。'],
        acts: [
          {
            title: '第一幕',
            time: '夜',
            location: '霓虹巷口·改名',
            shots: [
              {
                entityKey: seeded.shotId,
                title: '分镜01-1·改名',
                visual: '机械猫在更猛烈的雨夜停下脚步',
                composition: '近景',
                motion: '推镜',
                voice: '旁白',
                line: '它离真相更近了。',
                targetModelFamilySlug: 'ark-seedance-2-video',
                generatedAssetIds: ['placeholder-shot'],
              },
            ],
          },
        ],
      },
    }),
  });

  const subjectAfterRename = await prisma.plannerSubject.findUnique({
    where: { id: seeded.subjectId },
    select: {
      generatedAssetIdsJson: true,
    },
  });
  assert.deepEqual(subjectAfterRename?.generatedAssetIdsJson, beforeUpdate.data.activeRefinement?.structuredDoc?.subjects[0]?.generatedAssetIds);

  await request(`/api/projects/${createdProject.data.projectId}/planner/subjects/${seeded.subjectId}/assets`, {
    method: 'PUT',
    cookie,
    body: JSON.stringify({
      episodeId,
      generatedAssetIds: [seeded.replacementSubjectAssetId],
    }),
  });

  const afterAssetUpdate = await request<{
    activeRefinement: {
      id: string;
      structuredDoc: {
        subjects: Array<{ entityKey?: string; generatedAssetIds?: string[] }>;
        acts: Array<{ shots: Array<{ targetModelFamilySlug?: string }> }>;
      } | null;
      shotScripts: Array<{ targetModelFamilySlug?: string | null }>;
    } | null;
  }>(`/api/projects/${createdProject.data.projectId}/planner/workspace?episodeId=${episodeId}`, { cookie });
  assert.deepEqual(afterAssetUpdate.data.activeRefinement?.structuredDoc?.subjects[0]?.generatedAssetIds, [seeded.replacementSubjectAssetId]);
  assert.equal(afterAssetUpdate.data.activeRefinement?.structuredDoc?.acts[0]?.shots[0]?.targetModelFamilySlug, 'ark-seedance-2-video');
  assert.equal(afterAssetUpdate.data.activeRefinement?.shotScripts[0]?.targetModelFamilySlug, 'ark-seedance-2-video');

  await request(`/api/projects/${createdProject.data.projectId}/planner/document`, {
    method: 'PUT',
    cookie,
    body: JSON.stringify({
      episodeId,
      structuredDoc: {
        ...readObject(afterAssetUpdate.data.activeRefinement?.structuredDoc),
        subjects: [
          {
            ...readObject(afterAssetUpdate.data.activeRefinement?.structuredDoc?.subjects?.[0]),
            generatedAssetIds: [seeded.replacementSubjectAssetId],
          },
        ],
      },
    }),
  });

  const afterResave = await request<{
    activeRefinement: {
      id: string;
      structuredDoc: {
        subjects: Array<{ entityKey?: string; generatedAssetIds?: string[] }>;
      } | null;
      subjects: Array<{ id: string; generatedAssetIds: string[] }>;
      scenes: Array<{ id: string }>;
      shotScripts: Array<{ id: string }>;
    } | null;
  }>(`/api/projects/${createdProject.data.projectId}/planner/workspace?episodeId=${episodeId}`, { cookie });
  assert.equal(afterResave.data.activeRefinement?.id, afterAssetUpdate.data.activeRefinement?.id);
  assert.deepEqual(afterResave.data.activeRefinement?.structuredDoc?.subjects[0]?.generatedAssetIds, [seeded.replacementSubjectAssetId]);
  assert.deepEqual(afterResave.data.activeRefinement?.subjects[0]?.generatedAssetIds, [seeded.replacementSubjectAssetId]);
  assert.equal(afterResave.data.activeRefinement?.subjects[0]?.id, seeded.subjectId);
  assert.equal(afterResave.data.activeRefinement?.scenes[0]?.id, seeded.sceneId);
  assert.equal(afterResave.data.activeRefinement?.shotScripts[0]?.id, seeded.shotId);

  await request(`/api/projects/${createdProject.data.projectId}/planner/shot-scripts/${seeded.shotId}`, {
    method: 'PATCH',
    cookie,
    body: JSON.stringify({
      episodeId,
      title: '分镜01-1·实体改写',
      visualDescription: '机械猫在暴雨中抬头，霓虹在瞳孔中抖动',
      composition: '特写',
      cameraMotion: '缓慢推镜',
      voiceRole: '旁白',
      dialogue: '它终于看见了记忆的入口。',
    }),
  });

  const afterShotPatch = await request<{
    activeRefinement: {
      structuredDoc: {
        acts: Array<{ shots: Array<{ entityKey?: string; title: string; generatedAssetIds?: string[] }> }>;
      } | null;
      shotScripts: Array<{ id: string; title: string; generatedAssetIds: string[] }>;
    } | null;
  }>(`/api/projects/${createdProject.data.projectId}/planner/workspace?episodeId=${episodeId}`, { cookie });
  assert.equal(afterShotPatch.data.activeRefinement?.shotScripts[0]?.id, seeded.shotId);
  assert.equal(afterShotPatch.data.activeRefinement?.shotScripts[0]?.title, '分镜01-1·实体改写');
  assert.equal(afterShotPatch.data.activeRefinement?.structuredDoc?.acts[0]?.shots[0]?.entityKey, seeded.shotId);
  assert.deepEqual(afterShotPatch.data.activeRefinement?.structuredDoc?.acts[0]?.shots[0]?.generatedAssetIds, ['placeholder-shot']);

  const generateDoc = await request<{ run: { id: string; status: string } }>(`/api/projects/${createdProject.data.projectId}/planner/generate-doc`, {
    method: 'POST',
    cookie,
    body: JSON.stringify({
      episodeId,
      prompt: '把第一幕细化得更有镜头层次。',
      modelFamily: seeded.textModelFamilySlug,
      modelEndpoint: seeded.textModelEndpointSlug,
    }),
  });

  const queuedRun = await prisma.run.findFirst({
    where: {
      projectId: createdProject.data.projectId,
      episodeId,
      resourceType: 'planner_session',
      runType: 'PLANNER_DOC_UPDATE',
      status: 'QUEUED',
    },
    orderBy: { createdAt: 'desc' },
    select: {
      inputJson: true,
    },
  });
  assert.ok(queuedRun, 'Expected a queued planner run after generate-doc.');
  const queuedRunInput =
    queuedRun?.inputJson && typeof queuedRun.inputJson === 'object' && !Array.isArray(queuedRun.inputJson)
      ? (queuedRun.inputJson as Record<string, unknown>)
      : {};
  assert.equal(queuedRunInput.targetVideoModelFamilySlug, 'ark-seedance-2-video');
  assert.match(String(queuedRunInput.prompt ?? ''), /目标视频模型能力摘要/);

  const queuedStreamEvent = await readFirstPlannerStreamEvent(
    `/api/projects/${createdProject.data.projectId}/planner/stream?episodeId=${episodeId}&runId=${generateDoc.data.run.id}`,
    cookie,
  );
  assert.equal(queuedStreamEvent.runId, generateDoc.data.run.id);
  assert.equal(queuedStreamEvent.runStatus, 'queued');
  assert.equal(queuedStreamEvent.terminal, false);
  assert.ok(queuedStreamEvent.steps.length > 0);
  assert.equal(queuedStreamEvent.steps[0]?.status, 'waiting');

  const rerun = await request<{ run: { id: string; status: string } }>(
    `/api/projects/${createdProject.data.projectId}/planner/partial-rerun`,
    {
      method: 'POST',
      cookie,
      body: JSON.stringify({
        episodeId,
        rerunScope: {
          type: 'shot',
          shotIds: [seeded.shotId],
        },
        prompt: '保持主体和场景不变，重写这个分镜的动作节奏。',
        modelFamily: seeded.textModelFamilySlug,
        modelEndpoint: seeded.textModelEndpointSlug,
      }),
    },
  );
  assert.equal(rerun.data.run.status.toLowerCase(), 'queued');

  const rerunRun = await prisma.run.findUnique({
    where: { id: rerun.data.run.id },
    select: {
      inputJson: true,
    },
  });
  const rerunScope = rerunRun?.inputJson && typeof rerunRun.inputJson === 'object' && !Array.isArray(rerunRun.inputJson)
    ? (rerunRun.inputJson as Record<string, unknown>).rerunScope as Record<string, unknown> | undefined
    : undefined;
  assert.equal(rerunScope?.type, 'shot');
  assert.deepEqual(rerunScope?.shotIds, [seeded.shotId]);
  const rerunInput =
    rerunRun?.inputJson && typeof rerunRun.inputJson === 'object' && !Array.isArray(rerunRun.inputJson)
      ? (rerunRun.inputJson as Record<string, unknown>)
      : {};
  assert.equal(rerunInput.targetVideoModelFamilySlug, 'ark-seedance-2-video');
  assert.match(String(rerunInput.prompt ?? ''), /目标视频模型能力摘要/);

  const actRerun = await request<{ run: { id: string; status: string } }>(
    `/api/projects/${createdProject.data.projectId}/planner/partial-rerun`,
    {
      method: 'POST',
      cookie,
      body: JSON.stringify({
        episodeId,
        rerunScope: {
          type: 'act',
          actId: 'act-1',
        },
        prompt: '重排第一幕的镜头节奏，但不要改动主角设定。',
        modelFamily: seeded.textModelFamilySlug,
        modelEndpoint: seeded.textModelEndpointSlug,
      }),
    },
  );
  assert.equal(actRerun.data.run.status.toLowerCase(), 'queued');

  const actRerunRun = await prisma.run.findUnique({
    where: { id: actRerun.data.run.id },
    select: {
      inputJson: true,
    },
  });
  const actRerunScope = actRerunRun?.inputJson && typeof actRerunRun.inputJson === 'object' && !Array.isArray(actRerunRun.inputJson)
    ? (actRerunRun.inputJson as Record<string, unknown>).rerunScope as Record<string, unknown> | undefined
    : undefined;
  assert.equal(actRerunScope?.type, 'act');
  assert.equal(actRerunScope?.actId, 'act-1');

  const shotPrompts = await request<{
    prompts: Array<{ mode: 'multi-shot' | 'single-shot'; shotIds: string[]; promptText: string }>;
    model: { familySlug: string; summary: string };
  }>(`/api/projects/${createdProject.data.projectId}/planner/shot-prompts?episodeId=${episodeId}&modelSlug=ark-seedance-2-video`, { cookie });
  assert.equal(shotPrompts.data.model.familySlug, 'ark-seedance-2-video');
  assert.equal(shotPrompts.data.prompts.length, 1);
  assert.equal(shotPrompts.data.prompts[0]?.mode, 'multi-shot');
  assert.deepEqual(shotPrompts.data.prompts[0]?.shotIds, [seeded.shotId]);
  assert.match(shotPrompts.data.model.summary, /多镜头叙事/);

  const shotImageRun = await request<{ run: { id: string; status: string } }>(
    `/api/projects/${createdProject.data.projectId}/planner/shot-scripts/${seeded.shotId}/generate-image`,
    {
      method: 'POST',
      cookie,
      body: JSON.stringify({
        episodeId,
        prompt: '为这个分镜生成一张新的故事板草图。',
        modelFamily: seeded.imageModelFamilySlug,
        modelEndpoint: seeded.imageModelEndpointSlug,
      }),
    },
  );
  assert.equal(shotImageRun.data.run.status.toLowerCase(), 'queued');

  const plannerShotImageRun = await prisma.run.update({
    where: { id: shotImageRun.data.run.id },
    data: {
      status: 'RUNNING',
      providerStatus: 'succeeded',
      outputJson: {
        providerData: {
          url: tinyPngDataUrl,
        },
      } as Prisma.InputJsonValue,
    },
  });
  const finalizedPlannerShotImageRun = await finalizeGeneratedRun(plannerShotImageRun, 'IMAGE');
  assert.equal(finalizedPlannerShotImageRun.action, 'processed');
  assert.ok(finalizedPlannerShotImageRun.assetId);

  const afterShotImageGeneration = await request<{
    activeRefinement: {
      id: string;
      structuredDoc: {
        acts: Array<{ shots: Array<{ entityKey?: string; generatedAssetIds?: string[] }> }>;
      } | null;
      shotScripts: Array<{ id: string; generatedAssetIds: string[] }>;
    } | null;
  }>(`/api/projects/${createdProject.data.projectId}/planner/workspace?episodeId=${episodeId}`, { cookie });
  assert.equal(afterShotImageGeneration.data.activeRefinement?.shotScripts[0]?.id, seeded.shotId);
  assert.ok(afterShotImageGeneration.data.activeRefinement?.shotScripts[0]?.generatedAssetIds.includes(finalizedPlannerShotImageRun.assetId!));
  assert.ok(afterShotImageGeneration.data.activeRefinement?.structuredDoc?.acts[0]?.shots[0]?.generatedAssetIds?.includes(finalizedPlannerShotImageRun.assetId!));

  const debugRun = await request<{
    debugRunId: string;
    executionMode: 'live' | 'fallback';
    input: {
      projectId: string | null;
      episodeId: string | null;
    };
  }>('/api/planner/debug/run', {
    method: 'POST',
    cookie,
    body: JSON.stringify({
      subAgentId: seeded.debugSubAgentId,
      contentType: seeded.debugAgentContentType,
      subtype: seeded.debugSubAgentSubtype,
      configSource: 'draft',
      targetStage: 'refinement',
      partialRerunScope: 'none',
      projectId: createdProject.data.projectId,
      episodeId,
      projectTitle: '调试应用版项目',
      episodeTitle: '调试应用版第一集',
      userPrompt: '请把当前策划改写成更适合调试 apply 验证的版本。',
      currentStructuredDoc: afterShotImageGeneration.data.activeRefinement?.structuredDoc,
      plannerAssets: [
        {
          id: finalizedPlannerShotImageRun.assetId!,
          sourceUrl: tinyPngDataUrl,
          sourceKind: 'generated',
        },
      ],
      modelFamily: seeded.textModelFamilySlug,
      modelEndpoint: seeded.textModelEndpointSlug,
    }),
  });
  assert.equal(debugRun.data.input.projectId, createdProject.data.projectId);
  assert.equal(debugRun.data.input.episodeId, episodeId);

  const appliedDebugRun = await request<{
    debugRunId: string;
    refinementVersionId: string;
    plannerSessionId: string;
    projectId: string;
    episodeId: string;
  }>(`/api/planner/debug/runs/${debugRun.data.debugRunId}/apply`, {
    method: 'POST',
    cookie,
  });
  assert.equal(appliedDebugRun.data.debugRunId, debugRun.data.debugRunId);
  assert.equal(appliedDebugRun.data.projectId, createdProject.data.projectId);
  assert.equal(appliedDebugRun.data.episodeId, episodeId);

  const afterDebugApplyWorkspace = await request<{
    plannerSession: { id: string } | null;
    activeRefinement: {
      id: string;
      triggerType: string;
      debugApplySource?: {
        debugRunId: string | null;
        appliedAt: string | null;
      } | null;
      documentTitle: string;
      structuredDoc: {
        projectTitle: string;
        episodeTitle: string;
      } | null;
    } | null;
  }>(`/api/projects/${createdProject.data.projectId}/planner/workspace?episodeId=${episodeId}`, { cookie });
  assert.equal(afterDebugApplyWorkspace.data.plannerSession?.id, appliedDebugRun.data.plannerSessionId);
  assert.equal(afterDebugApplyWorkspace.data.activeRefinement?.id, appliedDebugRun.data.refinementVersionId);
  assert.equal(afterDebugApplyWorkspace.data.activeRefinement?.triggerType, 'debug_apply');
  assert.equal(afterDebugApplyWorkspace.data.activeRefinement?.debugApplySource?.debugRunId, debugRun.data.debugRunId);
  assert.equal(afterDebugApplyWorkspace.data.activeRefinement?.structuredDoc?.projectTitle, '调试应用版项目');
  assert.equal(afterDebugApplyWorkspace.data.activeRefinement?.structuredDoc?.episodeTitle, '调试应用版第一集');

  const appliedRefinementRecord = await prisma.plannerRefinementVersion.findUnique({
    where: { id: appliedDebugRun.data.refinementVersionId },
    select: {
      triggerType: true,
      sourceRefinementVersionId: true,
      inputSnapshotJson: true,
      messages: {
        orderBy: { createdAt: 'asc' },
        select: {
          messageType: true,
          contentJson: true,
        },
      },
    },
  });
  assert.equal(appliedRefinementRecord?.triggerType, 'debug_apply');
  assert.equal(appliedRefinementRecord?.sourceRefinementVersionId, seeded.refinementVersionId);
  const appliedInputSnapshot = readObject(appliedRefinementRecord?.inputSnapshotJson);
  assert.equal(appliedInputSnapshot.appliedFromDebugRunId, debugRun.data.debugRunId);
  const appliedReceipt = appliedRefinementRecord?.messages.find((message) => message.messageType === 'ASSISTANT_DOCUMENT_RECEIPT');
  assert.equal(readObject(appliedReceipt?.contentJson).debugRunId, debugRun.data.debugRunId);

  const finalizedPlannerShotImageRunRecord = await prisma.run.findUnique({
    where: { id: shotImageRun.data.run.id },
    select: {
      status: true,
      outputJson: true,
    },
  });
  const finalizedPlannerShotImageRunOutput = readObject(finalizedPlannerShotImageRunRecord?.outputJson);
  assert.equal(finalizedPlannerShotImageRunRecord?.status, 'COMPLETED');
  assert.equal(finalizedPlannerShotImageRunOutput.assetId, finalizedPlannerShotImageRun.assetId);

  const refinementToActivate = await prisma.$transaction(async (tx) => {
    const sourceRefinement = await tx.plannerRefinementVersion.findUniqueOrThrow({
      where: { id: seeded.refinementVersionId },
      select: {
        plannerSessionId: true,
        createdById: true,
      },
    });
    const nextVersionNumber =
      (
        await tx.plannerRefinementVersion.aggregate({
          where: {
            plannerSessionId: sourceRefinement.plannerSessionId,
          },
          _max: {
            versionNumber: true,
          },
        })
      )._max.versionNumber ?? 0;

    const activatedDoc = {
      projectTitle: '雨夜机械猫·激活版',
      episodeTitle: '第一集·激活版',
      episodeCount: 1,
      pointCost: 38,
      summaryBullets: ['切换到另一份 refinement 版本。'],
      highlights: [{ title: '激活测试', description: '验证版本切换后 projection 与 workspace 同步。' }],
      styleBullets: ['冷色霓虹，压迫感更强。'],
      subjectBullets: ['机械猫：激活版设定。'],
      subjects: [
        {
          title: '机械猫·激活版',
          prompt: '机械猫激活版，冷色霓虹，湿润金属外壳',
          generatedAssetIds: [seeded.replacementSubjectAssetId],
        },
      ],
      sceneBullets: ['高压霓虹巷口。'],
      scenes: [
        {
          title: '霓虹巷口·激活版',
          prompt: '高压霓虹雨夜巷口，冷色灯光',
          generatedAssetIds: ['placeholder-scene'],
        },
      ],
      scriptSummary: ['激活版 refinement。'],
      acts: [
        {
          title: '第一幕·激活版',
          time: '深夜',
          location: '霓虹巷口·激活版',
          shots: [
            {
              title: '分镜01-1·激活版',
              visual: '机械猫在高压霓虹中停住，积水里倒映破碎广告屏',
              composition: '中近景',
              motion: '缓慢推镜',
              voice: '旁白',
              line: '版本已经切换。',
              targetModelFamilySlug: 'ark-seedance-2-video',
              generatedAssetIds: ['placeholder-shot'],
            },
          ],
        },
      ],
    } satisfies Prisma.InputJsonValue;

    const created = await tx.plannerRefinementVersion.create({
      data: {
        plannerSessionId: sourceRefinement.plannerSessionId,
        versionNumber: nextVersionNumber + 1,
        triggerType: 'follow_up',
        status: 'READY',
        documentTitle: '雨夜机械猫·激活版',
        structuredDocJson: activatedDoc,
        isActive: false,
        createdById: sourceRefinement.createdById,
      },
      select: { id: true },
    });

    await syncPlannerRefinementDerivedData({
      db: tx,
      refinementVersionId: created.id,
      structuredDoc: activatedDoc as unknown as {
        projectTitle: string;
        episodeTitle: string;
        episodeCount: number;
        pointCost: number;
        summaryBullets: string[];
        highlights: Array<{ title: string; description: string }>;
        styleBullets: string[];
        subjectBullets: string[];
        subjects: Array<Record<string, unknown>>;
        sceneBullets: string[];
        scenes: Array<Record<string, unknown>>;
        scriptSummary: string[];
        acts: Array<Record<string, unknown>>;
      },
      previousProjection: null,
    });

    await syncPlannerRefinementProjection({
      db: tx,
      refinementVersionId: created.id,
    });

    return created.id;
  });

  await request(`/api/projects/${createdProject.data.projectId}/planner/refinement-versions/${refinementToActivate}/activate`, {
    method: 'POST',
    cookie,
    body: JSON.stringify({
      episodeId,
    }),
  });

  const afterActivate = await request<{
    activeRefinement: {
      id: string;
      structuredDoc: {
        projectTitle: string;
        acts: Array<{ shots: Array<{ entityKey?: string; title: string }> }>;
      } | null;
      shotScripts: Array<{ id: string; title: string }>;
    } | null;
  }>(`/api/projects/${createdProject.data.projectId}/planner/workspace?episodeId=${episodeId}`, { cookie });
  assert.equal(afterActivate.data.activeRefinement?.id, refinementToActivate);
  assert.equal(afterActivate.data.activeRefinement?.structuredDoc?.projectTitle, '雨夜机械猫·激活版');
  assert.ok(afterActivate.data.activeRefinement?.structuredDoc?.acts[0]?.shots[0]?.entityKey);
  assert.ok(afterActivate.data.activeRefinement?.shotScripts[0]?.id);
  assert.equal(afterActivate.data.activeRefinement?.shotScripts[0]?.title, '分镜01-1·激活版');

  const latestRunAfterActivate = await prisma.run.findFirst({
    where: {
      projectId: createdProject.data.projectId,
      episodeId,
      resourceType: 'planner_session',
      runType: 'PLANNER_DOC_UPDATE',
    },
    orderBy: { createdAt: 'desc' },
    select: {
      outputJson: true,
    },
  });
  const latestRunOutput = readObject(latestRunAfterActivate?.outputJson);
  const latestRunStructuredDoc = readObject(latestRunOutput.structuredDoc);
  assert.equal(latestRunStructuredDoc.projectTitle, '雨夜机械猫·激活版');

  await prisma.plannerRefinementVersion.update({
    where: { id: refinementToActivate },
    data: {
      isConfirmed: true,
      confirmedAt: new Date(),
    },
  });

  await requestExpectError(
    `/api/projects/${createdProject.data.projectId}/planner/document`,
    'PLANNER_REFINEMENT_LOCKED',
    {
      method: 'PUT',
      cookie,
      body: JSON.stringify({
        episodeId,
        structuredDoc: {
          ...readObject(afterActivate.data.activeRefinement?.structuredDoc),
          projectTitle: '不应直接改写确认版本',
        },
      }),
    },
  );

  const draftCopy = await request<{
    refinementVersionId: string;
    sourceRefinementVersionId: string;
  }>(`/api/projects/${createdProject.data.projectId}/planner/refinement-versions/${refinementToActivate}/create-draft`, {
    method: 'POST',
    cookie,
    body: JSON.stringify({
      episodeId,
    }),
  });
  assert.equal(draftCopy.data.sourceRefinementVersionId, refinementToActivate);

  const afterDraftCopy = await request<{
    activeRefinement: {
      id: string;
      sourceRefinementVersionId?: string | null;
      isConfirmed: boolean;
      structuredDoc: {
        projectTitle: string;
      } | null;
    } | null;
  }>(`/api/projects/${createdProject.data.projectId}/planner/workspace?episodeId=${episodeId}`, { cookie });
  assert.equal(afterDraftCopy.data.activeRefinement?.id, draftCopy.data.refinementVersionId);
  assert.equal(afterDraftCopy.data.activeRefinement?.sourceRefinementVersionId, refinementToActivate);
  assert.equal(afterDraftCopy.data.activeRefinement?.isConfirmed, false);

  await request(`/api/projects/${createdProject.data.projectId}/planner/document`, {
    method: 'PUT',
    cookie,
    body: JSON.stringify({
      episodeId,
      structuredDoc: {
        ...readObject(afterDraftCopy.data.activeRefinement?.structuredDoc),
        projectTitle: '确认版草稿副本已接管修改',
      },
    }),
  });

  const afterDraftEdit = await request<{
    activeRefinement: {
      id: string;
      sourceRefinementVersionId?: string | null;
      structuredDoc: {
        projectTitle: string;
      } | null;
    } | null;
    refinementVersions: Array<{
      id: string;
      sourceRefinementVersionId?: string | null;
    }>;
  }>(`/api/projects/${createdProject.data.projectId}/planner/workspace?episodeId=${episodeId}`, { cookie });
  assert.equal(afterDraftEdit.data.activeRefinement?.id, draftCopy.data.refinementVersionId);
  assert.equal(afterDraftEdit.data.activeRefinement?.structuredDoc?.projectTitle, '确认版草稿副本已接管修改');
  assert.equal(afterDraftEdit.data.activeRefinement?.sourceRefinementVersionId, refinementToActivate);
  assert.ok(afterDraftEdit.data.refinementVersions.some((version) => version.id === refinementToActivate));
  assert.ok(afterDraftEdit.data.refinementVersions.some((version) => version.id === draftCopy.data.refinementVersionId));

  const draftShotScript = await prisma.plannerShotScript.findFirst({
    where: {
      refinementVersionId: draftCopy.data.refinementVersionId,
    },
    orderBy: {
      sortOrder: 'asc',
    },
    select: {
      id: true,
    },
  });
  assert.ok(draftShotScript);

  const finalizeResult = await request<{
    refinementVersionId: string;
    targetVideoModelFamilySlug: string;
    finalizedShotCount: number;
    finalizedAt: string;
  }>(`/api/projects/${createdProject.data.projectId}/planner/finalize`, {
    method: 'POST',
    cookie,
    body: JSON.stringify({
      episodeId,
    }),
  });
  assert.equal(finalizeResult.data.refinementVersionId, draftCopy.data.refinementVersionId);
  assert.equal(finalizeResult.data.targetVideoModelFamilySlug, 'ark-seedance-2-video');
  assert.equal(finalizeResult.data.finalizedShotCount, 1);

  const creationWorkspace = await request<{
    project: { status: string };
    episode: { status: string };
    shots: Array<{
      id: string;
      title: string;
      motionPrompt: string;
      targetVideoModelFamilySlug: string | null;
      promptJson: Record<string, unknown> | null;
      materialBindings: Array<{ id: string }>;
      finalizedAt: string | null;
    }>;
  }>(`/api/projects/${createdProject.data.projectId}/creation/workspace?episodeId=${episodeId}`, { cookie });
  assert.equal(creationWorkspace.data.project.status, 'ready_for_storyboard');
  assert.equal(creationWorkspace.data.episode.status, 'ready_for_storyboard');
  assert.equal(creationWorkspace.data.shots.length, 1);
  assert.equal(creationWorkspace.data.shots[0]?.title, '分镜01-1·激活版');
  assert.equal(creationWorkspace.data.shots[0]?.targetVideoModelFamilySlug, 'ark-seedance-2-video');
  assert.ok(creationWorkspace.data.shots[0]?.motionPrompt.includes('机械猫在高压霓虹中停住'));
  assert.ok(creationWorkspace.data.shots[0]?.promptJson);
  assert.equal(creationWorkspace.data.shots[0]?.promptJson?.plannerShotScriptId, draftShotScript?.id);
  assert.ok(creationWorkspace.data.shots[0]?.materialBindings.some((asset) => asset.id === seeded.replacementSubjectAssetId));
  assert.ok(creationWorkspace.data.shots[0]?.finalizedAt);

  await request(`/api/projects/${createdProject.data.projectId}/planner/finalize`, {
    method: 'POST',
    cookie,
    body: JSON.stringify({
      episodeId,
    }),
  });

  const shotsAfterSecondFinalize = await prisma.shot.findMany({
    where: {
      episodeId,
    },
    orderBy: {
      sequenceNo: 'asc',
    },
    select: {
      id: true,
      plannerRefinementVersionId: true,
      plannerShotScriptId: true,
    },
  });
  assert.equal(shotsAfterSecondFinalize.length, 1);
  assert.equal(shotsAfterSecondFinalize[0]?.plannerRefinementVersionId, draftCopy.data.refinementVersionId);
  assert.equal(shotsAfterSecondFinalize[0]?.plannerShotScriptId, draftShotScript?.id);

  console.log('[smoke-planner-api-refactor] ok');
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    console.error(`[smoke-planner-api-refactor] failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
