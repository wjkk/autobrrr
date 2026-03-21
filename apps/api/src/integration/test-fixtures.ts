import { randomUUID } from 'node:crypto';

import type { FastifyInstance } from 'fastify';

import { env } from '../lib/env.js';
import { hashPassword } from '../lib/password.js';
import { prisma } from '../lib/prisma.js';
import { hashSessionToken } from '../lib/session.js';

interface IntegrationFixture {
  scope: string;
  cookie: string;
  userId: string;
  projectId: string;
  episodeId: string;
  shotId: string;
  providerId: string;
  familyId: string;
  endpointId: string;
  endpointSlug: string;
  familySlug: string;
  cleanup: () => Promise<void>;
}

interface PlannerIntegrationFixture {
  scope: string;
  cookie: string;
  userId: string;
  projectId: string;
  episodeId: string;
  providerId: string;
  familyId: string;
  endpointId: string;
  endpointSlug: string;
  familySlug: string;
  agentProfileId: string;
  subAgentProfileId: string;
  cleanup: () => Promise<void>;
}

interface PlannerAssetFixture extends PlannerIntegrationFixture {
  plannerSessionId: string;
  refinementVersionId: string;
  subjectId: string;
  imageFamilyId: string;
  imageEndpointId: string;
}

async function createSessionCookie(userId: string) {
  const token = randomUUID().replace(/-/g, '');
  await prisma.userSession.create({
    data: {
      userId,
      sessionTokenHash: hashSessionToken(token),
      expiresAt: new Date(Date.now() + env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000),
    },
  });
  return `${env.SESSION_COOKIE_NAME}=${token}`;
}

