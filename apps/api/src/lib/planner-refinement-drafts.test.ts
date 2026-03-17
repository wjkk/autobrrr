import test from 'node:test';
import assert from 'node:assert/strict';

import { Prisma } from '@prisma/client';

import { __testables } from './planner-refinement-drafts.js';

test('isPlannerRefinementConfirmed only returns true for explicit confirmed versions', () => {
  assert.equal(__testables.isPlannerRefinementConfirmed({ isConfirmed: true }), true);
  assert.equal(__testables.isPlannerRefinementConfirmed({ isConfirmed: false }), false);
  assert.equal(__testables.isPlannerRefinementConfirmed({}), false);
});

test('remapAssetIdBindings remaps known ids and preserves unknown values', () => {
  const remapped = __testables.remapAssetIdBindings(['subject-1', 'subject-2', 3], new Map([
    ['subject-1', 'subject-a'],
  ]));

  assert.deepEqual(remapped, ['subject-a', 'subject-2', 3]);
  assert.equal(__testables.remapAssetIdBindings(null, new Map()), null);
});

test('remapStructuredDocEntityKeys remaps subject, scene and shot entity keys when structured doc is valid', () => {
  const remapped = __testables.remapStructuredDocEntityKeys({
    structuredDocJson: {
      projectTitle: '测试项目',
      episodeTitle: '第1集',
      episodeCount: 1,
      pointCost: 38,
      summaryBullets: ['故事摘要'],
      highlights: [{ title: '亮点', description: '亮点描述' }],
      styleBullets: ['风格描述'],
      subjectBullets: ['主体摘要'],
      subjects: [{ entityKey: 'subject-1', title: '主角', prompt: '角色提示词' }],
      sceneBullets: ['场景摘要'],
      scenes: [{ entityKey: 'scene-1', title: '客厅', prompt: '场景提示词' }],
      scriptSummary: ['剧本摘要'],
      acts: [
        {
          title: '第一幕',
          time: '夜',
          location: '客厅',
          shots: [
            {
              entityKey: 'shot-1',
              title: '开场',
              visual: '画面描述',
              composition: '构图描述',
              motion: '镜头运动',
              voice: '旁白',
              line: '台词内容',
              subjectBindings: [],
            },
          ],
        },
      ],
    } satisfies Prisma.JsonValue,
    subjectIdMap: new Map([['subject-1', 'subject-a']]),
    sceneIdMap: new Map([['scene-1', 'scene-a']]),
    shotIdMap: new Map([['shot-1', 'shot-a']]),
  });

  assert.equal((remapped as any).subjects[0].entityKey, 'subject-a');
  assert.equal((remapped as any).scenes[0].entityKey, 'scene-a');
  assert.equal((remapped as any).acts[0].shots[0].entityKey, 'shot-a');
});

test('remapStructuredDocEntityKeys returns original payload when structured doc is invalid', () => {
  const invalid = { broken: true } satisfies Prisma.JsonValue;
  assert.equal(
    __testables.remapStructuredDocEntityKeys({
      structuredDocJson: invalid,
      subjectIdMap: new Map(),
      sceneIdMap: new Map(),
      shotIdMap: new Map(),
    }),
    invalid,
  );
});
