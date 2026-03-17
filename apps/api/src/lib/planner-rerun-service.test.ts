import assert from 'node:assert/strict';
import test from 'node:test';

import { __testables } from './planner-rerun-service.js';

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
