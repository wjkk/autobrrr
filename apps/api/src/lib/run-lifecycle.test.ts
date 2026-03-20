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

test('finalizeGeneratedRun stores planner subject assets locally and syncs refinement projection', async () => {
  let syncedRefinementVersionId: string | null = null;
  const runUpdates: Array<Record<string, unknown>> = [];

  const result = await __testables.finalizeGeneratedRunWithDeps({
    id: 'run-4',
    resourceType: 'planner_subject',
    resourceId: 'subject-1',
    projectId: 'project-1',
    episodeId: 'episode-1',
    providerJobId: 'job-1',
    providerStatus: 'succeeded',
    inputJson: {
      prompt: '生成主体图',
      options: {
        aspectRatio: '9:16',
      },
    },
    outputJson: {
      providerData: {
        image_url: 'https://provider.example.com/generated.png',
      },
    },
  } as never, 'IMAGE', {
    prisma: {
      project: {
        findUniqueOrThrow: async () => ({
          createdById: 'user-1',
        }),
      },
      plannerSubject: {
        findUnique: async () => ({
          id: 'subject-1',
          refinementVersionId: 'ref-1',
          generatedAssetIdsJson: ['asset-old'],
        }),
        update: async () => ({}),
      },
      asset: {
        create: async ({ data }: { data: Record<string, unknown> }) => ({
          id: 'asset-new',
          ...data,
        }),
      },
      run: {
        update: async ({ data }: { data: Record<string, unknown> }) => {
          runUpdates.push(data);
          return {};
        },
      },
      $transaction: async (callback: (db: never) => Promise<{ assetId: string }>) =>
        callback({
          project: {
            findUniqueOrThrow: async () => ({
              createdById: 'user-1',
            }),
          },
          asset: {
            create: async ({ data }: { data: Record<string, unknown> }) => ({
              id: 'asset-new',
              ...data,
            }),
          },
          plannerSubject: {
            findUnique: async () => ({
              id: 'subject-1',
              refinementVersionId: 'ref-1',
              generatedAssetIdsJson: ['asset-old'],
            }),
            update: async () => ({}),
          },
          run: {
            update: async ({ data }: { data: Record<string, unknown> }) => {
              runUpdates.push(data);
              return {};
            },
          },
        } as never),
    } as never,
    downloadGeneratedAssetToLocal: async () => ({
      storageKey: 'generated/2026/03/19/run-4.png',
      absolutePath: '/tmp/generated/run-4.png',
      fileName: 'run-4.png',
      sourcePath: '/uploads/generated/2026/03/19/run-4.png',
      sourceUrl: 'http://localhost:8787/uploads/generated/2026/03/19/run-4.png',
      mimeType: 'image/png',
      fileSizeBytes: 1234,
    }),
    finalizePlannerConversation: async () => {
      throw new Error('not used');
    },
    syncPlannerRefinementProjection: async ({ refinementVersionId }: { refinementVersionId: string }) => {
      syncedRefinementVersionId = refinementVersionId;
      return {} as never;
    },
  });

  assert.deepEqual(result, {
    runId: 'run-4',
    status: 'completed',
    action: 'processed',
    assetId: 'asset-new',
  });
  assert.equal(syncedRefinementVersionId, 'ref-1');
  assert.equal((runUpdates[0]?.outputJson as { assetId?: string } | undefined)?.assetId, 'asset-new');
});

test('finalizeGeneratedRun creates a new shot version for generated video assets', async () => {
  const runUpdates: Array<Record<string, unknown>> = [];

  const result = await __testables.finalizeGeneratedRunWithDeps({
    id: 'run-5',
    resourceType: 'shot',
    resourceId: 'shot-1',
    projectId: 'project-1',
    episodeId: 'episode-1',
    providerJobId: 'job-2',
    providerStatus: 'succeeded',
    inputJson: {
      prompt: '生成视频',
      options: {
        durationSeconds: 6,
        aspectRatio: '16:9',
        resolution: '1080p',
      },
    },
    outputJson: {
      providerData: {
        video_url: 'https://provider.example.com/generated.mp4',
      },
    },
  } as never, 'VIDEO', {
    prisma: {
      shot: {
        findUnique: async () => ({
          id: 'shot-1',
          projectId: 'project-1',
          episodeId: 'episode-1',
          imagePrompt: '图像提示词',
          motionPrompt: '视频提示词',
          activeVersionId: 'version-old',
        }),
      },
      $transaction: async (callback: (db: never) => Promise<{ assetId: string; shotVersionId: string }>) =>
        callback({
          project: {
            findUniqueOrThrow: async () => ({
              createdById: 'user-1',
            }),
          },
          shotVersion: {
            aggregate: async () => ({
              _max: {
                versionNumber: 2,
              },
            }),
            updateMany: async () => ({}),
            create: async () => ({
              id: 'version-3',
            }),
          },
          asset: {
            create: async ({ data }: { data: Record<string, unknown> }) => ({
              id: 'asset-video',
              ...data,
            }),
          },
          shot: {
            update: async () => ({}),
          },
          run: {
            update: async ({ data }: { data: Record<string, unknown> }) => {
              runUpdates.push(data);
              return {};
            },
          },
        } as never),
      run: {
        update: async ({ data }: { data: Record<string, unknown> }) => {
          runUpdates.push(data);
          return {};
        },
      },
    } as never,
    downloadGeneratedAssetToLocal: async () => ({
      storageKey: 'generated/2026/03/19/run-5.mp4',
      absolutePath: '/tmp/generated/run-5.mp4',
      fileName: 'run-5.mp4',
      sourcePath: '/uploads/generated/2026/03/19/run-5.mp4',
      sourceUrl: 'http://localhost:8787/uploads/generated/2026/03/19/run-5.mp4',
      mimeType: 'video/mp4',
      fileSizeBytes: 4096,
    }),
    finalizePlannerConversation: async () => {
      throw new Error('not used');
    },
    syncPlannerRefinementProjection: async () => {
      throw new Error('not used');
    },
  });

  assert.deepEqual(result, {
    runId: 'run-5',
    status: 'completed',
    action: 'processed',
    assetId: 'asset-video',
    shotVersionId: 'version-3',
  });
  assert.equal((runUpdates[0]?.outputJson as { shotVersionId?: string } | undefined)?.shotVersionId, 'version-3');
});
