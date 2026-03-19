import assert from 'node:assert/strict';
import test from 'node:test';

import { __testables } from './entity-service.js';

function buildActiveRefinement(isConfirmed = false) {
  return {
    id: 'ref-1',
    isConfirmed,
    plannerSession: {
      project: {
        id: 'project-1',
        creationConfig: null,
      },
      episode: {
        id: 'episode-1',
        title: '第1集',
      },
    },
  };
}

function buildProjectionDoc() {
  return {
    projectTitle: '项目A',
    episodeTitle: '第1集',
    episodeCount: 1,
    pointCost: 38,
    summaryBullets: ['梗概'],
    highlights: [{ title: '亮点', description: '说明' }],
    styleBullets: ['风格'],
    subjectBullets: ['主体描述'],
    subjects: [{ title: '主角', prompt: '主体提示词' }],
    sceneBullets: ['场景描述'],
    scenes: [{ title: '场景', prompt: '场景提示词' }],
    scriptSummary: ['摘要'],
    acts: [{
      title: '第一幕',
      time: '夜',
      location: '室内',
      shots: [{
        title: '分镜1',
        visual: '画面',
        composition: '构图',
        motion: '运镜',
        voice: '旁白',
        line: '台词',
      }],
    }],
  };
}

test('requireEditableRefinementWithDeps returns missing or locked errors before entity writes', async () => {
  const missing = await __testables.requireEditableRefinementWithDeps(
    {
      projectId: 'project-1',
      episodeId: 'episode-1',
      userId: 'user-1',
    },
    {
      findOwnedActivePlannerRefinement: async () => null,
    },
  );
  assert.deepEqual(missing, { ok: false, error: 'REFINEMENT_REQUIRED' });

  const locked = await __testables.requireEditableRefinementWithDeps(
    {
      projectId: 'project-1',
      episodeId: 'episode-1',
      userId: 'user-1',
    },
    {
      findOwnedActivePlannerRefinement: async () => ({
        ...buildActiveRefinement(true),
      }),
    },
  );
  assert.deepEqual(locked, { ok: false, error: 'REFINEMENT_LOCKED' });
});

test('updatePlannerEntityAssetsWithDeps rejects missing entities and unowned assets', async () => {
  const missingSubject = await __testables.updatePlannerEntityAssetsWithDeps(
    {
      projectId: 'project-1',
      episodeId: 'episode-1',
      userId: 'user-1',
      entityKind: 'subject',
      entityId: 'subject-1',
      referenceAssetIds: ['asset-1'],
    },
    {
      requireEditableRefinement: async () => ({
        ok: true,
        activeRefinement: buildActiveRefinement(false),
      }),
      verifyOwnedPlannerImageAssets: async () => true,
      prisma: {
        plannerSubject: { findFirst: async () => null },
        plannerScene: { findFirst: async () => null },
        $transaction: async () => {
          throw new Error('should not update');
        },
      } as never,
      syncPlannerRefinementProjection: async () => {
        throw new Error('should not sync');
      },
    },
  );
  assert.deepEqual(missingSubject, { ok: false, error: 'SUBJECT_NOT_FOUND' });

  const unownedAssets = await __testables.updatePlannerEntityAssetsWithDeps(
    {
      projectId: 'project-1',
      episodeId: 'episode-1',
      userId: 'user-1',
      entityKind: 'scene',
      entityId: 'scene-1',
      generatedAssetIds: ['asset-1'],
    },
    {
      requireEditableRefinement: async () => ({
        ok: true,
        activeRefinement: buildActiveRefinement(false),
      }),
      verifyOwnedPlannerImageAssets: async () => false,
      prisma: {
        plannerSubject: { findFirst: async () => null },
        plannerScene: { findFirst: async () => ({ id: 'scene-1' }) },
        $transaction: async () => {
          throw new Error('should not update');
        },
      } as never,
      syncPlannerRefinementProjection: async () => {
        throw new Error('should not sync');
      },
    },
  );
  assert.deepEqual(unownedAssets, { ok: false, error: 'ASSET_NOT_OWNED' });
});