export async function createCreationVideoFixture(): Promise<IntegrationFixture> {
  const scope = `phase-d-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const email = `${scope}@example.com`;
  const familySlug = `${scope}-video-family`;
  const endpointSlug = `${scope}-video-endpoint`;
  const providerCode = `${scope}-provider`;

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: hashPassword('password123'),
      displayName: 'Phase D',
      status: 'ACTIVE',
    },
  });

  const provider = await prisma.modelProvider.create({
    data: {
      code: providerCode,
      name: `${scope} provider`,
      providerType: 'PROXY',
      baseUrl: 'https://example.com/mock-provider',
      enabled: true,
    },
  });

  const family = await prisma.modelFamily.create({
    data: {
      slug: familySlug,
      name: `${scope} video family`,
      modelKind: 'VIDEO',
    },
  });

  const endpoint = await prisma.modelEndpoint.create({
    data: {
      familyId: family.id,
      providerId: provider.id,
      slug: endpointSlug,
      remoteModelKey: `${scope}-video-model`,
      label: `${scope} video model`,
      status: 'ACTIVE',
      priority: 1,
      isDefault: true,
    },
  });

  const project = await prisma.project.create({
    data: {
      title: `${scope} project`,
      createdById: user.id,
      status: 'READY_FOR_STORYBOARD',
      contentMode: 'SINGLE',
    },
  });

  const episode = await prisma.episode.create({
    data: {
      projectId: project.id,
      episodeNo: 1,
      title: `${scope} episode`,
      summary: 'integration test episode',
      status: 'READY_FOR_STORYBOARD',
    },
  });

  await prisma.project.update({
    where: { id: project.id },
    data: { currentEpisodeId: episode.id },
  });

  const shot = await prisma.shot.create({
    data: {
      projectId: project.id,
      episodeId: episode.id,
      sequenceNo: 1,
      title: `${scope} shot`,
      subtitleText: 'subtitle',
      narrationText: 'narration',
      imagePrompt: '雨夜中的猫',
      motionPrompt: '机械猫在雨夜巷口奔跑',
      status: 'PENDING',
      targetVideoModelFamilySlug: family.slug,
      promptJson: {
        plannerShotScriptId: `${scope}-planner-shot-script`,
      },
      materialBindingsJson: [],
    },
  });

  const cookie = await createSessionCookie(user.id);

  return {
    scope,
    cookie,
    userId: user.id,
    projectId: project.id,
    episodeId: episode.id,
    shotId: shot.id,
    providerId: provider.id,
    familyId: family.id,
    endpointId: endpoint.id,
    endpointSlug,
    familySlug,
    cleanup: async () => {
      await prisma.externalApiCallLog.deleteMany({
        where: {
          OR: [
            { userId: user.id },
            { projectId: project.id },
          ],
        },
      });
      await prisma.run.deleteMany({ where: { projectId: project.id } });
      await prisma.shotVersion.deleteMany({ where: { projectId: project.id } });
      await prisma.asset.deleteMany({ where: { projectId: project.id } });
      await prisma.shot.deleteMany({ where: { projectId: project.id } });
      await prisma.episode.deleteMany({ where: { projectId: project.id } });
      await prisma.project.deleteMany({ where: { id: project.id } });
      await prisma.userSession.deleteMany({ where: { userId: user.id } });
      await prisma.user.deleteMany({ where: { id: user.id } });
      await prisma.modelEndpoint.deleteMany({ where: { id: endpoint.id } });
      await prisma.modelFamily.deleteMany({ where: { id: family.id } });
      await prisma.modelProvider.deleteMany({ where: { id: provider.id } });
    },
  };
}

export async function createPlannerOutlineFixture(): Promise<PlannerIntegrationFixture> {
  const scope = `phase-d-planner-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const email = `${scope}@example.com`;
  const familySlug = `${scope}-text-family`;
  const endpointSlug = `${scope}-text-endpoint`;
  const providerCode = `${scope}-provider`;

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: hashPassword('password123'),
      displayName: 'Phase D Planner',
      status: 'ACTIVE',
    },
  });

  const provider = await prisma.modelProvider.create({
    data: {
      code: providerCode,
      name: `${scope} provider`,
      providerType: 'PROXY',
      baseUrl: 'https://example.com/mock-provider',
      enabled: true,
    },
  });

  const family = await prisma.modelFamily.create({
    data: {
      slug: familySlug,
      name: `${scope} text family`,
      modelKind: 'TEXT',
    },
  });

  const endpoint = await prisma.modelEndpoint.create({
    data: {
      familyId: family.id,
      providerId: provider.id,
      slug: endpointSlug,
      remoteModelKey: `${scope}-text-model`,
      label: `${scope} text model`,
      status: 'ACTIVE',
      priority: 1,
      isDefault: true,
    },
  });

  await prisma.userProviderConfig.create({
    data: {
      userId: user.id,
      providerId: provider.id,
      apiKey: 'test-key',
      baseUrlOverride: 'https://example.com/mock-provider',
      enabled: true,
    },
  });

  const agentProfile = await prisma.plannerAgentProfile.create({
    data: {
      slug: `${scope}-agent`,
      contentType: '短剧漫剧',
      displayName: `${scope} agent`,
      description: 'Phase D planner integration agent',
      defaultSystemPrompt: '你是一个用于测试的策划 agent。',
      defaultDeveloperPrompt: '输出合法 JSON。',
      defaultStepDefinitionsJson: [
        {
          id: 'step-1',
          title: '拆解需求',
          status: 'done',
          details: ['完成'],
        },
      ],
      enabled: true,
      version: 1,
      status: 'ACTIVE',
      publishedAt: new Date(),
    },
  });

  const subAgentProfile = await prisma.plannerSubAgentProfile.create({
    data: {
      agentProfileId: agentProfile.id,
      slug: `${scope}-sub-agent`,
      subtype: '悬疑',
      displayName: `${scope} writer`,
      description: 'Phase D planner integration writer',
      systemPromptOverride: '聚焦剧情推进。',
      developerPromptOverride: '保持输出结构稳定。',
      stepDefinitionsJson: [
        {
          id: 'step-1',
          title: '拆解需求',
          status: 'done',
          details: ['完成'],
        },
      ],
      enabled: true,
      version: 1,
      status: 'ACTIVE',
      publishedAt: new Date(),
    },
  });

  const project = await prisma.project.create({
    data: {
      title: `${scope} project`,
      createdById: user.id,
      status: 'DRAFT',
      contentMode: 'SINGLE',
    },
  });

  const episode = await prisma.episode.create({
    data: {
      projectId: project.id,
      episodeNo: 1,
      title: `${scope} episode`,
      summary: '待生成策划',
      status: 'DRAFT',
    },
  });

  await prisma.project.update({
    where: { id: project.id },
    data: { currentEpisodeId: episode.id },
  });

  const cookie = await createSessionCookie(user.id);

  return {
    scope,
    cookie,
    userId: user.id,
    projectId: project.id,
    episodeId: episode.id,
    providerId: provider.id,
    familyId: family.id,
    endpointId: endpoint.id,
    endpointSlug,
    familySlug,
    agentProfileId: agentProfile.id,
    subAgentProfileId: subAgentProfile.id,
    cleanup: async () => {
      await prisma.externalApiCallLog.deleteMany({
        where: {
          OR: [
            { userId: user.id },
            { projectId: project.id },
          ],
        },
      });
      await prisma.run.deleteMany({ where: { projectId: project.id } });
      await prisma.plannerMessage.deleteMany({ where: { plannerSession: { projectId: project.id } } });
      await prisma.plannerStepAnalysis.deleteMany({ where: { refinementVersion: { plannerSession: { projectId: project.id } } } });
      await prisma.plannerShotScript.deleteMany({ where: { refinementVersion: { plannerSession: { projectId: project.id } } } });
      await prisma.plannerScene.deleteMany({ where: { refinementVersion: { plannerSession: { projectId: project.id } } } });
      await prisma.plannerSubject.deleteMany({ where: { refinementVersion: { plannerSession: { projectId: project.id } } } });
      await prisma.plannerRefinementVersion.deleteMany({ where: { plannerSession: { projectId: project.id } } });
      await prisma.plannerOutlineVersion.deleteMany({ where: { plannerSession: { projectId: project.id } } });
      await prisma.plannerSession.deleteMany({ where: { projectId: project.id } });
      await prisma.projectCreationConfig.deleteMany({ where: { projectId: project.id } });
      await prisma.episode.deleteMany({ where: { projectId: project.id } });
      await prisma.project.deleteMany({ where: { id: project.id } });
      await prisma.userProviderConfig.deleteMany({ where: { userId: user.id } });
      await prisma.userSession.deleteMany({ where: { userId: user.id } });
      await prisma.user.deleteMany({ where: { id: user.id } });
      await prisma.plannerSubAgentProfile.deleteMany({ where: { id: subAgentProfile.id } });
      await prisma.plannerAgentProfile.deleteMany({ where: { id: agentProfile.id } });
      await prisma.modelEndpoint.deleteMany({ where: { id: endpoint.id } });
      await prisma.modelFamily.deleteMany({ where: { id: family.id } });
      await prisma.modelProvider.deleteMany({ where: { id: provider.id } });
    },
  };
}

