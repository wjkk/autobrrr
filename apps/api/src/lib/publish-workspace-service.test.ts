import assert from 'node:assert/strict';
import test from 'node:test';

import { __testables } from './publish-workspace-service.js';

test('mapPublishSummary reports publishable counts and readyToPublish correctly', () => {
  assert.deepEqual(
    __testables.mapPublishSummary([
      { activeVersion: { status: 'ACTIVE' } },
      { activeVersion: { status: 'DRAFT' } },
      { activeVersion: null },
    ]),
    {
      totalShots: 3,
      publishableShotCount: 1,
      readyToPublish: false,
    },
  );

  assert.deepEqual(
    __testables.mapPublishSummary([
      { activeVersion: { status: 'ACTIVE' } },
      { activeVersion: { status: 'ACTIVE' } },
    ]),
    {
      totalShots: 2,
      publishableShotCount: 2,
      readyToPublish: true,
    },
  );
});

test('mapPublishActiveVersion normalizes media kind and status', () => {
  assert.deepEqual(
    __testables.mapPublishActiveVersion({
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
  assert.equal(__testables.mapPublishActiveVersion(null), null);
});
