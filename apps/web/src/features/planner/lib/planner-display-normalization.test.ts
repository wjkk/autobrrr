import test from 'node:test';
import assert from 'node:assert/strict';

import { sanitizePlannerOutlineDoc, sanitizePlannerStructuredDoc, summarizePlannerDisplayText } from './planner-display-normalization';

test('sanitizePlannerOutlineDoc strips embedded assistant-package json from premise and story summaries', () => {
  const outline = sanitizePlannerOutlineDoc({
    projectTitle: '失踪录像带',
    contentType: 'drama',
    subtype: '对话剧情',
    format: 'single',
    episodeCount: 1,
    genre: '都市悬疑',
    toneStyle: ['紧张'],
    premise: JSON.stringify({
      stage: '策划剧本大纲',
      assistantMessage: '已完成都市悬疑大纲整理。',
      outlineDoc: {
        核心主题: '女记者追查失踪录像带背后的地下交易。',
      },
    }),
    mainCharacters: [
      {
        id: 'c1',
        name: '林墨',
        role: '记者',
        description: '执着调查真相。',
      },
    ],
    storyArc: [
      {
        episodeNo: 1,
        title: '第一集',
        summary: JSON.stringify({
          stage: '策划剧本大纲',
          assistantMessage: '已生成可确认的大纲版本。',
        }),
      },
    ],
    constraints: [],
    openQuestions: [],
  });

  assert.equal(outline.premise, '女记者追查失踪录像带背后的地下交易。');
  assert.equal(outline.storyArc[0]?.summary, '已生成可确认的大纲版本。');
});

test('sanitizePlannerStructuredDoc strips embedded assistant-package json from summary and shot line', () => {
  const doc = sanitizePlannerStructuredDoc({
    projectTitle: '失踪录像带',
    episodeTitle: '第1集',
    episodeCount: 1,
    pointCost: 38,
    summaryBullets: [
      JSON.stringify({
        stage: 'refinement',
        assistantMessage: '已完成细化。',
        structuredDoc: {
          summaryBullets: ['林墨在雨夜收到匿名录像带。'],
        },
      }),
    ],
    highlights: [{ title: '亮点', description: '节奏紧凑' }],
    styleBullets: ['冷色调'],
    subjectBullets: ['林墨'],
    subjects: [{ title: '林墨', prompt: '女记者' }],
    sceneBullets: ['雨夜公寓'],
    scenes: [{ title: '雨夜公寓', prompt: '走廊' }],
    scriptSummary: ['第一幕收到线索'],
    acts: [
      {
        title: '第一幕',
        time: '夜晚',
        location: '公寓',
        shots: [
          {
            title: '分镜01',
            visual: '林墨拆包裹',
            composition: '近景',
            motion: '推镜',
            voice: '旁白',
            line: JSON.stringify({
              stage: 'refinement',
              assistantMessage: '已完成细化。',
            }),
          },
        ],
      },
    ],
  });

  assert.equal(doc.summaryBullets[0], '林墨在雨夜收到匿名录像带。');
  assert.equal(doc.acts[0]?.shots[0]?.line, '已完成细化。');
});

test('summarizePlannerDisplayText falls back to assistant message for raw outline payload strings', () => {
  const summary = summarizePlannerDisplayText(JSON.stringify({
    stage: '策划剧本大纲',
    assistantMessage: '已完成都市悬疑大纲整理。',
    documentTitle: '失踪录像带',
  }));

  assert.equal(summary, '已完成都市悬疑大纲整理。');
});

test('summarizePlannerDisplayText extracts readable text from truncated assistant-package json strings', () => {
  const summary = summarizePlannerDisplayText(
    '{"stage":"refinement","assistantMessage":"已完成细化。","structuredDoc":{"summaryBullets":["猫咪在雨夜守住自己的领地。"],"acts":[{"shots":[{"line":"守住这里。"}]}]',
  );

  assert.equal(summary, '猫咪在雨夜守住自己的领地。');
});
