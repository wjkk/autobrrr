import test from 'node:test';
import assert from 'node:assert/strict';

import {
  collectPlannerAssetIds,
  mapPlannerLatestRun,
  readPlannerDebugApplySource,
} from './workspace-presenters.js';

test('collectPlannerAssetIds merges subject scene and shot asset ids', () => {
  const assetIds = collectPlannerAssetIds(
    [{ referenceAssetIdsJson: ['a', 'b'], generatedAssetIdsJson: ['c'] }],
    [{ referenceAssetIdsJson: ['d'], generatedAssetIdsJson: ['a', 'e'] }],
    [{ referenceAssetIdsJson: ['f'], generatedAssetIdsJson: ['c', 'g'] }],
  );

  assert.deepEqual(assetIds.sort(), ['a', 'b', 'c', 'd', 'e', 'f', 'g']);
});

test('mapPlannerLatestRun reads execution mode and timestamps', () => {
  const createdAt = new Date('2026-03-21T08:00:00.000Z');
  const finishedAt = new Date('2026-03-21T08:02:00.000Z');
  const result = mapPlannerLatestRun({
    id: 'run-1',
    status: 'SUCCEEDED',
    providerStatus: 'done',
    outputJson: {
      executionMode: 'live',
      generatedText: 'hello',
      structuredDoc: { ok: true },
    },
    errorCode: null,
    errorMessage: null,
    createdAt,
    finishedAt,
  });

  assert.deepEqual(result, {
    id: 'run-1',
    status: 'succeeded',
    executionMode: 'live',
    providerStatus: 'done',
    generatedText: 'hello',
    structuredDoc: { ok: true },
    errorCode: null,
    errorMessage: null,
    createdAt: createdAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
  });
});

test('readPlannerDebugApplySource extracts debug metadata', () => {
  assert.deepEqual(
    readPlannerDebugApplySource('DEBUG_APPLY', {
      appliedFromDebugRunId: 'debug-1',
      appliedFromDebugRunAt: '2026-03-21T08:00:00.000Z',
    }),
    {
      debugRunId: 'debug-1',
      appliedAt: '2026-03-21T08:00:00.000Z',
    },
  );

  assert.equal(readPlannerDebugApplySource('subject', null), null);
});
