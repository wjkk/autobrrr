import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildFallbackPlannerStructuredDoc,
  buildPlannerGenerationPrompt,
  parsePlannerStructuredDoc,
} from './planner-doc.js';

test('buildPlannerGenerationPrompt includes project, episode and user prompt context', () => {
  const prompt = buildPlannerGenerationPrompt({
    userPrompt: '做一个猫咪领地冲突短片',
    projectTitle: '小绿计划',
    episodeTitle: '第1集',
  });

  assert.match(prompt, /当前项目标题：小绿计划/);
  assert.match(prompt, /当前集标题：第1集/);
  assert.match(prompt, /用户需求：做一个猫咪领地冲突短片/);
  assert.match(prompt, /JSON schema:/);
});

test('buildFallbackPlannerStructuredDoc produces stable fallback structure from raw text', () => {
  const doc = buildFallbackPlannerStructuredDoc({
    userPrompt: '做一个猫咪领地冲突短片',
    projectTitle: '小绿计划',
    episodeTitle: '第1集',
    rawText: '这是一个关于领地冲突的故事。',
  });

  assert.equal(doc.projectTitle, '小绿计划');
  assert.equal(doc.episodeTitle, '第1集');
  assert.equal(doc.summaryBullets[0], '这是一个关于领地冲突的故事。');
  assert.equal(doc.subjects.length > 0, true);
  assert.equal(doc.acts[0]?.shots.length, 1);
});

test('parsePlannerStructuredDoc parses valid fenced json payloads', () => {
  const parsed = parsePlannerStructuredDoc({
    rawText: [
      '```json',
      JSON.stringify({
        projectTitle: '小绿计划',
        episodeTitle: '第1集',
        episodeCount: 1,
        pointCost: 38,
        summaryBullets: ['故事摘要'],
        highlights: [{ title: '亮点', description: '描述' }],
        styleBullets: ['风格'],
        subjectBullets: ['主体摘要'],
        subjects: [{ title: '主角', prompt: '角色提示词' }],
        sceneBullets: ['场景摘要'],
        scenes: [{ title: '客厅', prompt: '场景提示词' }],
        scriptSummary: ['三段式叙事'],
        acts: [
          {
            title: '第1幕',
            time: '夜晚',
            location: '客厅',
            shots: [
              {
                title: '分镜01-1',
                visual: '画面描述',
                composition: '构图设计',
                motion: '缓慢推进',
                voice: '旁白',
                line: '冲突开始',
              },
            ],
          },
        ],
      }),
      '```',
    ].join('\n'),
    userPrompt: '做一个猫咪领地冲突短片',
    projectTitle: '小绿计划',
    episodeTitle: '第1集',
  });

  assert.equal(parsed.projectTitle, '小绿计划');
  assert.equal(parsed.subjects[0]?.title, '主角');
  assert.equal(parsed.acts[0]?.shots[0]?.line, '冲突开始');
});

test('parsePlannerStructuredDoc falls back when json is missing or invalid', () => {
  const missingJson = parsePlannerStructuredDoc({
    rawText: '没有结构化 JSON，只有自然语言输出。',
    userPrompt: '做一个猫咪领地冲突短片',
    projectTitle: '小绿计划',
    episodeTitle: '第1集',
  });

  const invalidJson = parsePlannerStructuredDoc({
    rawText: '{"projectTitle":"坏数据"}',
    userPrompt: '做一个猫咪领地冲突短片',
    projectTitle: '小绿计划',
    episodeTitle: '第1集',
  });

  assert.equal(missingJson.projectTitle, '小绿计划');
  assert.equal(invalidJson.projectTitle, '小绿计划');
  assert.equal(missingJson.subjects.length > 0, true);
  assert.equal(invalidJson.acts.length > 0, true);
});
