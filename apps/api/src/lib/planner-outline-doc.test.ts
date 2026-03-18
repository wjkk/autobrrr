import test from 'node:test';
import assert from 'node:assert/strict';

import { buildFallbackPlannerOutlineDoc, buildPlannerOutlineRefinementHints, parsePlannerOutlineDoc } from './planner-outline-doc.js';

test('buildFallbackPlannerOutlineDoc normalizes content type and series defaults', () => {
  const doc = buildFallbackPlannerOutlineDoc({
    userPrompt: '做一个校园悬疑短剧',
    projectTitle: '谜雾校园',
    contentType: '音乐MV',
    subtype: '悬疑',
    contentMode: 'series',
    rawText: '围绕校园秘密展开多集剧情。',
  });

  assert.equal(doc.contentType, 'mv');
  assert.equal(doc.format, 'series');
  assert.equal(doc.episodeCount, 6);
  assert.equal(doc.storyArc[0]?.summary, '围绕校园秘密展开多集剧情。');
});

test('parsePlannerOutlineDoc parses valid fenced json and preserves explicit fields', () => {
  const doc = parsePlannerOutlineDoc({
    rawText: [
      '```json',
      JSON.stringify({
        projectTitle: '谜雾校园',
        contentType: 'drama',
        subtype: '悬疑',
        format: 'single',
        episodeCount: 1,
        targetDurationSeconds: 90,
        genre: '校园悬疑',
        toneStyle: ['紧张', '克制'],
        premise: '一名学生发现旧档案后卷入事件。',
        mainCharacters: [
          { id: 'character-1', name: '林夏', role: '主角', description: '寻找真相的学生' },
        ],
        storyArc: [
          { episodeNo: 1, title: '档案室', summary: '林夏进入档案室寻找线索。' },
        ],
        constraints: ['控制在 90 秒内'],
        openQuestions: ['档案是谁留下的？'],
      }),
      '```',
    ].join('\n'),
    userPrompt: '做一个校园悬疑短剧',
    projectTitle: '谜雾校园',
    contentType: '短剧漫剧',
    subtype: '悬疑',
    contentMode: 'single',
  });

  assert.equal(doc.projectTitle, '谜雾校园');
  assert.equal(doc.targetDurationSeconds, 90);
  assert.equal(doc.mainCharacters[0]?.name, '林夏');
  assert.equal(doc.storyArc[0]?.title, '档案室');
});

test('parsePlannerOutlineDoc falls back when json is missing or invalid', () => {
  const missing = parsePlannerOutlineDoc({
    rawText: '没有结构化 JSON，只给出自然语言摘要。',
    userPrompt: '做一个校园悬疑短剧',
    projectTitle: '谜雾校园',
    contentType: '知识分享',
    subtype: '悬疑',
    contentMode: 'single',
  });
  const invalid = parsePlannerOutlineDoc({
    rawText: '{"projectTitle":"缺字段"}',
    userPrompt: '做一个校园悬疑短剧',
    projectTitle: '谜雾校园',
    contentType: '短剧漫剧',
    subtype: '悬疑',
    contentMode: 'single',
  });

  assert.equal(missing.contentType, 'knowledge');
  assert.equal(missing.mainCharacters[0]?.name, '主角');
  assert.equal(invalid.projectTitle, '谜雾校园');
  assert.equal(invalid.storyArc[0]?.episodeNo, 1);
});

test('parsePlannerOutlineDoc sanitizes embedded json strings in outline display fields', () => {
  const doc = parsePlannerOutlineDoc({
    rawText: JSON.stringify({
      projectTitle: '谜雾校园',
      contentType: 'drama',
      subtype: '悬疑',
      format: 'single',
      episodeCount: 1,
      genre: '校园悬疑',
      toneStyle: ['紧张'],
      premise: JSON.stringify({
        outlineDoc: {
          核心主题: '学生记者追查旧档案背后的失踪案。',
        },
      }),
      mainCharacters: [
        {
          id: 'c1',
          name: '林夏',
          role: '记者',
          description: JSON.stringify({
            description: '执着追查真相的校园记者。',
          }),
        },
      ],
      storyArc: [
        {
          episodeNo: 1,
          title: '档案室',
          summary: JSON.stringify({
            assistantMessage: '林夏深夜潜入档案室寻找线索。',
          }),
        },
      ],
      constraints: [],
      openQuestions: [],
    }),
    userPrompt: '做一个校园悬疑短剧',
    projectTitle: '谜雾校园',
    contentType: '短剧漫剧',
    subtype: '悬疑',
    contentMode: 'single',
  });

  assert.equal(doc.premise, '学生记者追查旧档案背后的失踪案。');
  assert.equal(doc.mainCharacters[0]?.description, '执着追查真相的校园记者。');
  assert.equal(doc.storyArc[0]?.summary, '林夏深夜潜入档案室寻找线索。');
});

test('buildFallbackPlannerOutlineDoc extracts readable text from malformed json-like raw text', () => {
  const doc = buildFallbackPlannerOutlineDoc({
    userPrompt: '做一个校园悬疑短剧',
    projectTitle: '谜雾校园',
    contentType: '短剧漫剧',
    subtype: '悬疑',
    contentMode: 'single',
    rawText: `${'前置噪声'.repeat(200)}{"stage":"outline","outlineDoc":{"核心主题":"学生记者追查旧档案背后的失踪案。"},"assistantMessage":"已生成大纲。`,
  });

  assert.equal(doc.premise, '学生记者追查旧档案背后的失踪案。');
  assert.equal(doc.storyArc[0]?.summary, '学生记者追查旧档案背后的失踪案。');
});

test('buildPlannerOutlineRefinementHints extracts character, location and structure hints', () => {
  const hints = buildPlannerOutlineRefinementHints({
    projectTitle: '谜雾校园',
    contentType: 'drama',
    subtype: '悬疑',
    format: 'series',
    episodeCount: 6,
    genre: '校园悬疑',
    toneStyle: ['紧张', '克制'],
    premise: '学生记者重返旧校舍调查失踪案。',
    mainCharacters: [
      { id: 'c1', name: '林夏', role: '学生记者', description: '执着追查失踪案真相。' },
    ],
    storyArc: [
      { episodeNo: 1, title: '夜探档案室', summary: '林夏进入旧校舍档案室寻找线索。' },
      { episodeNo: 2, title: '走廊对峙', summary: '她在昏暗走廊被保安老周拦下。' },
    ],
    constraints: ['每集 90 秒内完成起承转合'],
    openQuestions: [],
  });

  assert.deepEqual(hints, {
    characterHints: ['林夏：学生记者，执着追查失踪案真相。'],
    locationHints: ['夜探档案室：林夏进入旧校舍档案室寻找线索。', '走廊对峙：她在昏暗走廊被保安老周拦下。'],
    structureHints: [
      '叙事形式：系列，共 6 集',
      '题材类型：校园悬疑',
      '整体风格：紧张、克制',
      '剧情结构：夜探档案室 -> 走廊对峙',
      '约束：每集 90 秒内完成起承转合',
    ],
  });
});
