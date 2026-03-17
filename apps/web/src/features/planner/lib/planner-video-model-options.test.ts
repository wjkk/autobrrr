import test from 'node:test';
import assert from 'node:assert/strict';

import { findPlannerVideoModelOption, PLANNER_VIDEO_MODEL_OPTIONS } from './planner-video-model-options';

test('planner video model options expose stable baseline choices', () => {
  assert.deepEqual(
    PLANNER_VIDEO_MODEL_OPTIONS.map((item) => item.id),
    ['ark-seedance-2-video', 'platou-veo-video', 'seko-video'],
  );
});

test('findPlannerVideoModelOption returns a matching option and null for empty or unknown values', () => {
  assert.equal(findPlannerVideoModelOption('ark-seedance-2-video')?.name, 'Seedance 2.0 多镜头');
  assert.equal(findPlannerVideoModelOption('unknown-model'), null);
  assert.equal(findPlannerVideoModelOption(null), null);
});