test('getPlannerEntityRecommendationsWithDeps returns subject recommendations with linked assets first', async () => {
  const result = await __testables.getPlannerEntityRecommendationsWithDeps(
    {
      projectId: 'project-1',
      episodeId: 'episode-1',
      userId: 'user-1',
      entityKind: 'subject',
      entityId: 'subject-1',
    },
    {
      findOwnedActivePlannerRefinement: async () => buildActiveRefinement(false),
      prisma: {
        plannerSubject: {
          findFirst: async () => ({
            id: 'subject-1',
            name: '主角',
            role: '调查记者',
            appearance: '风衣、短发',
            personality: '冷静',
            prompt: '电影感人物设定',
            referenceAssetIdsJson: ['asset-linked'],
            generatedAssetIdsJson: ['asset-generated'],
          }),
        },
        plannerScene: { findFirst: async () => null },
        asset: {
          findMany: async ({ where }: { where?: { id?: { in?: string[] } } }) => {
            if (where?.id?.in) {
              return [
                {
                  id: 'asset-generated',
                  sourceUrl: 'https://cdn.example.com/generated.png',
                  fileName: 'generated.png',
                  mediaKind: 'IMAGE',
                  sourceKind: 'GENERATED',
                  createdAt: new Date('2026-03-18T12:00:00.000Z'),
                },
                {
                  id: 'asset-linked',
                  sourceUrl: 'https://cdn.example.com/linked.png',
                  fileName: 'linked.png',
                  mediaKind: 'IMAGE',
                  sourceKind: 'UPLOAD',
                  createdAt: new Date('2026-03-18T11:00:00.000Z'),
                },
              ];
            }

            return [
              {
                id: 'asset-recent',
                sourceUrl: 'https://cdn.example.com/recent.png',
                fileName: 'recent.png',
                mediaKind: 'IMAGE',
                sourceKind: 'UPLOAD',
                createdAt: new Date('2026-03-18T10:00:00.000Z'),
              },
            ];
          },
        },
      } as never,
    },
  );

  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  assert.equal(result.data.entityName, '主角');
  assert.equal(result.data.recommendations.length, 3);
  assert.deepEqual(result.data.recommendations[0]?.referenceAssetIds, [
    'asset-generated',
    'asset-linked',
    'asset-recent',
  ]);
  assert.match(result.data.recommendations[0]?.prompt ?? '', /调查记者/);
});

test('updatePlannerEntityAssetsWithDeps updates subject assets and normalizes returned ids', async () => {
  let syncedRefinementId: string | null = null;
  const result = await __testables.updatePlannerEntityAssetsWithDeps(
    {
      projectId: 'project-1',
      episodeId: 'episode-1',
      userId: 'user-1',
      entityKind: 'subject',
      entityId: 'subject-1',
      referenceAssetIds: ['asset-1'],
      generatedAssetIds: ['asset-2'],
    },
    {
      requireEditableRefinement: async () => ({
        ok: true,
        activeRefinement: buildActiveRefinement(false),
      }),
      verifyOwnedPlannerImageAssets: async () => true,
      prisma: {
        plannerSubject: { findFirst: async () => ({ id: 'subject-1' }) },
        plannerScene: { findFirst: async () => null },
        $transaction: async (callback: (tx: any) => Promise<unknown>) =>
          callback({
            plannerSubject: {
              update: async () => ({
                id: 'subject-1',
                referenceAssetIdsJson: ['asset-1'],
                generatedAssetIdsJson: ['asset-2'],
              }),
            },
            plannerScene: {
              update: async () => {
                throw new Error('should not update scene');
              },
            },
          }),
      } as never,
      syncPlannerRefinementProjection: async ({ refinementVersionId }) => {
        syncedRefinementId = refinementVersionId;
        return buildProjectionDoc();
      },
    },
  );

  assert.equal(syncedRefinementId, 'ref-1');
  assert.deepEqual(result, {
    ok: true,
    data: {
      id: 'subject-1',
      referenceAssetIds: ['asset-1'],
      generatedAssetIds: ['asset-2'],
    },
  });
});
