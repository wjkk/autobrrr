import test from 'node:test';
import assert from 'node:assert/strict';

import { __testables } from './subject-auto-assets.js';

test('planner subject auto asset helpers normalize asset ids, infer type and build file name', () => {
  assert.deepEqual(__testables.readAssetIds(['asset-1', '', 3, 'asset-2']), ['asset-1', 'asset-2']);
  assert.equal(__testables.inferPlannerSubjectType('白色长毛猫，眼神警觉'), 'animal');
  assert.equal(__testables.inferPlannerSubjectType('赛博生物战士'), 'creature');
  assert.equal(__testables.inferPlannerSubjectType('复古机器人相机'), 'object');
  assert.equal(__testables.inferPlannerSubjectType('年轻侦探'), 'human');
  assert.equal(__testables.buildAssetFileName('subject-1'), 'planner-subject-auto-subject-1.png');
});

test('autoGeneratePlannerSubjectAssetsForRefinementWithDeps skips existing assets and reports generation failures', async () => {
  const summary = await __testables.autoGeneratePlannerSubjectAssetsForRefinementWithDeps({
    userId: 'user-1',
    projectId: 'project-1',
    episodeId: 'episode-1',
    refinementVersionId: 'ref-1',
  }, {
    prisma: {
      projectCreationConfig: {
        findUnique: async () => ({
          imageModelEndpoint: { slug: 'seedream-default' },
        }),
      },
      plannerSubject: {
        findMany: async () => ([
          {
            id: 'subject-1',
            name: '主角',
            prompt: '年轻侦探',
            generatedAssetIdsJson: ['asset-existing'],
          },
          {
            id: 'subject-2',
            name: '配角',
            prompt: '神秘路人',
            generatedAssetIdsJson: null,
          },
        ]),
      },
      $transaction: async () => {
        throw new Error('should not enter transaction');
      },
    } as any,
    generatePlannerSubjectAutoImageForUser: async ({ input }: any) => {
      throw new Error(`${input.name} 生成失败`);
    },
    syncPlannerRefinementProjection: async () => {
      throw new Error('should not sync');
    },
  });

  assert.equal(summary.attempted, 1);
  assert.equal(summary.created, 0);
  assert.equal(summary.skipped, 1);
  assert.equal(summary.failed, 1);
  assert.deepEqual(summary.items, [
    {
      subjectId: 'subject-1',
      name: '主角',
      status: 'skipped',
      reason: '已有主体草图',
    },
    {
      subjectId: 'subject-2',
      name: '配角',
      status: 'failed',
      reason: '配角 生成失败',
    },
  ]);
});

test('autoGeneratePlannerSubjectAssetsForRefinementWithDeps creates assets, prepends new asset id and syncs projection once', async () => {
  const syncCalls: string[] = [];
  const createdAssets: Array<Record<string, unknown>> = [];
  const updatedSubjects: Array<Record<string, unknown>> = [];
  const generatedCalls: Array<Record<string, unknown>> = [];

  const summary = await __testables.autoGeneratePlannerSubjectAssetsForRefinementWithDeps({
    userId: 'user-1',
    projectId: 'project-1',
    episodeId: 'episode-1',
    refinementVersionId: 'ref-1',
  }, {
    prisma: {
      projectCreationConfig: {
        findUnique: async () => ({
          imageModelEndpoint: { slug: 'seedream-default' },
        }),
      },
      plannerSubject: {
        findMany: async () => ([
          {
            id: 'subject-1',
            name: '雪球',
            prompt: '一只白色长毛猫',
            generatedAssetIdsJson: null,
          },
        ]),
      },
      $transaction: async (callback: (tx: any) => Promise<unknown>) => callback({
        plannerSubject: {
          findUnique: async () => ({
            id: 'subject-1',
            name: '雪球',
            generatedAssetIdsJson: ['asset-old'],
          }),
          update: async ({ data }: { data: Record<string, unknown> }) => {
            updatedSubjects.push(data);
          },
        },
        asset: {
          create: async ({ data }: { data: Record<string, unknown> }) => {
            createdAssets.push(data);
            return {
              id: 'asset-new',
              sourceUrl: 'https://cdn.example.com/cat.png',
            };
          },
        },
      }),
    } as any,
    generatePlannerSubjectAutoImageForUser: async ({ input }: any) => {
      generatedCalls.push(input);
      return {
        imageUrl: 'https://cdn.example.com/cat.png',
        providerOutput: { url: 'https://cdn.example.com/cat.png' },
        prompt: '自动生成主体图 prompt',
        model: {
          family: 'seedream-3.0',
          endpoint: 'seedream-default',
          provider: 'ark',
        },
      };
    },
    syncPlannerRefinementProjection: async ({ refinementVersionId }: { refinementVersionId: string }) => {
      syncCalls.push(refinementVersionId);
      return {} as never;
    },
  });

  assert.equal(generatedCalls.length, 1);
  assert.equal(generatedCalls[0]?.subjectType, 'animal');
  assert.equal(generatedCalls[0]?.modelEndpoint, 'seedream-default');
  assert.equal(createdAssets[0]?.fileName, 'planner-subject-auto-subject-1.png');
  assert.equal(createdAssets[0]?.sourceKind, 'GENERATED');
  assert.deepEqual(updatedSubjects[0]?.generatedAssetIdsJson, ['asset-new', 'asset-old']);
  assert.deepEqual(syncCalls, ['ref-1']);
  assert.deepEqual(summary, {
    refinementVersionId: 'ref-1',
    attempted: 1,
    created: 1,
    skipped: 0,
    failed: 0,
    items: [
      {
        subjectId: 'subject-1',
        name: '雪球',
        status: 'created',
        assetId: 'asset-new',
        imageUrl: 'https://cdn.example.com/cat.png',
      },
    ],
  });
});