export async function createPlannerAssetFixture(): Promise<PlannerAssetFixture> {
  const base = await createPlannerOutlineFixture();
  const imageFamily = await prisma.modelFamily.create({
    data: {
      slug: `${base.scope}-image-family`,
      name: `${base.scope} image family`,
      modelKind: 'IMAGE',
    },
  });
  const imageEndpoint = await prisma.modelEndpoint.create({
    data: {
      familyId: imageFamily.id,
      providerId: base.providerId,
      slug: `${base.scope}-image-endpoint`,
      remoteModelKey: `${base.scope}-image-model`,
      label: `${base.scope} image model`,
      status: 'ACTIVE',
      priority: 1,
      isDefault: true,
    },
  });

  const plannerSession = await prisma.plannerSession.create({
    data: {
      projectId: base.projectId,
      episodeId: base.episodeId,
      status: 'READY',
      isActive: true,
      outlineConfirmedAt: new Date(),
      createdById: base.userId,
    },
  });

  await prisma.episode.update({
    where: { id: base.episodeId },
    data: {
      activePlannerSessionId: plannerSession.id,
      status: 'PLANNING',
    },
  });

  await prisma.project.update({
    where: { id: base.projectId },
    data: {
      status: 'PLANNING',
    },
  });

  const refinementVersion = await prisma.plannerRefinementVersion.create({
    data: {
      plannerSessionId: plannerSession.id,
      agentProfileId: base.agentProfileId,
      subAgentProfileId: base.subAgentProfileId,
      versionNumber: 1,
      triggerType: 'generate_doc',
      status: 'READY',
      documentTitle: '资产生成测试',
      structuredDocJson: {
        projectTitle: '资产生成测试项目',
        episodeTitle: '第1集',
        episodeCount: 1,
        pointCost: 12,
        summaryBullets: ['主体图生成闭环测试'],
        highlights: [],
        styleBullets: [],
        subjectBullets: ['林夏：夜色中的女学生侦探'],
        subjects: [{ entityType: 'subject', title: '林夏', prompt: '夜色中的女学生侦探，冷静敏锐' }],
        sceneBullets: ['老旧档案室，冷色荧光灯'],
        scenes: [{ entityType: 'scene', title: '档案室', prompt: '老旧档案室，夜晚，冷色荧光灯' }],
        scriptSummary: ['1 个场景，1 个主体，1 个分镜'],
        acts: [{
          title: '第一幕',
          time: '夜',
          location: '档案室',
          shots: [{
            title: '分镜01-1',
            visual: '林夏推开档案室铁门',
            composition: '中景',
            motion: '推镜',
            voice: '旁白',
            line: '她知道答案就在门后。',
          }],
        }],
      },
      isActive: true,
      isConfirmed: false,
      createdById: base.userId,
    },
  });

  const subject = await prisma.plannerSubject.create({
    data: {
      refinementVersionId: refinementVersion.id,
      name: '林夏',
      role: '主角',
      appearance: '短发，学生装',
      personality: '敏锐谨慎',
      prompt: '夜色中的女学生侦探，冷静敏锐',
      negativePrompt: null,
      referenceAssetIdsJson: [],
      generatedAssetIdsJson: [],
      sortOrder: 1,
      editable: true,
    },
  });

  const scene = await prisma.plannerScene.create({
    data: {
      refinementVersionId: refinementVersion.id,
      name: '档案室',
      time: '夜',
      locationType: 'interior',
      description: '老旧档案室，冷色荧光灯。',
      prompt: '老旧档案室，夜晚，冷色荧光灯',
      negativePrompt: null,
      referenceAssetIdsJson: [],
      generatedAssetIdsJson: [],
      sortOrder: 1,
      editable: true,
    },
  });

  await prisma.plannerShotScript.create({
    data: {
      refinementVersionId: refinementVersion.id,
      sceneId: scene.id,
      actKey: 'act-1',
      actTitle: '第一幕',
      shotNo: '01-1',
      title: '分镜01-1',
      durationSeconds: 4,
      targetModelFamilySlug: null,
      visualDescription: '林夏推开档案室铁门',
      composition: '中景',
      cameraMotion: '推镜',
      voiceRole: '旁白',
      dialogue: '她知道答案就在门后。',
      subjectBindingsJson: [],
      referenceAssetIdsJson: [],
      generatedAssetIdsJson: [],
      sortOrder: 1,
    },
  });

  return {
    ...base,
    familyId: imageFamily.id,
    endpointId: imageEndpoint.id,
    familySlug: `${base.scope}-image-family`,
    endpointSlug: `${base.scope}-image-endpoint`,
    plannerSessionId: plannerSession.id,
    refinementVersionId: refinementVersion.id,
    subjectId: subject.id,
    imageFamilyId: imageFamily.id,
    imageEndpointId: imageEndpoint.id,
    cleanup: async () => {
      await prisma.modelEndpoint.deleteMany({ where: { id: imageEndpoint.id } });
      await prisma.modelFamily.deleteMany({ where: { id: imageFamily.id } });
      await base.cleanup();
    },
  };
}

export async function queueVideoRunViaApi(app: FastifyInstance, fixture: IntegrationFixture) {
  const response = await app.inject({
    method: 'POST',
    url: `/api/projects/${fixture.projectId}/shots/${fixture.shotId}/generate-video`,
    headers: {
      cookie: fixture.cookie,
    },
    payload: {
      prompt: '把这个镜头生成 6 秒视频，保持雨夜追逐氛围。',
      modelFamily: fixture.familySlug,
      modelEndpoint: fixture.endpointSlug,
      durationSeconds: 6,
      aspectRatio: '16:9',
      resolution: '720p',
    },
  });

  return response;
}
