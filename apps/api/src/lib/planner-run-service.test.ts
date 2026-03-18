import assert from 'node:assert/strict';
import test from 'node:test';

import { parseVideoModelCapability } from './model-capability.js';
import { __testables } from './planner-run-service.js';

function buildOwnedEpisode() {
  return {
    id: 'episode-1',
    title: '第1集',
    summary: '这是剧情概要',
    project: {
      id: 'project-1',
      title: '项目A',
      contentMode: 'serial',
    },
  };
}

function buildPlannerSession(outlineConfirmedAt: Date | null) {
  return {
    id: 'session-1',
    status: 'IDLE' as const,
    createdAt: new Date('2026-03-17T00:00:00.000Z'),
    updatedAt: new Date('2026-03-17T00:00:00.000Z'),
    createdById: 'user-1',
    projectId: 'project-1',
    episodeId: 'episode-1',
    isActive: true,
    outlineConfirmedAt,
  };
}

function buildUserMessage() {
  return {
    id: 'message-1',
    createdAt: new Date('2026-03-17T00:00:00.000Z'),
    createdById: 'user-1',
    plannerSessionId: 'session-1',
    outlineVersionId: null,
    refinementVersionId: null,
    role: 'USER' as const,
    messageType: 'PROMPT' as const,
    contentJson: { text: 'prompt' },
  };
}

function buildPromptPackage() {
  return {
    promptText: 'planner prompt',
    stepDefinitions: [{ id: 'step-1', title: 'Step 1' }],
    promptSnapshot: {
      systemPrompt: 'system',
      developerPrompt: 'developer',
      userPrompt: 'user',
    },
  };
}

test('findOrCreateActivePlannerSessionWithDeps reuses existing active session or creates one', async () => {
  const existing = await __testables.findOrCreateActivePlannerSessionWithDeps(
    'project-1',
    'episode-1',
    'user-1',
    {
      prisma: {
        plannerSession: {
          findFirst: async () => ({ id: 'session-1', status: 'IDLE' }),
          create: async () => {
            throw new Error('should not create');
          },
        },
        episode: {
          update: async () => {
            throw new Error('should not update episode');
          },
        },
      } as never,
    },
  );
  assert.equal(existing.id, 'session-1');

  let updatedEpisodeId: string | null = null;
  const created = await __testables.findOrCreateActivePlannerSessionWithDeps(
    'project-1',
    'episode-1',
    'user-1',
    {
      prisma: {
        plannerSession: {
          findFirst: async () => null,
          create: async () => ({ id: 'session-2', status: 'IDLE' }),
        },
        episode: {
          update: async ({ where }: { where: { id: string } }) => {
            updatedEpisodeId = where.id;
            return null;
          },
        },
      } as never,
    },
  );
  assert.equal(created.id, 'session-2');
  assert.equal(updatedEpisodeId, 'episode-1');
});

test('queuePlannerGenerateDocRunWithDeps returns early failure states', async () => {
  const missingEpisode = await __testables.queuePlannerGenerateDocRunWithDeps(
    {
      projectId: 'project-1',
      episodeId: 'episode-1',
      userId: 'user-1',
    },
    {
      findOwnedEpisode: async () => null,
      resolveUserDefaultModelSelection: async () => null,
      resolveModelSelection: async () => null,
      findOrCreateActivePlannerSession: async () => {
        throw new Error('should not create session');
      },
      resolvePlannerAgentSelection: async () => null,
      resolvePlannerTargetVideoModel: async () => null,
      resolveProviderRuntimeConfigForUser: async () => ({
        providerCode: 'ark',
        baseUrl: 'https://ark.example.com',
        apiKey: 'secret',
        enabled: true,
        ownerUserId: 'user-1',
      }),
      buildPlannerGenerationPrompt: () => buildPromptPackage() as never,
      createPlannerUserMessage: async () => buildUserMessage() as never,
      prisma: {} as never,
    },
  );
  assert.deepEqual(missingEpisode, { ok: false, error: 'NOT_FOUND' });

  const missingModel = await __testables.queuePlannerGenerateDocRunWithDeps(
    {
      projectId: 'project-1',
      episodeId: 'episode-1',
      userId: 'user-1',
    },
    {
      findOwnedEpisode: async () => buildOwnedEpisode() as never,
      resolveUserDefaultModelSelection: async () => null,
      resolveModelSelection: async () => null,
      findOrCreateActivePlannerSession: async () => {
        throw new Error('should not create session');
      },
      resolvePlannerAgentSelection: async () => null,
      resolvePlannerTargetVideoModel: async () => null,
      resolveProviderRuntimeConfigForUser: async () => ({
        providerCode: 'ark',
        baseUrl: 'https://ark.example.com',
        apiKey: 'secret',
        enabled: true,
        ownerUserId: 'user-1',
      }),
      buildPlannerGenerationPrompt: () => buildPromptPackage() as never,
      createPlannerUserMessage: async () => buildUserMessage() as never,
      prisma: {} as never,
    },
  );
  assert.deepEqual(missingModel, { ok: false, error: 'MODEL_NOT_FOUND' });
});

