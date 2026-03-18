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

test('buildFallbackPlannerStructuredDoc clamps oversized raw text to schema limits', () => {
  const rawText = '超长台词'.repeat(400);
  const doc = buildFallbackPlannerStructuredDoc({
    userPrompt: '做一个猫咪领地冲突短片',
    projectTitle: '小绿计划',
    episodeTitle: '第1集',
    rawText,
  });

  assert.equal(doc.summaryBullets[0].length <= 2000, true);
  assert.equal(doc.acts[0]?.shots[0]?.line.length <= 1000, true);
});

test('buildFallbackPlannerStructuredDoc extracts readable text from truncated assistant package json', () => {
  const rawText = `${'前置噪声'.repeat(300)}{"stage":"refinement","assistantMessage":"已完成细化。","structuredDoc":{"summaryBullets":["猫咪在雨夜守住自己的领地。"],"acts":[{"shots":[{"line":"守住这里。"}]}]`;
  const doc = buildFallbackPlannerStructuredDoc({
    userPrompt: '做一个猫咪领地冲突短片',
    projectTitle: '小绿计划',
    episodeTitle: '第1集',
    rawText,
  });

  assert.equal(doc.summaryBullets[0], '猫咪在雨夜守住自己的领地。');
  assert.equal(doc.acts[0]?.shots[0]?.line, '猫咪在雨夜守住自己的领地。');
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
        subjects: [{ entityType: 'subject', title: '主角', prompt: '角色提示词' }],
        sceneBullets: ['场景摘要'],
        scenes: [{ entityType: 'scene', title: '客厅', prompt: '场景提示词' }],
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
  assert.equal(parsed.subjects[0]?.entityType, 'subject');
  assert.equal(parsed.scenes[0]?.entityType, 'scene');
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

test('parsePlannerStructuredDoc sanitizes embedded json strings in summary and shot fields', () => {
  const parsed = parsePlannerStructuredDoc({
    rawText: JSON.stringify({
      projectTitle: '小绿计划',
      episodeTitle: '第1集',
      episodeCount: 1,
      pointCost: 38,
      summaryBullets: [
        JSON.stringify({
          structuredDoc: {
            summaryBullets: ['猫咪在雨夜守住自己的领地。'],
          },
        }),
      ],
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
              line: JSON.stringify({
                description: '低声说出守住地盘的决心。',
              }),
            },
          ],
        },
      ],
    }),
    userPrompt: '做一个猫咪领地冲突短片',
    projectTitle: '小绿计划',
    episodeTitle: '第1集',
  });

  assert.equal(parsed.summaryBullets[0], '猫咪在雨夜守住自己的领地。');
  assert.equal(parsed.acts[0]?.shots[0]?.line, '低声说出守住地盘的决心。');
});

test('parsePlannerStructuredDoc accepts balanced json prefix when provider appends trailing garbage', () => {
  const parsed = parsePlannerStructuredDoc({
    rawText: `${JSON.stringify({
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
    })}}"`,
    userPrompt: '做一个猫咪领地冲突短片',
    projectTitle: '小绿计划',
    episodeTitle: '第1集',
  });

  assert.equal(parsed.subjects[0]?.title, '主角');
  assert.equal(parsed.acts[0]?.shots[0]?.line, '冲突开始');
});

test('parsePlannerStructuredDoc upgrades generic scene, act and shot titles from semantic content', () => {
  const parsed = parsePlannerStructuredDoc({
    rawText: JSON.stringify({
      projectTitle: '失踪录像带',
      episodeTitle: '第1集',
      episodeCount: 1,
      pointCost: 38,
      summaryBullets: ['林墨开始调查。'],
      highlights: [{ title: '亮点', description: '描述' }],
      styleBullets: ['冷色调'],
      subjectBullets: ['林墨：调查记者'],
      subjects: [{ title: '林墨', prompt: '调查记者' }],
      sceneBullets: ['核心场景'],
      scenes: [{ title: '核心场景', prompt: '深夜档案室，文件柜林立，昏黄台灯照在案卷上。' }],
      scriptSummary: ['三幕悬疑'],
      acts: [
        {
          title: '第一幕',
          time: '深夜',
          location: '档案室',
          shots: [
            {
              title: '分镜01',
              visual: '林墨翻找旧案卷，停在一封匿名来信前。',
              composition: '近景',
              motion: '缓慢推近',
              voice: '林墨',
              line: '匿名来信终于出现了。',
            },
          ],
        },
      ],
    }),
    userPrompt: '做一个都市悬疑短剧',
    projectTitle: '失踪录像带',
    episodeTitle: '第1集',
  });

  assert.equal(parsed.sceneBullets[0], '深夜档案室');
  assert.equal(parsed.scenes[0]?.title, '深夜档案室');
  assert.equal(parsed.acts[0]?.title, '第1幕：匿名来信终于出现了');
  assert.equal(parsed.acts[0]?.shots[0]?.title, '分镜1-1-匿名来信终于出现了');
});

