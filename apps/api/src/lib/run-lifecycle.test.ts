import assert from 'node:assert/strict';
import test from 'node:test';

import { __testables } from './run-lifecycle.js';

function createFakePrisma() {
  const updates: Array<{ where: { id: string }; data: Record<string, unknown> }> = [];

  return {
    updates,
    client: {
      run: {
        update: async (args: { where: { id: string }; data: Record<string, unknown> }) => {
          updates.push(args);
          return {
            id: args.where.id,
            status: 'FAILED',
          };
        },
      },
      plannerSession: {
        findUnique: async () => null,
      },
      shot: {
        findUnique: async () => null,
      },
      $transaction: async () => {
        throw new Error('transaction should not be called in failure-path tests');
      },
    },
  };
}

test('finalizePlannerRun fails when planner session linkage is invalid', async () => {
  const fake = createFakePrisma();

  const result = await __testables.finalizePlannerRunWithDeps({
    id: 'run-1',
    resourceType: 'shot',
    resourceId: 'shot-1',
    projectId: 'project-1',
    episodeId: 'episode-1',
  } as never, {
    prisma: fake.client as never,
    downloadGeneratedAssetToLocal: async () => {
      throw new Error('not used');
    },
    finalizePlannerConversation: async () => {
      throw new Error('not used');
    },
    syncPlannerRefinementProjection: async () => {
      throw new Error('not used');
    },
  });

  assert.deepEqual(result, {
    runId: 'run-1',
    status: 'failed',
    action: 'failed',
  });
  assert.equal(fake.updates[0]?.data.errorCode, 'RUN_RESOURCE_INVALID');
});

test('finalizeGeneratedRun fails when provider output url is missing', async () => {
  const fake = createFakePrisma();

  const result = await __testables.finalizeGeneratedRunWithDeps({
    id: 'run-2',
    resourceType: 'planner_subject',
    resourceId: 'subject-1',
    projectId: 'project-1',
    episodeId: 'episode-1',
    inputJson: {
      prompt: '生成主体图',
    },
    outputJson: {
      providerData: {},
    },
  } as never, 'IMAGE', {
    prisma: fake.client as never,
    downloadGeneratedAssetToLocal: async () => {
      throw new Error('not used');
    },
    finalizePlannerConversation: async () => {
      throw new Error('not used');
    },
    syncPlannerRefinementProjection: async () => {
      throw new Error('not used');
    },
  });

  assert.deepEqual(result, {
    runId: 'run-2',
    status: 'failed',
    action: 'failed',
  });
  assert.equal(fake.updates[0]?.data.errorCode, 'PROVIDER_OUTPUT_URL_MISSING');
});

test('finalizeGeneratedRun fails when shot resource is missing', async () => {
  const fake = createFakePrisma();

  const result = await __testables.finalizeGeneratedRunWithDeps({
    id: 'run-3',
    resourceType: 'shot',
    resourceId: 'shot-missing',
    projectId: 'project-1',
    episodeId: 'episode-1',
    inputJson: {
      prompt: '生成视频',
    },
    outputJson: {
      providerData: {
        url: 'https://example.com/video.mp4',
      },
    },
  } as never, 'VIDEO', {
    prisma: fake.client as never,
    downloadGeneratedAssetToLocal: async () => {
      throw new Error('not used');
    },
    finalizePlannerConversation: async () => {
      throw new Error('not used');
    },
    syncPlannerRefinementProjection: async () => {
      throw new Error('not used');
    },
  });

  assert.deepEqual(result, {
    runId: 'run-3',
    status: 'failed',
    action: 'failed',
  });
  assert.equal(fake.updates[0]?.data.errorCode, 'SHOT_NOT_FOUND');
});
