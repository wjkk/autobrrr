import assert from 'node:assert/strict';
import test from 'node:test';

import { __testables } from './creation-workspace-service.js';

test('buildMaterialBindings keeps referenced assets only and normalizes kinds', () => {
  const assetMap = new Map([
    ['asset-1', {
      id: 'asset-1',
      sourceUrl: '/uploads/generated/asset-1.png',
      fileName: 'asset-1.png',
      mediaKind: 'IMAGE',
      sourceKind: 'GENERATED',
      createdAt: new Date('2026-03-17T10:00:00.000Z'),
    }],
  ]);

  const result = __testables.buildMaterialBindings(['asset-1', 'missing', 123], assetMap);

  assert.deepEqual(result, [{
    id: 'asset-1',
    sourceUrl: '/uploads/generated/asset-1.png',
    fileName: 'asset-1.png',
    mediaKind: 'image',
    sourceKind: 'generated',
    createdAt: '2026-03-17T10:00:00.000Z',
  }]);
});

test('buildLatestRunByShotId keeps the newest run per shot and ignores empty resource ids', () => {
  const result = __testables.buildLatestRunByShotId([
    {
      id: 'run-new',
      resourceId: 'shot-1',
      runType: 'VIDEO_GENERATION',
      status: 'RUNNING',
      modelEndpoint: null,
    },
    {
      id: 'run-old',
      resourceId: 'shot-1',
      runType: 'IMAGE_GENERATION',
      status: 'SUCCEEDED',
      modelEndpoint: null,
    },
    {
      id: 'run-empty',
      resourceId: null,
      runType: 'IMAGE_GENERATION',
      status: 'SUCCEEDED',
      modelEndpoint: null,
    },
  ]);

  assert.equal(result.get('shot-1')?.id, 'run-new');
  assert.equal(result.has(''), false);
});

test('mapLatestGenerationRun and mapActiveVersion normalize nested workspace shape', () => {
  assert.deepEqual(
    __testables.mapLatestGenerationRun({
      id: 'run-1',
      runType: 'VIDEO_GENERATION',
      status: 'FAILED',
      modelEndpoint: {
        id: 'endpoint-1',
        slug: 'ark-seedance-2-video',
        label: 'Seedance 2.0',
      },
    }),
    {
      id: 'run-1',
      runType: 'video_generation',
      status: 'failed',
      modelEndpoint: {
        id: 'endpoint-1',
        slug: 'ark-seedance-2-video',
        label: 'Seedance 2.0',
      },
    },
  );

  assert.deepEqual(
    __testables.mapActiveVersion({
      id: 'version-1',
      label: 'V1',
      mediaKind: 'VIDEO',
      status: 'ACTIVE',
    }),
    {
      id: 'version-1',
      label: 'V1',
      mediaKind: 'video',
      status: 'active',
    },
  );
});
