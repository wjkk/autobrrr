import assert from 'node:assert/strict';
import test from 'node:test';

import { __testables } from './service.js';

test('cloneJson deep-clones rerun targets without sharing references', () => {
  const source = {
    shots: [
      { id: 'shot-1', title: '分镜一' },
    ],
  };

  const cloned = __testables.cloneJson(source);
  cloned.shots[0]!.title = '分镜一-改';

  assert.equal(source.shots[0]!.title, '分镜一');
  assert.equal(cloned.shots[0]!.title, '分镜一-改');
});

test('buildScopeInstruction emits scope-specific guidance and preserves custom prompt', () => {
  const subjectInstruction = __testables.buildScopeInstruction({
    scope: { type: 'subject', subjectId: 'subject-1' },
    targetEntity: { id: 'subject-1', name: '主角' },
    prompt: '把角色调得更冷峻',
  });
  assert.match(subjectInstruction, /你只允许调整一个主体设定/);
  assert.match(subjectInstruction, /用户补充要求：把角色调得更冷峻/);

  const shotInstruction = __testables.buildScopeInstruction({
    scope: { type: 'shot', shotIds: ['shot-1', 'shot-2'] },
    targetEntity: [{ id: 'shot-1' }, { id: 'shot-2' }],
    prompt: undefined,
  });
  assert.match(shotInstruction, /你只允许调整一组指定分镜/);
  assert.match(shotInstruction, /当前目标分镜/);
});

test('findTargetEntity resolves and clones subject/scene/shot/act targets', async () => {
  const subjectResult = await __testables.findTargetEntity(
    {
      refinementVersionId: 'ref-1',
      rerunScope: { type: 'subject', subjectId: 'subject-1' },
    },
    {
      prisma: {
        plannerSubject: {
          findFirst: async () => ({ id: 'subject-1', name: '主角' }),
        },
        plannerScene: {
          findFirst: async () => null,
        },
        plannerShotScript: {
          findMany: async () => [],
        },
      } as never,
    },
  );
  assert.deepEqual(subjectResult, { id: 'subject-1', name: '主角' });

  const shotResult = await __testables.findTargetEntity(
    {
      refinementVersionId: 'ref-1',
      rerunScope: { type: 'shot', shotIds: ['shot-1', 'shot-2'] },
    },
    {
      prisma: {
        plannerSubject: {
          findFirst: async () => null,
        },
        plannerScene: {
          findFirst: async () => null,
        },
        plannerShotScript: {
          findMany: async () => [
            { id: 'shot-1', sortOrder: 1 },
            { id: 'shot-2', sortOrder: 2 },
          ],
        },
      } as never,
    },
  );
  assert.deepEqual(shotResult, [
    { id: 'shot-1', sortOrder: 1 },
    { id: 'shot-2', sortOrder: 2 },
  ]);

  const actResult = await __testables.findTargetEntity(
    {
      refinementVersionId: 'ref-1',
      rerunScope: { type: 'act', actId: 'act-1' },
    },
    {
      prisma: {
        plannerSubject: {
          findFirst: async () => null,
        },
        plannerScene: {
          findFirst: async () => null,
        },
        plannerShotScript: {
          findMany: async () => [
            { id: 'shot-1', actKey: 'act-1' },
          ],
        },
      } as never,
    },
  );
  assert.deepEqual(actResult, {
    actKey: 'act-1',
    shots: [{ id: 'shot-1', actKey: 'act-1' }],
  });
});

test('findTargetEntity returns null when rerun scope target is missing', async () => {
  const result = await __testables.findTargetEntity(
    {
      refinementVersionId: 'ref-1',
      rerunScope: { type: 'scene', sceneId: 'scene-1' },
    },
    {
      prisma: {
        plannerSubject: {
          findFirst: async () => null,
        },
        plannerScene: {
          findFirst: async () => null,
        },
        plannerShotScript: {
          findMany: async () => [],
        },
      } as never,
    },
  );

  assert.equal(result, null);
});