test('parsePlannerStructuredDoc reclassifies scene-like subjects and subject-like scenes', () => {
  const parsed = parsePlannerStructuredDoc({
    rawText: JSON.stringify({
      projectTitle: '失踪录像带',
      episodeTitle: '第1集',
      episodeCount: 1,
      pointCost: 38,
      summaryBullets: ['林墨追查匿名包裹的来源。'],
      highlights: [{ title: '亮点', description: '描述' }],
      styleBullets: ['冷峻写实'],
      subjectBullets: ['主体', '配角'],
      subjects: [
        { entityType: 'subject', title: '林墨', prompt: '调查记者，短发，神情克制，手持录音笔。' },
        { entityType: 'subject', title: '东郊废弃化工厂仓库', prompt: '深夜废弃仓库，铁门半掩，冷白顶灯忽明忽暗。' },
      ],
      sceneBullets: ['核心场景', '过渡场景'],
      scenes: [
        { entityType: 'scene', title: '匿名寄件人', prompt: '瘦削男人，雨衣遮面，站在阴影里回头。' },
        { entityType: 'scene', title: '深夜报社档案室', prompt: '文件柜林立，台灯昏黄，纸页散落桌面。' },
      ],
      scriptSummary: ['林墨在档案室发现线索，并将目标锁定到东郊废弃化工厂仓库。'],
      acts: [
        {
          title: '第1幕',
          time: '深夜',
          location: '报社档案室',
          shots: [
            {
              title: '分镜01',
              visual: '林墨翻看旧案卷。',
              composition: '近景',
              motion: '缓慢推近',
              voice: '林墨',
              line: '寄件人把仓库地址藏在旧报纸里。',
            },
          ],
        },
      ],
    }),
    userPrompt: '做一个都市悬疑短剧',
    projectTitle: '失踪录像带',
    episodeTitle: '第1集',
  });

  assert.deepEqual(
    parsed.subjects.map((item) => item.title),
    ['林墨', '匿名寄件人'],
  );
  assert.deepEqual(
    parsed.subjects.map((item) => item.entityType),
    ['subject', 'subject'],
  );
  assert.deepEqual(
    parsed.scenes.map((item) => item.title),
    ['深夜报社档案室', '东郊废弃化工厂仓库'],
  );
  assert.deepEqual(
    parsed.scenes.map((item) => item.entityType),
    ['scene', 'scene'],
  );
  assert.equal(parsed.subjectBullets[0], '林墨：调查记者，短发，神情克制，手持录音笔。');
  assert.equal(parsed.subjectBullets[1], '匿名寄件人：瘦削男人，雨衣遮面，站在阴影里回头。');
  assert.equal(parsed.sceneBullets[0], '深夜报社档案室');
  assert.equal(parsed.sceneBullets[1], '东郊废弃化工厂仓库');
});

test('parsePlannerStructuredDoc keeps explicit entityType when declaration and semantics agree', () => {
  const parsed = parsePlannerStructuredDoc({
    rawText: JSON.stringify({
      projectTitle: '失踪录像带',
      episodeTitle: '第1集',
      episodeCount: 1,
      pointCost: 38,
      summaryBullets: ['林墨追查匿名包裹的来源。'],
      highlights: [{ title: '亮点', description: '描述' }],
      styleBullets: ['冷峻写实'],
      subjectBullets: ['林墨：调查记者，短发，神情克制。'],
      subjects: [
        { entityType: 'subject', title: '林墨', prompt: '调查记者，短发，神情克制，手持录音笔。' },
      ],
      sceneBullets: ['深夜报社档案室'],
      scenes: [
        { entityType: 'scene', title: '深夜报社档案室', prompt: '文件柜林立，台灯昏黄，纸页散落桌面。' },
      ],
      scriptSummary: ['林墨在档案室发现线索。'],
      acts: [
        {
          title: '第1幕',
          time: '深夜',
          location: '报社档案室',
          shots: [
            {
              title: '分镜01',
              visual: '林墨翻看旧案卷。',
              composition: '近景',
              motion: '缓慢推近',
              voice: '林墨',
              line: '寄件人把地址藏在旧报纸里。',
            },
          ],
        },
      ],
    }),
    userPrompt: '做一个都市悬疑短剧',
    projectTitle: '失踪录像带',
    episodeTitle: '第1集',
  });

  assert.equal(parsed.subjects[0]?.entityType, 'subject');
  assert.equal(parsed.scenes[0]?.entityType, 'scene');
});
