import test from 'node:test';
import assert from 'node:assert/strict';

import { __testables } from './planner-workspace-service.js';

test('resolvePlannerStage derives idle, outline and refinement states from session and outline presence', () => {
  assert.equal(__testables.resolvePlannerStage(null, null), 'idle');
  assert.equal(__testables.resolvePlannerStage({ outlineConfirmedAt: null }, { id: 'outline-1' }), 'outline');
  assert.equal(__testables.resolvePlannerStage({ outlineConfirmedAt: new Date('2026-03-17T00:00:00.000Z') }, { id: 'outline-1' }), 'refinement');
});

test('collectPlannerAssetIds deduplicates valid ids across subjects, scenes and shots', () => {
  const assetIds = __testables.collectPlannerAssetIds(
    [
      { referenceAssetIdsJson: ['asset-1', '', 'asset-2'], generatedAssetIdsJson: ['asset-2', 'asset-3'] },
      { referenceAssetIdsJson: null, generatedAssetIdsJson: ['asset-4'] },
    ],
    [{ referenceAssetIdsJson: ['asset-4', 'asset-5'], generatedAssetIdsJson: ['asset-1'] }],
    [{ referenceAssetIdsJson: ['asset-6'], generatedAssetIdsJson: ['asset-5', 'asset-7'] }],
  );

  assert.deepEqual(assetIds, ['asset-1', 'asset-2', 'asset-3', 'asset-4', 'asset-5', 'asset-6', 'asset-7']);
});

test('mapPlannerLatestRun normalizes outputJson and timestamps for planner workspace responses', () => {
  const mapped = __testables.mapPlannerLatestRun({
    id: 'run-1',
    status: 'COMPLETED',
    providerStatus: 'succeeded',
    outputJson: {
      executionMode: 'live',
      generatedText: '规划完成',
      structuredDoc: { acts: [] },
    },
    errorCode: null,
    errorMessage: null,
    createdAt: new Date('2026-03-17T00:00:00.000Z'),
    finishedAt: new Date('2026-03-17T00:00:05.000Z'),
  });

  assert.deepEqual(mapped, {
    id: 'run-1',
    status: 'completed',
    executionMode: 'live',
    providerStatus: 'succeeded',
    generatedText: '规划完成',
    structuredDoc: { acts: [] },
    errorCode: null,
    errorMessage: null,
    createdAt: '2026-03-17T00:00:00.000Z',
    finishedAt: '2026-03-17T00:00:05.000Z',
  });
});

test('mapPlannerLatestRun drops invalid output payloads to null fields', () => {
  const mapped = __testables.mapPlannerLatestRun({
    id: 'run-2',
    status: 'FAILED',
    providerStatus: null,
    outputJson: 'bad-payload',
    errorCode: 'PLANNER_ERROR',
    errorMessage: 'bad output',
    createdAt: new Date('2026-03-17T00:00:00.000Z'),
    finishedAt: null,
  });

  assert.deepEqual(mapped, {
    id: 'run-2',
    status: 'failed',
    executionMode: null,
    providerStatus: null,
    generatedText: null,
    structuredDoc: null,
    errorCode: 'PLANNER_ERROR',
    errorMessage: 'bad output',
    createdAt: '2026-03-17T00:00:00.000Z',
    finishedAt: null,
  });
});

test('readPlannerDebugApplySource extracts debug apply metadata from refinement snapshots', () => {
  assert.deepEqual(
    __testables.readPlannerDebugApplySource('debug_apply', {
      appliedFromDebugRunId: 'debug-run-12345678',
      appliedFromDebugRunAt: '2026-03-18T08:00:00.000Z',
    }),
    {
      debugRunId: 'debug-run-12345678',
      appliedAt: '2026-03-18T08:00:00.000Z',
    },
  );

  assert.deepEqual(
    __testables.readPlannerDebugApplySource('follow_up', {
      appliedFromDebugRunId: 'debug-run-2',
    }),
    {
      debugRunId: 'debug-run-2',
      appliedAt: null,
    },
  );

  assert.equal(__testables.readPlannerDebugApplySource('follow_up', null), null);
  assert.equal(__testables.readPlannerDebugApplySource('follow_up', { appliedFromDebugRunId: null }), null);
});
