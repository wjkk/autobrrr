import assert from 'node:assert/strict';
import test from 'node:test';

import { __testables } from './access.js';

test('verifyOwnedPlannerImageAssetsWithDeps short-circuits empty asset ids', async () => {
  const result = await __testables.verifyOwnedPlannerImageAssetsWithDeps(
    {
      assetIds: [],
      projectId: 'project-1',
      userId: 'user-1',
    },
    {
      prisma: {
        asset: {
          findMany: async () => {
            throw new Error('should not query');
          },
        },
      } as never,
    },
  );

  assert.equal(result, true);
});

test('verifyOwnedPlannerImageAssetsWithDeps validates ownership against deduped ids', async () => {
  const result = await __testables.verifyOwnedPlannerImageAssetsWithDeps(
    {
      assetIds: ['asset-1', 'asset-1', 'asset-2'],
      projectId: 'project-1',
      userId: 'user-1',
    },
    {
      prisma: {
        asset: {
          findMany: async () => [{ id: 'asset-1' }, { id: 'asset-2' }],
        },
      } as never,
    },
  );

  assert.equal(result, true);
});

test('verifyOwnedPlannerImageAssetsWithDeps returns false when any asset is missing', async () => {
  const result = await __testables.verifyOwnedPlannerImageAssetsWithDeps(
    {
      assetIds: ['asset-1', 'asset-2'],
      projectId: 'project-1',
      userId: 'user-1',
    },
    {
      prisma: {
        asset: {
          findMany: async () => [{ id: 'asset-1' }],
        },
      } as never,
    },
  );

  assert.equal(result, false);
});
