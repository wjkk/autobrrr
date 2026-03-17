import test from 'node:test';
import assert from 'node:assert/strict';

import { buildFallbackPlannerOutlineDoc, parsePlannerOutlineDoc } from './planner-outline-doc.js';

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
