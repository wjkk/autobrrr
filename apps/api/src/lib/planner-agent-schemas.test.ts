import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildFallbackPlannerOutlineAssistantPackage,
  buildFallbackPlannerRefinementAssistantPackage,
  parsePlannerAssistantPackage,
} from './planner-agent-schemas.js';

const defaultSteps = [
  { id: 'step-1', title: 'Step 1', status: 'done' as const, details: ['完成'] },
];

test('planner agent schema fallback packages lock outline and refinement defaults', () => {
  const outline = buildFallbackPlannerOutlineAssistantPackage({
    userPrompt: '做一个校园悬疑短剧',
    projectTitle: '谜雾校园',
    contentType: '短剧漫剧',
    subtype: '悬疑',
    contentMode: 'series',
    generatedText: '围绕校园秘密展开多集剧情。',
  });
  const refinement = buildFallbackPlannerRefinementAssistantPackage({
    userPrompt: '做一个校园悬疑短剧',
    projectTitle: '谜雾校园',
    episodeTitle: '第1集',
    generatedText: '完成细化。',
    defaultSteps,
    contentType: '短剧漫剧',
    subtype: '悬疑',
  });

  assert.equal(outline.stage, 'outline');
  assert.equal(outline.operations.confirmOutline, true);
  assert.equal(outline.outlineDoc.format, 'series');
  assert.equal(refinement.stage, 'refinement');
  assert.equal(refinement.operations.replaceDocument, true);
  assert.equal(refinement.stepAnalysis[0]?.id, 'step-1');
});

test('parsePlannerAssistantPackage accepts matching stage payload and falls back on stage mismatch or invalid json', () => {
  const parsed = parsePlannerAssistantPackage({
    targetStage: 'outline',
    rawText: [
      '```json',
      JSON.stringify({
        stage: 'outline',
        assistantMessage: '已生成大纲',
        documentTitle: '谜雾校园',
        outlineDoc: {
          projectTitle: '谜雾校园',
          contentType: 'drama',
          subtype: '悬疑',
          format: 'single',
          episodeCount: 1,
          genre: '校园悬疑',
          toneStyle: ['紧张'],
          premise: '主角发现档案后卷入事件。',
          mainCharacters: [{ id: 'c1', name: '林夏', role: '主角', description: '学生侦探' }],
          storyArc: [{ episodeNo: 1, title: '档案室', summary: '进入档案室' }],
          constraints: [],
          openQuestions: [],
        },
        operations: {
          replaceDocument: false,
          generateStoryboard: false,
          confirmOutline: true,
        },
      }),
      '```',
    ].join('\n'),
    userPrompt: '做一个校园悬疑短剧',
    projectTitle: '谜雾校园',
    episodeTitle: '第1集',
    defaultSteps,
    contentType: '短剧漫剧',
    subtype: '悬疑',
    contentMode: 'single',
  });

  const mismatch = parsePlannerAssistantPackage({
    targetStage: 'outline',
    rawText: JSON.stringify({
      stage: 'refinement',
      assistantMessage: '错误阶段',
      stepAnalysis: defaultSteps,
      structuredDoc: {
        projectTitle: '谜雾校园',
        episodeTitle: '第1集',
        episodeCount: 1,
        pointCost: 38,
        summaryBullets: ['摘要'],
        highlights: [{ title: '亮点', description: '说明' }],
        styleBullets: ['风格'],
        subjectBullets: ['主体'],
        subjects: [{ title: '主角', prompt: '提示词' }],
        sceneBullets: ['场景'],
        scenes: [{ title: '场景', prompt: '提示词' }],
        scriptSummary: ['摘要'],
        acts: [{ title: '第一幕', time: '', location: '', shots: [{ title: '01', visual: '画面', composition: '构图', motion: '运镜', voice: '旁白', line: '台词' }] }],
      },
      operations: { replaceDocument: true, generateStoryboard: false, confirmOutline: false },
    }),
    userPrompt: '做一个校园悬疑短剧',
    projectTitle: '谜雾校园',
    episodeTitle: '第1集',
    defaultSteps,
    contentType: '短剧漫剧',
    subtype: '悬疑',
    contentMode: 'single',
  });

  const invalid = parsePlannerAssistantPackage({
    targetStage: 'refinement',
    rawText: '{"broken":true}',
    userPrompt: '做一个校园悬疑短剧',
    projectTitle: '谜雾校园',
    episodeTitle: '第1集',
    defaultSteps,
    contentType: '短剧漫剧',
    subtype: '悬疑',
    contentMode: 'single',
  });

  assert.equal(parsed.stage, 'outline');
  assert.equal(parsed.documentTitle, '谜雾校园');
  assert.equal(mismatch.stage, 'outline');
  assert.equal(mismatch.operations.confirmOutline, true);
  assert.equal(invalid.stage, 'refinement');
  assert.equal(invalid.stepAnalysis[0]?.id, 'step-1');
});
