import assert from 'node:assert/strict';
import test from 'node:test';

import { __testables } from './generation-service.js';

test('buildImageRunContext maps entity kinds to stable resource types', () => {
  assert.deepEqual(__testables.buildImageRunContext('subject'), {
    resourceType: 'planner_subject',
    plannerImageKind: 'subject',
    notFoundError: 'SUBJECT_NOT_FOUND',
  });
  assert.deepEqual(__testables.buildImageRunContext('scene'), {
    resourceType: 'planner_scene',
    plannerImageKind: 'scene',
    notFoundError: 'SCENE_NOT_FOUND',
  });
  assert.deepEqual(__testables.buildImageRunContext('shot'), {
    resourceType: 'planner_shot_script',
    plannerImageKind: 'storyboard_sketch',
    notFoundError: 'SHOT_NOT_FOUND',
  });
});

test('resolvePlannerImageModelWithDeps prefers user defaults only when request does not override family or endpoint', async () => {
  let selectionInput: Record<string, unknown> | null = null;
  const withDefaults = await __testables.resolvePlannerImageModelWithDeps(
    {
      userId: 'user-1',
      preferredEndpointSlug: 'preferred-image',
    },
    {
      resolveUserDefaultModelSelection: async () => ({
        familySlug: 'seedream-2',
        endpointSlug: 'seedream-2-default',
      }),
      resolveModelSelection: async (input) => {
        selectionInput = input as unknown as Record<string, unknown>;
        return { family: { id: 'family-1' }, provider: { id: 'provider-1' }, endpoint: { id: 'endpoint-1' } } as never;
      },
    },
  );

  assert.equal(withDefaults?.endpoint.id, 'endpoint-1');
  assert.deepEqual(selectionInput, {
    modelKind: 'IMAGE',
    familySlug: 'seedream-2',
    endpointSlug: 'preferred-image',
    strategy: 'default',
  });

  selectionInput = null;
  await __testables.resolvePlannerImageModelWithDeps(
    {
      userId: 'user-1',
      modelFamily: 'custom-family',
      modelEndpoint: 'custom-endpoint',
      preferredEndpointSlug: 'preferred-image',
    },
    {
      resolveUserDefaultModelSelection: async () => {
        throw new Error('should not read defaults');
      },
      resolveModelSelection: async (input) => {
        selectionInput = input as unknown as Record<string, unknown>;
        return null;
      },
    },
  );

  assert.deepEqual(selectionInput, {
    modelKind: 'IMAGE',
    familySlug: 'custom-family',
    endpointSlug: 'custom-endpoint',
    strategy: 'default',
  });
});

test('findPlannerMediaEntityWithDeps extracts prompt and reference assets for shot entities', async () => {
  const result = await __testables.findPlannerMediaEntityWithDeps(
    {
      entityKind: 'shot',
      entityId: 'shot-1',
      refinementVersionId: 'ref-1',
    },
    {
      prisma: {
        plannerSubject: { findFirst: async () => null },
        plannerScene: { findFirst: async () => null },
        plannerShotScript: {
          findFirst: async () => ({
            id: 'shot-1',
            title: '分镜一',
            visualDescription: '雨夜巷口',
            composition: '中景',
            cameraMotion: '推镜',
            referenceAssetIdsJson: ['asset-1', 2, 'asset-2'],
          }),
        },
      } as never,
    },
  );

  assert.deepEqual(result, {
    id: 'shot-1',
    entityName: '分镜一',
    prompt: '雨夜巷口\n中景\n推镜',
    referenceAssetIds: ['asset-1', 'asset-2'],
  });
});

test('queuePlannerImageGenerationWithDeps blocks locked refinement before querying entity/model', async () => {
  const result = await __testables.queuePlannerImageGenerationWithDeps(
    {
      projectId: 'project-1',
      episodeId: 'episode-1',
      userId: 'user-1',
      entityId: 'subject-1',
      entityKind: 'subject',
      referenceAssetIds: [],
    },
    {
      findOwnedActivePlannerRefinement: async () => ({
        id: 'ref-1',
        isConfirmed: true,
        plannerSession: {
          project: { id: 'project-1', creationConfig: null },
          episode: { id: 'episode-1', title: '第1集' },
        },
      }),
      verifyOwnedPlannerImageAssets: async () => {
        throw new Error('should not verify');
      },
      resolvePlannerImageModel: async () => {
        throw new Error('should not resolve model');
      },
      findPlannerMediaEntity: async () => {
        throw new Error('should not query entity');
      },
      plannerEntityPrisma: {
        plannerSubject: { findFirst: async () => null },
        plannerScene: { findFirst: async () => null },
        plannerShotScript: { findFirst: async () => null },
      } as never,
      prisma: {
        run: {
          create: async () => {
            throw new Error('should not create run');
          },
        },
      } as never,
    },
  );

  assert.deepEqual(result, {
    ok: false,
    error: 'REFINEMENT_LOCKED',
  });
});

test('queuePlannerImageGenerationWithDeps rejects unowned reference assets', async () => {
  const result = await __testables.queuePlannerImageGenerationWithDeps(
    {
      projectId: 'project-1',
      episodeId: 'episode-1',
      userId: 'user-1',
      entityId: 'scene-1',
      entityKind: 'scene',
      referenceAssetIds: [],
    },
    {
      findOwnedActivePlannerRefinement: async () => ({
        id: 'ref-1',
        isConfirmed: false,
        plannerSession: {
          project: { id: 'project-1', creationConfig: null },
          episode: { id: 'episode-1', title: '第1集' },
        },
      }),
      verifyOwnedPlannerImageAssets: async () => false,
      resolvePlannerImageModel: async () => {
        throw new Error('should not resolve model');
      },
      findPlannerMediaEntity: async () => ({
        id: 'scene-1',
        entityName: '场景一',
        prompt: '黄昏街道',
        referenceAssetIds: ['asset-1'],
      }),
      plannerEntityPrisma: {
        plannerSubject: { findFirst: async () => null },
        plannerScene: { findFirst: async () => null },
        plannerShotScript: { findFirst: async () => null },
      } as never,
      prisma: {
        run: {
          create: async () => {
            throw new Error('should not create run');
          },
        },
      } as never,
    },
  );

  assert.deepEqual(result, {
    ok: false,
    error: 'ASSET_NOT_OWNED',
  });
});
