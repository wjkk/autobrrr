import assert from 'node:assert/strict';
import test from 'node:test';

import { applyPlannerRecommendationDraft, pickPlannerRecommendationPreviewAsset } from './planner-asset-recommendations';

test('pickPlannerRecommendationPreviewAsset prefers the first image asset with a source url', () => {
  const recommendation = {
    id: 'subject-hero-sheet',
    title: '定妆主视觉',
    prompt: 'prompt',
    rationale: 'rationale',
    referenceAssetIds: ['asset-1', 'asset-2'],
    referenceAssets: [
      {
        id: 'asset-1',
        sourceUrl: null,
        fileName: 'broken.png',
        mediaKind: 'image',
        sourceKind: 'upload',
        createdAt: '2026-03-18T12:00:00.000Z',
      },
      {
        id: 'asset-2',
        sourceUrl: 'https://cdn.example.com/hero.png',
        fileName: 'hero.png',
        mediaKind: 'image',
        sourceKind: 'generated',
        createdAt: '2026-03-18T12:01:00.000Z',
      },
    ],
  };

  assert.equal(pickPlannerRecommendationPreviewAsset(recommendation)?.id, 'asset-2');
});

test('applyPlannerRecommendationDraft fills prompt and optional preview asset into dialog draft state', () => {
  const result = applyPlannerRecommendationDraft({
    id: 'scene-establishing',
    title: '建立镜头',
    prompt: '夜晚旧港口，广角建立镜头',
    rationale: 'rationale',
    referenceAssetIds: ['asset-1'],
    referenceAssets: [
      {
        id: 'asset-1',
        sourceUrl: 'https://cdn.example.com/scene.png',
        fileName: 'scene.png',
        mediaKind: 'image',
        sourceKind: 'upload',
        createdAt: '2026-03-18T12:00:00.000Z',
      },
    ],
  });

  assert.deepEqual(result, {
    prompt: '夜晚旧港口，广角建立镜头',
    assetId: 'asset-1',
    image: 'https://cdn.example.com/scene.png',
    promptMode: 'ai',
  });
});
