import assert from 'node:assert/strict';
import test from 'node:test';

import { findPlannerShot } from './planner-shot-editor';

test('findPlannerShot returns null for empty pointer or unknown act/shot', () => {
  const acts = [
    {
      id: 'act-1',
      title: '第一幕',
      time: '白天',
      location: '室内',
      shots: [
        {
          id: 'shot-1',
          title: '镜头 1',
          image: undefined,
          visual: 'visual',
          composition: 'composition',
          motion: 'motion',
          voice: 'voice',
          line: 'line',
        },
      ],
    },
  ];

  assert.equal(findPlannerShot(acts, null), null);
  assert.equal(findPlannerShot(acts, { actId: 'missing', shotId: 'shot-1' }), null);
  assert.equal(findPlannerShot(acts, { actId: 'act-1', shotId: 'missing' }), null);
});

test('findPlannerShot returns the matched shot when act and shot ids align', () => {
  const shot = {
    id: 'shot-1',
    title: '镜头 1',
    image: undefined,
    visual: 'visual',
    composition: 'composition',
    motion: 'motion',
    voice: 'voice',
    line: 'line',
  };
  const acts = [
    {
      id: 'act-1',
      title: '第一幕',
      time: '白天',
      location: '室内',
      shots: [shot],
    },
  ];

  assert.equal(findPlannerShot(acts, { actId: 'act-1', shotId: 'shot-1' }), shot);
});
