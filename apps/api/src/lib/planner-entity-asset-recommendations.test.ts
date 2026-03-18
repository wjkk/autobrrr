import assert from 'node:assert/strict';
import test from 'node:test';

import {
  __testables,
  buildPlannerSceneAssetRecommendations,
  buildPlannerSubjectAssetRecommendations,
} from './planner-entity-asset-recommendations.js';

test('buildPlannerRecommendationReferenceAssets keeps linked assets first and deduplicates recent assets', () => {
  const result = __testables.buildPlannerRecommendationReferenceAssets({
    linkedAssets: [
      {
        id: 'asset-1',
        sourceUrl: 'https://cdn.example.com/linked.png',
        fileName: 'linked.png',
        mediaKind: 'IMAGE',
        sourceKind: 'UPLOAD',
        createdAt: new Date('2026-03-18T10:00:00.000Z'),
      },
    ],
    recentAssets: [
      {
        id: 'asset-1',
        sourceUrl: 'https://cdn.example.com/linked.png',
        fileName: 'linked.png',
        mediaKind: 'IMAGE',
        sourceKind: 'UPLOAD',
        createdAt: new Date('2026-03-18T10:00:00.000Z'),
      },
      {
        id: 'asset-2',
        sourceUrl: 'https://cdn.example.com/recent.png',
        fileName: 'recent.png',
        mediaKind: 'IMAGE',
        sourceKind: 'GENERATED',
        createdAt: new Date('2026-03-18T11:00:00.000Z'),
      },
    ],
  });

  assert.deepEqual(result.map((item) => item.id), ['asset-1', 'asset-2']);
  assert.equal(result[0]?.sourceKind, 'upload');
  assert.equal(result[1]?.sourceKind, 'generated');
});

test('buildPlannerSubjectAssetRecommendations emits three stable recommendation modes', () => {
  const recommendations = buildPlannerSubjectAssetRecommendations({
    entity: {
      name: '林夜',
      role: '侦探',
      appearance: '黑色长风衣，消瘦，短发',
      personality: '冷静克制',
      prompt: '电影感角色设定',
    },
    referenceAssets: [],
  });

  assert.deepEqual(recommendations.map((item) => item.id), [
    'subject-hero-sheet',
    'subject-emotion-closeup',
    'subject-full-body-pose',
  ]);
  assert.match(recommendations[0]?.prompt ?? '', /角色设定图/);
  assert.match(recommendations[1]?.prompt ?? '', /半身近景/);
  assert.match(recommendations[2]?.prompt ?? '', /全身动态姿态/);
});

test('buildPlannerSceneAssetRecommendations emphasizes structure, atmosphere and blocking', () => {
  const recommendations = buildPlannerSceneAssetRecommendations({
    entity: {
      name: '废弃码头',
      time: '深夜',
      locationType: '室外',
      description: '雾气很重，灯光稀疏，潮湿的铁轨穿过码头',
      prompt: '冷蓝色电影氛围',
    },
    referenceAssets: [],
  });

  assert.deepEqual(recommendations.map((item) => item.id), [
    'scene-establishing',
    'scene-atmosphere-detail',
    'scene-blocking',
  ]);
  assert.match(recommendations[0]?.prompt ?? '', /广角建立镜头/);
  assert.match(recommendations[1]?.prompt ?? '', /环境细节/);
  assert.match(recommendations[2]?.prompt ?? '', /机位/);
});
