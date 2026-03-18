import assert from 'node:assert/strict';
import test from 'node:test';

import type { PlannerOutlineDoc } from './planner-outline-doc';
import { choosePlannerAssetUrl, outlineToPreviewStructuredPlannerDoc, toStructuredPlannerDoc } from './planner-structured-doc';

test('choosePlannerAssetUrl prefers generated assets and then newer timestamps', () => {
  const result = choosePlannerAssetUrl([
    {
      sourceUrl: 'https://example.com/reference-old.png',
      sourceKind: 'reference',
      createdAt: '2026-03-17T08:00:00.000Z',
    },
    {
      sourceUrl: 'https://example.com/generated-new.png',
      sourceKind: 'generated',
      createdAt: '2026-03-17T10:00:00.000Z',
    },
    {
      sourceUrl: 'https://example.com/generated-old.png',
      sourceKind: 'generated',
      createdAt: '2026-03-17T09:00:00.000Z',
    },
  ]);

  assert.equal(result, 'https://example.com/generated-new.png');
});

test('outlineToPreviewStructuredPlannerDoc builds preview doc from outline data', () => {
  const outline: PlannerOutlineDoc = {
    projectTitle: '赛博追凶',
    contentType: 'drama',
    subtype: 'suspense',
    format: 'series',
    episodeCount: 12,
    genre: '悬疑',
    toneStyle: ['冷色霓虹', '压迫节奏'],
    premise: '一枚神秘芯片引发连环失踪案。',
    mainCharacters: [
      {
        id: 'char-1',
        name: '林修',
        role: '主角',
        description: '前刑警，擅长数据追踪',
      },
    ],
    storyArc: [
      {
        episodeNo: 1,
        title: '失控的线索',
        summary: '主角卷入第一起离奇失踪案。',
      },
      {
        episodeNo: 2,
        title: '黑市回声',
        summary: '追查芯片来源，线索指向地下交易。',
      },
    ],
    constraints: [],
    openQuestions: [],
  };

  const result = outlineToPreviewStructuredPlannerDoc(outline);

  assert.equal(result.projectTitle, '赛博追凶');
  assert.equal(result.episodeTitle, '失控的线索');
  assert.deepEqual(result.summaryBullets, ['一枚神秘芯片引发连环失踪案。']);
  assert.deepEqual(result.sceneBullets, [
    '失控的线索：主角卷入第一起离奇失踪案。',
    '黑市回声：追查芯片来源，线索指向地下交易。',
  ]);
  assert.deepEqual(result.subjects, [
    {
      entityType: 'subject',
      title: '林修',
      prompt: '主角，前刑警，擅长数据追踪',
      referenceAssetIds: [],
      generatedAssetIds: [],
    },
  ]);
  assert.equal(result.scenes[0]?.entityType, 'scene');
  assert.equal(result.scenes[0]?.title, '失控的线索');
  assert.deepEqual(result.scriptSummary, [
    '叙事形式：系列，共 12 集',
    '题材类型：悬疑',
    '整体风格：冷色霓虹、压迫节奏',
    '剧情结构：失控的线索 -> 黑市回声',
  ]);
});

test('toStructuredPlannerDoc preserves inherited entity keys, subject bindings and target model family slug', () => {
  const result = toStructuredPlannerDoc(
    {
      projectTitle: '项目A',
      episodeTitle: '第1集',
      episodeCount: 1,
      pointCost: 20,
      summaryBullets: ['梗概'],
      highlights: [{ title: '亮点', description: '描述' }],
      styleBullets: ['赛博霓虹'],
      subjectBullets: ['主角：林修'],
      subjects: [
        {
          id: 'subject-1',
          title: '林修',
          prompt: '青年侦探',
          image: '/subject.png',
        },
      ],
      sceneBullets: ['天台夜戏'],
      scenes: [
        {
          id: 'scene-1',
          title: '天台',
          prompt: '夜色中的高楼天台',
          image: '/scene.png',
        },
      ],
      scriptSummary: ['第一幕对峙'],
      acts: [
        {
          id: 'act-1',
          title: '第一幕',
          time: '夜',
          location: '天台',
          shots: [
            {
              id: 'shot-1',
              title: '镜头一',
              image: undefined,
              visual: '主角靠近护栏',
              composition: '中景',
              motion: '推镜',
              voice: '男声旁白',
              line: '今晚必须结束它。',
            },
          ],
        },
      ],
    },
    {
      projectTitle: '项目A',
      episodeTitle: '第1集',
      episodeCount: 1,
      pointCost: 20,
      summaryBullets: [],
      highlights: [],
      styleBullets: [],
      subjectBullets: [],
      subjects: [
        {
          entityKey: 'planner-subject-1',
          entityType: 'subject',
          semanticFingerprint: 'subject|linye',
          title: '旧主体',
          prompt: '旧 prompt',
        },
      ],
      sceneBullets: [],
      scenes: [
        {
          entityKey: 'planner-scene-1',
          entityType: 'scene',
          semanticFingerprint: 'scene|tiantai',
          title: '旧场景',
          prompt: '旧场景 prompt',
        },
      ],
      scriptSummary: [],
      acts: [
        {
          title: '第一幕',
          time: '夜',
          location: '天台',
          shots: [
            {
              entityKey: 'planner-shot-1',
              title: '旧镜头',
              visual: '旧 visual',
              composition: '旧 composition',
              motion: '旧 motion',
              voice: '旧 voice',
              line: '旧台词',
              subjectBindings: ['planner-subject-1'],
              targetModelFamilySlug: 'ark-seedance-2-video',
            },
          ],
        },
      ],
    },
  );

  assert.equal(result.subjects[0]?.entityKey, 'planner-subject-1');
  assert.equal(result.subjects[0]?.entityType, 'subject');
  assert.equal(result.subjects[0]?.semanticFingerprint, 'subject|linye');
  assert.equal(result.scenes[0]?.entityKey, 'planner-scene-1');
  assert.equal(result.scenes[0]?.entityType, 'scene');
  assert.equal(result.scenes[0]?.semanticFingerprint, 'scene|tiantai');
  assert.equal(result.acts[0]?.shots[0]?.entityKey, 'planner-shot-1');
  assert.deepEqual(result.acts[0]?.shots[0]?.subjectBindings, ['planner-subject-1']);
  assert.equal(result.acts[0]?.shots[0]?.targetModelFamilySlug, 'ark-seedance-2-video');
});
