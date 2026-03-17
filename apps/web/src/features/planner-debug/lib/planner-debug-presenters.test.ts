import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildPlannerResultPreview,
  buildPlannerResultSummary,
  readObject,
  readStringArray,
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

test('summarizePrompt returns stable char and line counts', () => {
  assert.deepEqual(summarizePrompt('第一行\n第二行'), { charCount: 7, lineCount: 2 });
  assert.deepEqual(summarizePrompt(''), { charCount: 0, lineCount: 0 });
});
