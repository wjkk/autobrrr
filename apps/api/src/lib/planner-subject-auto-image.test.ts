import test from 'node:test';
import assert from 'node:assert/strict';

import { __testables } from './planner-subject-auto-image.js';

test('buildPlannerSubjectAutoImageInput preserves planner subject fields for catalog generation', () => {
  assert.deepEqual(__testables.buildPlannerSubjectAutoImageInput({
    name: '雪球',
    subjectType: 'animal',
    description: '一只白色长毛猫，眼神警觉。',
    modelFamily: 'seedream-3.0',
    modelEndpoint: 'seedream-default',
  }), {
    name: '雪球',
    subjectType: 'animal',
    description: '一只白色长毛猫，眼神警觉。',
    modelFamily: 'seedream-3.0',
    modelEndpoint: 'seedream-default',
  });
});
