import test from 'node:test';
import assert from 'node:assert/strict';

import { Prisma } from '@prisma/client';

import { __testables, rebuildPlannerStructuredDocFromProjection, syncPlannerRefinementProjection } from './planner-refinement-projection.js';

test('planner refinement projection helpers normalize asset ids and fallback base doc', () => {
  assert.deepEqual(__testables.readAssetIds(['asset-1', '', 3, 'asset-2'] as Prisma.JsonValue), ['asset-1', 'asset-2']);

  const fallback = __testables.readBaseDoc({ broken: true } satisfies Prisma.JsonValue);
  assert.equal(fallback.projectTitle, '未命名项目');
  assert.equal(fallback.acts[0]?.shots.length, 1);
});

test('rebuildPlannerStructuredDocFromProjection rebuilds entities, acts and script summary from projection rows', () => {
  const doc = rebuildPlannerStructuredDocFromProjection({
    refinementVersion: {
      id: 'ref-1',
      sourceRunId: 'run-1',
      structuredDocJson: {
        projectTitle: '旧项目',
        episodeTitle: '第2集',
        episodeCount: 2,
        pointCost: 40,
        summaryBullets: ['旧摘要'],
        highlights: [{ title: '旧亮点', description: '旧说明' }],
        styleBullets: ['旧风格'],
        subjectBullets: ['旧主体'],
        subjects: [{ entityKey: 'subject-legacy', title: '旧主角', prompt: '旧提示词' }],
        sceneBullets: ['旧场景'],
        scenes: [{ entityKey: 'scene-legacy', title: '旧客厅', prompt: '旧场景提示词' }],
        scriptSummary: ['旧脚本摘要'],
        acts: [
          {
            title: '旧幕',
            time: '凌晨',
            location: '旧客厅',
            shots: [
              {
                entityKey: 'shot-legacy',
                title: '旧分镜',
                visual: '旧画面',
                composition: '旧构图',
                motion: '旧运镜',
                voice: '旧旁白',
                line: '旧台词',
              },
            ],
          },
        ],
      } satisfies Prisma.JsonValue,
    },
    subjects: [
      {
        id: 'subject-b',
        name: '配角',
        appearance: '红色斗篷',
        prompt: '配角提示词',
        referenceAssetIdsJson: ['subject-ref-2', ''] as Prisma.JsonValue,
        generatedAssetIdsJson: ['subject-gen-2'] as Prisma.JsonValue,
        sortOrder: 2,
      },
      {
        id: 'subject-a',
        name: '主角',
        appearance: '蓝色风衣',
        prompt: '主角提示词',
        referenceAssetIdsJson: ['subject-ref-1'] as Prisma.JsonValue,
        generatedAssetIdsJson: ['subject-gen-1'] as Prisma.JsonValue,
        sortOrder: 1,
      },
    ],
    scenes: [
      {
        id: 'scene-a',
        name: '屋顶',
        time: '夜晚',
        description: '雨夜对峙',
        prompt: '屋顶场景提示词',
        referenceAssetIdsJson: ['scene-ref-1'] as Prisma.JsonValue,
        generatedAssetIdsJson: ['scene-gen-1'] as Prisma.JsonValue,
        sortOrder: 1,
      },
    ],
    shotScripts: [
      {
        id: 'shot-b',
        sceneId: 'scene-a',
        actKey: 'act-1',
        actTitle: '第一幕',
        shotNo: '02',
        title: '反打',
        targetModelFamilySlug: null,
        visualDescription: '反打镜头',
        composition: '近景',
        cameraMotion: '轻推',
        voiceRole: '配角',
        dialogue: '你终于来了',
        referenceAssetIdsJson: ['shot-ref-2'] as Prisma.JsonValue,
        generatedAssetIdsJson: ['shot-gen-2'] as Prisma.JsonValue,
        sortOrder: 2,
      },
      {
        id: 'shot-a',
        sceneId: 'scene-a',
        actKey: 'act-1',
        actTitle: '第一幕',
        shotNo: '01',
        title: '',
        targetModelFamilySlug: 'seedance-2.0',
        visualDescription: '建立镜头',
        composition: '全景',
        cameraMotion: '推进',
        voiceRole: '旁白',
        dialogue: '夜幕降临',
        referenceAssetIdsJson: ['shot-ref-1'] as Prisma.JsonValue,
        generatedAssetIdsJson: ['shot-gen-1'] as Prisma.JsonValue,
        sortOrder: 1,
      },
    ],
  });

  assert.equal(doc.projectTitle, '旧项目');
  assert.deepEqual(doc.subjectBullets, ['主角：蓝色风衣', '配角：红色斗篷']);
  assert.equal(doc.subjects[0]?.entityKey, 'subject-a');
  assert.equal(doc.scenes[0]?.entityKey, 'scene-a');
  assert.deepEqual(doc.scriptSummary, ['分镜数量：2', '场景数量：1', '主体数量：2']);
  assert.equal(doc.acts[0]?.time, '夜晚');
  assert.equal(doc.acts[0]?.location, '屋顶');
  assert.equal(doc.acts[0]?.shots[0]?.title, '01');
  assert.equal(doc.acts[0]?.shots[0]?.targetModelFamilySlug, 'seedance-2.0');
  assert.deepEqual(doc.acts[0]?.shots[1]?.generatedAssetIds, ['shot-gen-2']);
});