test('queuePlannerGenerateDocRunWithDeps returns PLANNER_AGENT_NOT_CONFIGURED when selection fails', async () => {
  const result = await __testables.queuePlannerGenerateDocRunWithDeps(
    {
      projectId: 'project-1',
      episodeId: 'episode-1',
      userId: 'user-1',
      prompt: '生成策划',
    },
    {
      findOwnedEpisode: async () => buildOwnedEpisode() as never,
      resolveUserDefaultModelSelection: async () => ({ familySlug: 'doubao', endpointSlug: 'doubao-default' }),
      resolveModelSelection: async () => ({
        family: { id: 'family-1', slug: 'doubao', name: 'Doubao' },
        provider: { id: 'provider-1', code: 'ark', name: 'Ark', providerType: 'OFFICIAL' },
        endpoint: { id: 'endpoint-1', slug: 'doubao-default', label: 'Doubao', remoteModelKey: 'doubao' },
      } as never),
      findOrCreateActivePlannerSession: async () => buildPlannerSession(null),
      resolvePlannerAgentSelection: async () => null,
      resolvePlannerTargetVideoModel: async () => null,
      resolveProviderRuntimeConfigForUser: async () => ({
        providerCode: 'ark',
        baseUrl: 'https://ark.example.com',
        apiKey: 'secret',
        enabled: true,
        ownerUserId: 'user-1',
      }),
      buildPlannerGenerationPrompt: () => buildPromptPackage() as never,
      createPlannerUserMessage: async () => buildUserMessage() as never,
      prisma: {
        projectCreationConfig: { findUnique: async () => null },
        plannerMessage: { findMany: async () => [] },
        plannerOutlineVersion: { findFirst: async () => null },
        plannerRefinementVersion: { findFirst: async () => null },
        $transaction: async () => {
          throw new Error('should not create run');
        },
        plannerSession: {} as never,
        episode: {} as never,
      } as never,
    },
  );

  assert.deepEqual(result, { ok: false, error: 'PLANNER_AGENT_NOT_CONFIGURED' });
});

test('queuePlannerGenerateDocRunWithDeps returns PROVIDER_NOT_CONFIGURED when text provider is unavailable', async () => {
  const result = await __testables.queuePlannerGenerateDocRunWithDeps(
    {
      projectId: 'project-1',
      episodeId: 'episode-1',
      userId: 'user-1',
      prompt: '生成策划',
    },
    {
      findOwnedEpisode: async () => buildOwnedEpisode() as never,
      resolveUserDefaultModelSelection: async () => ({ familySlug: 'doubao', endpointSlug: 'doubao-default' }),
      resolveModelSelection: async () => ({
        family: { id: 'family-1', slug: 'doubao', name: 'Doubao' },
        provider: { id: 'provider-1', code: 'ark', name: 'Ark', providerType: 'OFFICIAL', baseUrl: 'https://ark.example.com' },
        endpoint: { id: 'endpoint-1', slug: 'doubao-default', label: 'Doubao', remoteModelKey: 'doubao' },
      } as never),
      findOrCreateActivePlannerSession: async () => {
        throw new Error('should not create session');
      },
      resolvePlannerAgentSelection: async () => {
        throw new Error('should not resolve planner agent');
      },
      resolvePlannerTargetVideoModel: async () => null,
      resolveProviderRuntimeConfigForUser: async () => ({
        providerCode: 'ark',
        baseUrl: 'https://ark.example.com',
        apiKey: null,
        enabled: true,
        ownerUserId: 'user-1',
      }),
      buildPlannerGenerationPrompt: () => buildPromptPackage() as never,
      createPlannerUserMessage: async () => buildUserMessage() as never,
      prisma: {} as never,
    },
  );

  assert.deepEqual(result, { ok: false, error: 'PROVIDER_NOT_CONFIGURED' });
});

