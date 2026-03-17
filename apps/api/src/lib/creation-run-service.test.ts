import assert from 'node:assert/strict';
import test from 'node:test';

import { __testables } from './creation-run-service.js';

function buildOwnedShot() {
  return {
    id: 'shot-1',
    projectId: 'project-1',
    episodeId: 'episode-1',
    sequenceNo: 1,
    title: '分镜一',
    subtitleText: '',
    narrationText: '',
    imagePrompt: '图像提示词',
    motionPrompt: '动作提示词',
    promptJson: null,
    targetVideoModelFamilySlug: 'seedance-2-0',
    materialBindingsJson: null,
    plannerRefinementVersionId: null,
    plannerShotScriptId: null,
    finalizedAt: null,
    status: 'PENDING' as const,
    activeVersionId: null,
    createdAt: new Date('2026-03-17T00:00:00.000Z'),
    updatedAt: new Date('2026-03-17T00:00:00.000Z'),
    episode: {
      id: 'episode-1',
      status: 'CREATING' as const,
      title: '第1集',
      episodeNo: 1,
    },
    activeVersion: null,
  };
}

test('queueShotGenerationRunWithDeps returns NOT_FOUND when shot is not owned', async () => {
  const result = await __testables.queueShotGenerationRunWithDeps(
    {
      projectId: 'project-1',
      shotId: 'shot-1',
      userId: 'user-1',
      runType: 'VIDEO_GENERATION',
      modelKind: 'VIDEO',
      promptField: 'motionPrompt',
      referenceAssetIds: [],
    },
    {
      findOwnedShot: async () => null,
      resolveUserDefaultModelSelection: async () => {
        throw new Error('should not read defaults');
      },
      resolveModelSelection: async () => {
        throw new Error('should not resolve model');
      },
      prisma: {
        $transaction: async () => {
          throw new Error('should not create run');
        },
      } as never,
    },
  );

  assert.deepEqual(result, { ok: false, error: 'NOT_FOUND' });
});

test('queueShotGenerationRunWithDeps prefers explicit model selection over shot/default fallbacks', async () => {
  let selectionInput: Record<string, unknown> | null = null;
  const result = await __testables.queueShotGenerationRunWithDeps(
    {
      projectId: 'project-1',
      shotId: 'shot-1',
      userId: 'user-1',
      runType: 'VIDEO_GENERATION',
      modelKind: 'VIDEO',
      promptField: 'motionPrompt',
      modelFamily: 'veo-3-1',
      modelEndpoint: 'veo-3-1-fast',
      referenceAssetIds: ['asset-1'],
    },
    {
      findOwnedShot: async () => buildOwnedShot(),
      resolveUserDefaultModelSelection: async () => {
        throw new Error('should not read defaults');
      },
      resolveModelSelection: async (input) => {
        selectionInput = input as unknown as Record<string, unknown>;
        return {
          family: { id: 'family-1', slug: 'veo-3-1', name: 'Veo 3.1' },
          provider: { id: 'provider-1', code: 'ark', name: 'Ark', providerType: 'OFFICIAL' },
          endpoint: { id: 'endpoint-1', slug: 'veo-3-1-fast', label: 'Veo Fast', remoteModelKey: 'veo-fast' },
        } as never;
      },
      prisma: {
        $transaction: async (callback: (tx: any) => Promise<unknown>) =>
          callback({
            project: { update: async () => null },
            episode: { update: async () => null },
            shot: {
              update: async () => ({
                id: 'shot-1',
                status: 'QUEUED',
                imagePrompt: '图像提示词',
                motionPrompt: '动作提示词',
              }),
            },
            run: {
              create: async ({ data }: { data: Record<string, unknown> }) => ({
                id: 'run-1',
                ...data,
              }),
            },
          }),
      } as never,
    },
  );

  assert.deepEqual(selectionInput, {
    modelKind: 'VIDEO',
    familySlug: 'veo-3-1',
    endpointSlug: 'veo-3-1-fast',
    strategy: 'default',
  });
  assert.equal(result.ok, true);
});

test('queueShotGenerationRunWithDeps falls back to user defaults and persists prompt override', async () => {
  const result = await __testables.queueShotGenerationRunWithDeps(
    {
      projectId: 'project-1',
      shotId: 'shot-1',
      userId: 'user-1',
      runType: 'IMAGE_GENERATION',
      modelKind: 'IMAGE',
      promptField: 'imagePrompt',
      promptOverride: '新的图片提示词',
      referenceAssetIds: ['asset-1', 'asset-2'],
      options: { quality: 'high' },
    },
    {
      findOwnedShot: async () => ({
        ...buildOwnedShot(),
        imagePrompt: '旧图片提示词',
        motionPrompt: '旧动作提示词',
      }),
      resolveUserDefaultModelSelection: async () => ({
        familySlug: 'seedream-2',
        endpointSlug: 'seedream-2-default',
      }),
      resolveModelSelection: async () => ({
        family: { id: 'family-1', slug: 'seedream-2', name: 'Seedream 2' },
        provider: { id: 'provider-1', code: 'ark', name: 'Ark', providerType: 'OFFICIAL' },
        endpoint: { id: 'endpoint-1', slug: 'seedream-2-default', label: 'Seedream', remoteModelKey: 'seedream' },
      } as never),
      prisma: {
        $transaction: async (callback: (tx: any) => Promise<unknown>) =>
          callback({
            project: { update: async () => null },
            episode: { update: async () => null },
            shot: {
              update: async ({ data }: { data: Record<string, unknown> }) => ({
                id: 'shot-1',
                status: 'QUEUED',
                imagePrompt: data.imagePrompt,
                motionPrompt: '旧动作提示词',
              }),
            },
            run: {
              create: async ({ data }: { data: Record<string, any> }) => ({
                id: 'run-1',
                inputJson: data.inputJson,
                status: 'QUEUED',
              }),
            },
          }),
      } as never,
    },
  );

  assert.deepEqual(result, {
    ok: true,
    shot: {
      id: 'shot-1',
      status: 'queued',
      imagePrompt: '新的图片提示词',
      motionPrompt: '旧动作提示词',
    },
    run: {
      id: 'run-1',
      inputJson: {
        shotId: 'shot-1',
        prompt: '新的图片提示词',
        modelFamily: {
          id: 'family-1',
          slug: 'seedream-2',
          name: 'Seedream 2',
        },
        modelProvider: {
          id: 'provider-1',
          code: 'ark',
          name: 'Ark',
          providerType: 'official',
        },
        modelEndpoint: {
          id: 'endpoint-1',
          slug: 'seedream-2-default',
          label: 'Seedream',
          remoteModelKey: 'seedream',
        },
        referenceAssetIds: ['asset-1', 'asset-2'],
        options: { quality: 'high' },
      },
      status: 'QUEUED',
    },
  });
});

test('queueShotGenerationRunWithDeps returns MODEL_NOT_FOUND when selection fails', async () => {
  const result = await __testables.queueShotGenerationRunWithDeps(
    {
      projectId: 'project-1',
      shotId: 'shot-1',
      userId: 'user-1',
      runType: 'VIDEO_GENERATION',
      modelKind: 'VIDEO',
      promptField: 'motionPrompt',
      referenceAssetIds: [],
    },
    {
      findOwnedShot: async () => buildOwnedShot(),
      resolveUserDefaultModelSelection: async () => null,
      resolveModelSelection: async () => null,
      prisma: {
        $transaction: async () => {
          throw new Error('should not create run');
        },
      } as never,
    },
  );

  assert.deepEqual(result, { ok: false, error: 'MODEL_NOT_FOUND' });
});