test('syncPlannerRefinementProjection updates refinement doc and source run output when sourceRunId exists', async () => {
  const updates: Array<{ kind: 'refinement' | 'run'; data: Record<string, unknown> }> = [];
  const db = {
    plannerRefinementVersion: {
      findUnique: async () => ({
        id: 'ref-1',
        sourceRunId: 'run-1',
        structuredDocJson: null,
        documentTitle: '旧标题',
      }),
      update: async ({ data }: { data: Record<string, unknown> }) => {
        updates.push({ kind: 'refinement', data });
      },
    },
    plannerSubject: {
      findMany: async () => ([
        {
          id: 'subject-1',
          name: '主角',
          appearance: '黑色夹克',
          prompt: '角色提示词',
          referenceAssetIdsJson: ['subject-ref'] as Prisma.JsonValue,
          generatedAssetIdsJson: ['subject-gen'] as Prisma.JsonValue,
          sortOrder: 1,
        },
      ]),
    },
    plannerScene: {
      findMany: async () => ([
        {
          id: 'scene-1',
          name: '街头',
          time: '黄昏',
          description: '街头追逐',
          prompt: '场景提示词',
          referenceAssetIdsJson: ['scene-ref'] as Prisma.JsonValue,
          generatedAssetIdsJson: ['scene-gen'] as Prisma.JsonValue,
          sortOrder: 1,
        },
      ]),
    },
    plannerShotScript: {
      findMany: async () => ([
        {
          id: 'shot-1',
          sceneId: 'scene-1',
          actKey: 'act-1',
          actTitle: '第一幕',
          shotNo: '01',
          title: '开场',
          targetModelFamilySlug: 'seedance-2.0',
          visualDescription: '主角奔跑',
          composition: '全景',
          cameraMotion: '跟拍',
          voiceRole: '旁白',
          dialogue: '冲突开始',
          referenceAssetIdsJson: ['shot-ref'] as Prisma.JsonValue,
          generatedAssetIdsJson: ['shot-gen'] as Prisma.JsonValue,
          sortOrder: 1,
        },
      ]),
    },
    run: {
      findUnique: async () => ({
        id: 'run-1',
        outputJson: {
          generatedText: '旧输出',
          keep: true,
        } satisfies Prisma.JsonValue,
      }),
      update: async ({ data }: { data: Record<string, unknown> }) => {
        updates.push({ kind: 'run', data });
      },
    },
  };

  const doc = await syncPlannerRefinementProjection({
    db: db as any,
    refinementVersionId: 'ref-1',
  });

  assert.equal(doc.projectTitle, '未命名项目');
  assert.equal(doc.acts[0]?.shots[0]?.targetModelFamilySlug, 'seedance-2.0');
  assert.equal(updates.length, 2);
  assert.equal(updates[0]?.kind, 'refinement');
  assert.equal(updates[1]?.kind, 'run');
  assert.equal((updates[0]?.data.documentTitle as string), '未命名项目');
  assert.deepEqual((updates[1]?.data.outputJson as Record<string, unknown>).keep, true);
  assert.deepEqual(
    ((updates[1]?.data.outputJson as Record<string, unknown>).structuredDoc as Record<string, unknown>).projectTitle,
    '未命名项目',
  );
});
