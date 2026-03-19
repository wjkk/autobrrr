import test from 'node:test';
import assert from 'node:assert/strict';

import type { PlannerStructuredDoc } from '../doc/planner-doc.js';
import { applyPartialRerunScope, buildPartialDiffSummary } from './partial.js';

const previousDoc: PlannerStructuredDoc = {
  projectTitle: '项目',
  episodeTitle: '第1集',
  episodeCount: 1,
  pointCost: 38,
  summaryBullets: ['摘要'],
  highlights: [{ title: '亮点', description: '描述' }],
  styleBullets: ['风格'],
  subjectBullets: ['主体'],
  subjects: [{ title: '主角', prompt: '旧主体提示词' }],
  sceneBullets: ['场景'],
  scenes: [{ title: '客厅', prompt: '旧场景提示词' }],
  scriptSummary: ['剧本摘要'],
  acts: [
    {
      title: '第1幕',
      time: '夜',
      location: '客厅',
      shots: [
        {
          title: '分镜1',
          visual: '旧视觉',
          composition: '旧构图',
          motion: '旧运镜',
          voice: '旁白',
          line: '旧台词',
        },
        {
          title: '分镜2',
          visual: '视觉2',
          composition: '构图2',
          motion: '运镜2',
          voice: '旁白',
          line: '台词2',
        },
      ],
    },
  ],
};

test('applyPartialRerunScope replaces only targeted shot payloads for shot reruns', () => {
  const nextDoc: PlannerStructuredDoc = {
    ...previousDoc,
    acts: [
      {
        ...previousDoc.acts[0],
        shots: [
          {
            ...previousDoc.acts[0].shots[0],
            visual: '新视觉',
            composition: '新构图',
          },
        ],
      },
    ],
  };

  const merged = applyPartialRerunScope({
    previousDoc,
    nextDoc,
    input: {
      rerunScope: { type: 'shot', shotIds: ['shot-1'] },
      targetEntity: [{ title: '分镜1' }],
    },
  });

  assert.equal(merged.acts[0].shots[0].visual, '新视觉');
  assert.equal(merged.acts[0].shots[1].visual, '视觉2');
});

test('buildPartialDiffSummary highlights changed fields for subject, scene and shot reruns', () => {
  const nextDoc: PlannerStructuredDoc = {
    ...previousDoc,
    subjects: [{ title: '主角', prompt: '新主体提示词' }],
    scenes: [{ title: '客厅', prompt: '新场景提示词' }],
    acts: [
      {
        ...previousDoc.acts[0],
        shots: [
          {
            ...previousDoc.acts[0].shots[0],
            visual: '新视觉',
            composition: '新构图',
            motion: '新运镜',
            line: '新台词',
          },
          previousDoc.acts[0].shots[1],
        ],
      },
    ],
  };

  assert.deepEqual(
    buildPartialDiffSummary({
      previousDoc,
      nextDoc,
      input: { rerunScope: { type: 'subject', subjectId: 'subject-1' }, targetEntity: { title: '主角' } },
    }),
    ['已局部更新主体：主角', '主体设定提示词已更新'],
  );

  assert.deepEqual(
    buildPartialDiffSummary({
      previousDoc,
      nextDoc,
      input: { rerunScope: { type: 'scene', sceneId: 'scene-1' }, targetEntity: { title: '客厅' } },
    }),
    ['已局部更新场景：客厅', '场景描述与提示词已更新'],
  );

  const shotSummary = buildPartialDiffSummary({
    previousDoc,
    nextDoc,
    input: { rerunScope: { type: 'shot', shotIds: ['shot-1'] }, targetEntity: [{ title: '分镜1' }] },
  });
  assert.ok(shotSummary.includes('已局部重写分镜：分镜1'));
  assert.ok(shotSummary.includes('分镜1 画面描述已调整'));
  assert.ok(shotSummary.includes('分镜1 构图设计已调整'));
  assert.ok(shotSummary.includes('分镜1 运镜调度已调整'));
  assert.ok(shotSummary.includes('分镜1 台词内容已调整'));
});

test('applyPartialRerunScope returns previous doc when rerun scope is missing or target is unresolved', () => {
  assert.equal(
    applyPartialRerunScope({ previousDoc, nextDoc: previousDoc, input: {} }),
    previousDoc,
  );
  assert.equal(
    buildPartialDiffSummary({ previousDoc, nextDoc: previousDoc, input: {} }).length,
    0,
  );
});
