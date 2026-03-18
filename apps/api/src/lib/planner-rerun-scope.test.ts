import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getPlannerRerunScopeTriggerType,
  getPlannerRerunScopeUserLabel,
  normalizePlannerRerunScope,
  parseStoredPlannerRerunScope,
} from './planner-rerun-scope.js';

test('normalizePlannerRerunScope maps legacy scope to typed scope', () => {
  assert.deepEqual(
    normalizePlannerRerunScope({
      scope: 'shots_only',
      targetId: 'shot-1',
    }),
    {
      type: 'shot',
      shotIds: ['shot-1'],
    },
  );
});

test('normalizePlannerRerunScope accepts typed legacy scope strings for debug and stored payloads', () => {
  assert.deepEqual(
    normalizePlannerRerunScope({
      scope: 'act',
      targetId: 'act-2',
    }),
    {
      type: 'act',
      actId: 'act-2',
    },
  );
});

test('parseStoredPlannerRerunScope prefers typed rerunScope payload', () => {
  const parsed = parseStoredPlannerRerunScope({
    rerunScope: {
      type: 'act',
      actId: 'act-1',
    },
    scope: 'shots_only',
    targetEntityId: 'shot-legacy',
  });

  assert.deepEqual(parsed, {
    type: 'act',
    actId: 'act-1',
  });
});

test('trigger type and label are stable for shot reruns', () => {
  const scope = {
    type: 'shot' as const,
    shotIds: ['shot-1', 'shot-2'],
  };

  assert.equal(getPlannerRerunScopeTriggerType(scope), 'shots_only');
  assert.equal(getPlannerRerunScopeUserLabel(scope), 'shots:shot-1,shot-2');
});