test('queuePlannerGenerateDocRunWithDeps builds outline and refinement trigger types correctly', async () => {
  const recordedInput: Array<Record<string, unknown>> = [];
  const makeDeps = (outlineConfirmedAt: Date | null, outline: Record<string, unknown> | null, refinement: Record<string, unknown> | null) => ({
    findOwnedEpisode: async () => buildOwnedEpisode() as never,
    resolveUserDefaultModelSelection: async () => ({ familySlug: 'doubao', endpointSlug: 'doubao-default' }),
    resolveModelSelection: async () => ({
      family: { id: 'family-1', slug: 'doubao', name: 'Doubao' },
      provider: { id: 'provider-1', code: 'ark', name: 'Ark', providerType: 'OFFICIAL' },
      endpoint: { id: 'endpoint-1', slug: 'doubao-default', label: 'Doubao', remoteModelKey: 'doubao' },
    } as never),
    findOrCreateActivePlannerSession: async () => buildPlannerSession(outlineConfirmedAt),
    resolvePlannerAgentSelection: async () => ({
      contentType: '短剧漫剧',
      subtype: '对话剧情',
      agentProfile: { id: 'agent-1', slug: 'agent', displayName: 'Agent', defaultSystemPrompt: 'system', defaultDeveloperPrompt: null, defaultStepDefinitionsJson: [] },
      subAgentProfile: { id: 'sub-1', slug: 'sub', displayName: 'Sub', systemPromptOverride: null, developerPromptOverride: null, stepDefinitionsJson: [] },
    } as never),
    resolvePlannerTargetVideoModel: async () => ({
      familyId: 'family-seedance-2-0',
      familySlug: 'seedance-2-0',
      familyName: 'Seedance 2.0',
      summary: 'multi-shot',
      capability: parseVideoModelCapability({
        supportsMultiShot: true,
        maxShotsPerGeneration: 6,
        timestampMeaning: 'narrative-hint',
        audioDescStyle: 'inline',
        referenceImageSupport: 'character',
        maxReferenceImages: 1,
        maxReferenceVideos: 0,
        maxReferenceAudios: 0,
        cameraVocab: 'english-cinematic',
        maxDurationSeconds: 10,
        maxResolution: '1080p',
        promptStyle: 'narrative',
        qualityNote: 'multi-shot',
        knownIssues: [],
        integrationStatus: 'active',
      }, 'seedance-2-0'),
    }),
    buildPlannerGenerationPrompt: () => buildPromptPackage() as never,
    resolveProviderRuntimeConfigForUser: async () => ({
      providerCode: 'ark',
      baseUrl: 'https://ark.example.com',
      apiKey: 'secret',
      enabled: true,
      ownerUserId: 'user-1',
    }),
    createPlannerUserMessage: async () => buildUserMessage() as never,
    prisma: {
      projectCreationConfig: { findUnique: async () => ({ selectedTab: '短剧漫剧', selectedSubtype: '对话剧情', scriptContent: null, scriptSourceName: null, settingsJson: null, subjectProfile: null, stylePreset: null, imageModelEndpoint: null }) },
      plannerMessage: { findMany: async () => [] },
      plannerOutlineVersion: { findFirst: async () => outline },
      plannerRefinementVersion: { findFirst: async () => refinement },
      $transaction: async (callback: (tx: any) => Promise<unknown>) =>
        callback({
          plannerSession: { update: async () => null },
          run: {
            create: async ({ data }: { data: Record<string, unknown> }) => {
              recordedInput.push(data.inputJson as Record<string, unknown>);
              return { id: `run-${recordedInput.length}` };
            },
          },
        }),
      plannerSession: {} as never,
      episode: {} as never,
    } as never,
  });

  const outlineResult = await __testables.queuePlannerGenerateDocRunWithDeps(
    { projectId: 'project-1', episodeId: 'episode-1', userId: 'user-1' },
    makeDeps(null, null, null),
  );
  assert.equal(outlineResult.ok, true);
  assert.equal(outlineResult.ok && outlineResult.targetStage, 'outline');
  assert.equal(recordedInput[0]?.['triggerType'], 'generate_outline');

  const refinementResult = await __testables.queuePlannerGenerateDocRunWithDeps(
    { projectId: 'project-1', episodeId: 'episode-1', userId: 'user-1' },
    makeDeps(new Date('2026-03-17T00:00:00.000Z'), { id: 'outline-1', versionNumber: 1, outlineDocJson: { summary: 'outline' } }, { id: 'ref-1', versionNumber: 2, structuredDocJson: { summary: 'refinement' } }),
  );
  assert.equal(refinementResult.ok, true);
  assert.equal(refinementResult.ok && refinementResult.targetStage, 'refinement');
  assert.equal(recordedInput[1]?.['triggerType'], 'follow_up');
  assert.equal(recordedInput[1]?.['targetVideoModelFamilySlug'], 'seedance-2-0');
});