test('buildRerunPromptContext extracts scoped entity context from structured doc', () => {
  const structuredDoc = {
    projectTitle: '项目A',
    episodeTitle: '第1集',
    episodeCount: 1,
    pointCost: 38,
    summaryBullets: ['林夏回到旧校舍继续追查。'],
    highlights: [{ title: '亮点', description: '角色与空间双线推进。' }],
    styleBullets: ['克制悬疑'],
    subjectBullets: ['林夏是执着的学生记者。', '保安老周隐瞒旧档案的来源。'],
    subjects: [
      { entityType: 'subject', title: '林夏', prompt: '学生记者，冷静执着。' },
      { entityType: 'subject', title: '老周', prompt: '老保安，神色紧绷。' },
    ],
    sceneBullets: ['旧校舍档案室堆满尘封资料。'],
    scenes: [
      { entityType: 'scene', title: '旧校舍档案室', prompt: '深夜、荧光灯闪烁、纸箱堆叠。' },
    ],
    scriptSummary: ['第一幕建立目标与危险。'],
    acts: [
      {
        title: '夜探档案室',
        time: '深夜',
        location: '旧校舍档案室',
        shots: [
          {
            title: '林夏潜入',
            visual: '林夏推开旧校舍档案室的门，小心进入。',
            composition: '中景',
            motion: '缓慢推进',
            voice: '无对白',
            line: '林夏压低呼吸，确认四周无人。',
          },
          {
            title: '老周现身',
            visual: '老周从走廊尽头出现，挡住出口。',
            composition: '对峙构图',
            motion: '轻微摇镜',
            voice: '老周',
            line: '这么晚了，你在找什么？',
          },
        ],
      },
    ],
  };

  const subjectContext = __testables.buildRerunPromptContext({
    scope: { type: 'subject', subjectId: 'subject-1' },
    targetEntity: { id: 'subject-1', name: '林夏' },
    structuredDoc,
  });
  assert.equal(subjectContext.scopeType, 'subject');
  assert.equal(subjectContext.targetSummary, '主体：林夏');
  assert.deepEqual(subjectContext.entityContext['relatedSubjectBullets'], ['林夏是执着的学生记者。']);

  const sceneContext = __testables.buildRerunPromptContext({
    scope: { type: 'scene', sceneId: 'scene-1' },
    targetEntity: { id: 'scene-1', name: '旧校舍档案室' },
    structuredDoc,
  });
  assert.equal(sceneContext.scopeType, 'scene');
  assert.equal(sceneContext.targetSummary, '场景：旧校舍档案室');
  assert.deepEqual(sceneContext.entityContext['relatedActs'], [
    {
      actKey: 'act-1',
      title: '夜探档案室',
      location: '旧校舍档案室',
    },
  ]);

  const shotContext = __testables.buildRerunPromptContext({
    scope: { type: 'shot', shotIds: ['shot-1'] },
    targetEntity: [{ id: 'shot-1', title: '老周现身' }],
    structuredDoc,
  });
  assert.equal(shotContext.scopeType, 'shot');
  assert.equal(shotContext.targetSummary, '分镜：老周现身');
  assert.deepEqual(shotContext.entityContext['targetShots'], [
    {
      actKey: 'act-1',
      actTitle: '夜探档案室',
      location: '旧校舍档案室',
      title: '老周现身',
      visual: '老周从走廊尽头出现，挡住出口。',
      composition: '对峙构图',
      motion: '轻微摇镜',
      voice: '老周',
      line: '这么晚了，你在找什么？',
      previousShotTitle: '林夏潜入',
      nextShotTitle: null,
    },
  ]);

  const actContext = __testables.buildRerunPromptContext({
    scope: { type: 'act', actId: 'act-1' },
    targetEntity: { actKey: 'act-1' },
    structuredDoc,
  });
  assert.equal(actContext.scopeType, 'act');
  assert.equal(actContext.targetSummary, '幕：夜探档案室');
  assert.equal((actContext.entityContext['targetAct'] as Record<string, unknown>)['actKey'], 'act-1');
});
