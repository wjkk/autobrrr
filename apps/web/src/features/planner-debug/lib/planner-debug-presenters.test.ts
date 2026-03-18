import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildPlannerEntityDebugView,
  buildPlannerResultPreview,
  buildPlannerResultSummary,
  readObject,
  readStringArray,
  summarizePlannerEntityLayerDiff,
  summarizePrompt,
} from './planner-debug-presenters';

test('readObject and readStringArray normalize unknown payloads safely', () => {
  assert.deepEqual(readObject(null), {});
  assert.deepEqual(readObject(['bad']), {});
  assert.deepEqual(readStringArray(['a', '', 1, 'b']), ['a', 'b']);
  assert.deepEqual(readStringArray(null), []);
});

test('buildPlannerResultPreview selects generated assets first for subjects, scenes and shots', () => {
  const preview = buildPlannerResultPreview(
    {
      plannerAssets: [
        { id: 'asset-ref', sourceUrl: 'https://ref.example/image.png', sourceKind: 'reference', createdAt: '2026-03-17T00:00:00.000Z' },
        { id: 'asset-gen', sourceUrl: 'https://gen.example/image.png', sourceKind: 'generated', createdAt: '2026-03-17T00:00:01.000Z' },
      ],
    },
    {
      structuredDoc: {
        subjects: [{ title: '主角', prompt: '角色提示词', referenceAssetIds: ['asset-ref'], generatedAssetIds: ['asset-gen'] }],
        scenes: [{ title: '客厅', prompt: '场景提示词', referenceAssetIds: ['asset-ref'] }],
        acts: [
          {
            title: '第1幕',
            shots: [{ title: '分镜1', visual: '画面描述', generatedAssetIds: ['asset-gen'] }],
          },
        ],
      },
    },
  );

  assert.equal(preview.subjects[0]?.imageUrl, 'https://gen.example/image.png');
  assert.equal(preview.scenes[0]?.imageUrl, 'https://ref.example/image.png');
  assert.equal(preview.shots[0]?.imageUrl, 'https://gen.example/image.png');
});

test('buildPlannerResultSummary computes completeness and missing fields for refinement payloads', () => {
  const summary = buildPlannerResultSummary({
    stage: 'refinement',
    documentTitle: '测试文档',
    assistantMessage: '已生成',
    structuredDoc: {
      projectTitle: '项目',
      episodeTitle: '第1集',
      summaryBullets: ['摘要'],
      highlights: [{ title: '亮点', description: '描述' }],
      styleBullets: ['风格'],
      subjectBullets: ['主体'],
      subjects: [{ title: '主角', prompt: '提示词' }],
      sceneBullets: ['场景'],
      scenes: [{ title: '客厅', prompt: '提示词' }],
      scriptSummary: ['摘要'],
      acts: [
        {
          title: '第1幕',
          shots: [{ title: '分镜1', visual: '视觉', composition: '', motion: '推进', voice: '旁白', line: '' }],
        },
      ],
    },
    stepAnalysis: [{ title: '步骤1' }],
    operations: { partial: true },
  });

  assert.equal(summary.stage, 'refinement');
  assert.equal(summary.subjectCount, 1);
  assert.equal(summary.shotCount, 1);
  assert.ok(summary.completenessScore < 100);
  assert.ok(summary.missingFields.includes('acts[0].shots[0].composition'));
  assert.ok(summary.missingFields.includes('acts[0].shots[0].line'));
});

test('buildPlannerEntityDebugView exposes raw, normalized and final entity layers', () => {
  const view = buildPlannerEntityDebugView(
    {
      assistantPackageInspection: {
        rawCandidate: {
          structuredDoc: {
            subjects: [{ title: '主角', prompt: '旧角色提示词' }],
            scenes: [{ title: '办公室', prompt: '旧场景提示词' }],
            acts: [{ shots: [{ title: '01', visual: '旧画面', subjectBindings: ['subject-old'] }] }],
          },
        },
        normalizedCandidate: {
          structuredDoc: {
            subjects: [{ title: '主角', prompt: '规范化角色提示词' }],
            scenes: [{ title: '办公室', prompt: '规范化场景提示词' }],
            acts: [{ shots: [{ title: '01', visual: '规范化画面', subjectBindings: ['subject-1'] }] }],
          },
        },
      },
    },
    {
      structuredDoc: {
        subjects: [{ title: '主角', prompt: '最终角色提示词' }],
        scenes: [{ title: '办公室', prompt: '最终场景提示词' }],
        acts: [{ shots: [{ title: '01', visual: '最终画面', subjectBindings: ['subject-1'] }] }],
      },
    },
  );

  assert.equal(view.raw.subjects[0]?.prompt, '旧角色提示词');
  assert.equal(view.normalized.shots[0]?.bindings[0], 'subject-1');
  assert.equal(view.final.scenes[0]?.prompt, '最终场景提示词');
  assert.equal(view.corrections.length, 4);
});

test('summarizePlannerEntityLayerDiff aggregates raw/normalized/final entity counts for A/B compare', () => {
  const summary = summarizePlannerEntityLayerDiff(
    {
      assistantPackageInspection: {
        rawCandidate: { structuredDoc: { subjects: [{ title: 'A', prompt: 'a' }] } },
        normalizedCandidate: { structuredDoc: { subjects: [{ title: 'A', prompt: 'a' }], scenes: [{ title: '场景', prompt: 'x' }] } },
      },
    },
    { structuredDoc: { subjects: [{ title: 'A', prompt: 'a' }], scenes: [{ title: '场景', prompt: 'x' }] } },
    {
      assistantPackageInspection: {
        rawCandidate: { structuredDoc: { subjects: [{ title: 'B', prompt: 'b' }], scenes: [] } },
        normalizedCandidate: { structuredDoc: { subjects: [{ title: 'B', prompt: 'b' }], scenes: [] } },
      },
    },
    { structuredDoc: { subjects: [{ title: 'B', prompt: 'b' }], scenes: [] } },
  );

  assert.match(summary, /实体纠偏：A 主体 1\/1\/1，场景 0\/1\/1；B 主体 1\/1\/1，场景 0\/0\/0。/);
});

test('summarizePrompt returns stable char and line counts', () => {
  assert.deepEqual(summarizePrompt('第一行\n第二行'), { charCount: 7, lineCount: 2 });
  assert.deepEqual(summarizePrompt(''), { charCount: 0, lineCount: 0 });
});
