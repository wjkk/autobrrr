import test from 'node:test';
import assert from 'node:assert/strict';

import { __testables, syncPlannerRefinementDerivedData } from './planner-refinement-sync.js';

test('planner refinement sync helpers normalize keys, asset ids and scene hints', () => {
  assert.equal(__testables.normalizeKey('  A   B  '), 'a b');
  assert.equal(__testables.readProjectionKey('  subject-1  '), 'subject-1');
  assert.equal(__testables.readProjectionKey('   '), null);
  assert.deepEqual(__testables.toAssetIdList(['asset-1', '', 'asset-2']), ['asset-1', 'asset-2']);
  assert.equal(
    __testables.inferSceneTime(
      {
        projectTitle: '项目',
        episodeTitle: '第1集',
        episodeCount: 1,
        pointCost: 38,
        summaryBullets: ['摘要'],
        highlights: [{ title: '亮点', description: '说明' }],
        styleBullets: ['风格'],
        subjectBullets: ['主体'],
        subjects: [{ title: '主角', prompt: '主角提示词' }],
        sceneBullets: ['场景'],
        scenes: [{ title: '街头', prompt: '街头提示词' }],
        scriptSummary: ['剧本摘要'],
        acts: [
          {
            title: '街头追逐',
            time: '黄昏',
            location: '旧街头',
            shots: [{ title: '01', visual: '追逐', composition: '全景', motion: '跟拍', voice: '旁白', line: '开始' }],
          },
        ],
      },
      '街头',
    ),
    '黄昏',
  );
  assert.equal(__testables.inferSceneTime({
    projectTitle: '项目',
    episodeTitle: '第1集',
    episodeCount: 1,
    pointCost: 38,
    summaryBullets: ['摘要'],
    highlights: [{ title: '亮点', description: '说明' }],
    styleBullets: ['风格'],
    subjectBullets: ['主体'],
    subjects: [{ title: '主角', prompt: '主角提示词' }],
    sceneBullets: ['场景'],
    scenes: [{ title: '街头', prompt: '街头提示词' }],
    scriptSummary: ['剧本摘要'],
    acts: [
      {
        title: '第一幕',
        time: '',
        location: '楼顶',
        shots: [{ title: '01', visual: '追逐', composition: '全景', motion: '跟拍', voice: '旁白', line: '开始' }],
      },
    ],
  }, '办公室'), '未设定');
  assert.equal(__testables.inferLocationType('室内办公室对峙'), 'indoor');
  assert.equal(__testables.inferLocationType('室外桥面奔跑'), 'outdoor');
  assert.equal(__testables.inferLocationType('中性空间'), 'other');
  assert.deepEqual(__testables.buildSubjectAliasCandidates('影隼-常规态'), ['影隼-常规态', '常规态', '影隼']);
  assert.deepEqual(
    __testables.resolveSubjectBindingIds({
      bindings: ['subject-1', '主角'],
      subjects: [
        {
          id: 'subject-1',
          entityKey: 'subject-1',
          title: '主角',
          prompt: '黑色风衣',
        },
      ],
    }),
    ['subject-1'],
  );
  assert.deepEqual(
    __testables.inferShotSubjectBindings({
      shot: {
        title: '镜头一',
        visual: '影隼-常规态冲出巷口',
        composition: '中景',
        motion: '推镜',
        voice: '旁白',
        line: '他必须离开这里',
      },
      subjects: [
        {
          id: 'subject-1',
          entityKey: 'subject-1',
          title: '影隼-常规态',
          prompt: '黑色风衣',
        },
        {
          id: 'subject-2',
          entityKey: 'subject-2',
          title: '禁忌金属U盘',
          prompt: '金属器物',
        },
      ],
    }),
    ['subject-1'],
  );
  const previousCandidates = __testables.buildPreviousEntityAssetCandidates([
    {
      entityKey: 'subject-1',
      semanticFingerprint: 'linye|黑色风衣|年轻侦探',
      title: '林夜',
      prompt: '黑色风衣，年轻侦探',
      referenceAssetIds: ['asset-1'],
      generatedAssetIds: ['asset-2'],
    },
  ]);
  assert.equal(
    __testables.resolvePreviousEntityAssetCandidate({
      entityKey: null,
      semanticFingerprint: '林夜|黑色风衣|年轻侦探',
      title: '调查者林夜',
      prompt: '黑色风衣，年轻侦探',
      candidates: previousCandidates,
      usedMatchKeys: new Set<string>(),
    })?.referenceAssetIds[0],
    'asset-1',
  );
});

test('syncPlannerRefinementDerivedData recreates subjects, scenes and shots while carrying projection assets by entityKey and fallback key', async () => {
  const deleted: string[] = [];
  const subjectCreates: Array<Record<string, unknown>> = [];
  const sceneCreates: Array<Record<string, unknown>> = [];
  const shotCreates: Array<Record<string, unknown>> = [];
  let createdSubjectIndex = 0;
  let createdSceneIndex = 0;

  const db = {
    plannerShotScript: {
      deleteMany: async ({ where }: { where: { refinementVersionId: string } }) => {
        deleted.push(`shot:${where.refinementVersionId}`);
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        shotCreates.push(data);
      },
    },
    plannerScene: {
      deleteMany: async ({ where }: { where: { refinementVersionId: string } }) => {
        deleted.push(`scene:${where.refinementVersionId}`);
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        sceneCreates.push(data);
        createdSceneIndex += 1;
        return { id: `scene-created-${createdSceneIndex}` };
      },
    },
    plannerSubject: {
      deleteMany: async ({ where }: { where: { refinementVersionId: string } }) => {
        deleted.push(`subject:${where.refinementVersionId}`);
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        subjectCreates.push(data);
        createdSubjectIndex += 1;
        return { id: (data.id as string | undefined) ?? `subject-created-${createdSubjectIndex}` };
      },
    },
  };

  await syncPlannerRefinementDerivedData({
    db: db as any,
    refinementVersionId: 'ref-1',
    structuredDoc: {
      projectTitle: '项目',
      episodeTitle: '第1集',
      episodeCount: 1,
      pointCost: 38,
      summaryBullets: ['摘要'],
      highlights: [{ title: '亮点', description: '说明' }],
      styleBullets: ['风格'],
      subjectBullets: ['主体'],
      subjects: [
        {
          entityKey: 'subject-1',
          title: '主角',
          prompt: '黑色风衣',
        },
        {
          title: '搭档',
          prompt: '白色夹克',
          generatedAssetIds: ['subject-gen-direct'],
        },
      ],
      sceneBullets: ['场景'],
      scenes: [
        {
          entityKey: 'scene-1',
          title: '室内办公室',
          prompt: '室内办公室对峙',
        },
      ],
      scriptSummary: ['剧本摘要'],
      acts: [
        {
          title: '办公室对峙',
          time: '夜晚',
          location: '室内办公室',
          shots: [
            {
              entityKey: 'shot-1',
              title: '01',
              visual: '主角进入办公室',
              composition: '全景',
              motion: '推进',
              voice: '旁白',
              line: '他推门而入',
              subjectBindings: ['subject-1'],
            },
            {
              title: '02',
              visual: '搭档回头',
              composition: '中景',
              motion: '轻摇',
              voice: '搭档',
              line: '你终于来了',
              generatedAssetIds: ['shot-gen-direct'],
            },
            {
              entityKey: 'shot-3',
              title: '03',
              visual: '空荡的办公室，灯光闪烁',
              composition: '空镜',
              motion: '固定镜头',
              voice: '旁白',
              line: '办公室陷入沉默。',
            },
          ],
        },
      ],
    },
    previousProjection: {
      subjects: [
        {
          entityKey: 'subject-1',
          referenceAssetIds: ['subject-ref-prev'],
          generatedAssetIds: ['subject-gen-prev'],
        },
        {
          title: '搭档',
          prompt: '白色夹克',
          referenceAssetIds: ['partner-ref-prev'],
          generatedAssetIds: ['partner-gen-prev'],
        },
      ],
      scenes: [
        {
          entityKey: 'scene-1',
          referenceAssetIds: ['scene-ref-prev'],
          generatedAssetIds: ['scene-gen-prev'],
        },
      ],
      acts: [
        {
          shots: [
            {
              entityKey: 'shot-1',
              targetModelFamilySlug: 'seedance-2.0',
              subjectBindings: ['subject-1'],
              referenceAssetIds: ['shot-ref-prev'],
              generatedAssetIds: ['shot-gen-prev'],
            },
            {
              title: '02',
              visual: '搭档回头',
              targetModelFamilySlug: 'veo-3.1',
              referenceAssetIds: ['shot-ref-fallback'],
              generatedAssetIds: ['shot-gen-fallback'],
            },
            {
              entityKey: 'shot-3',
              subjectBindings: ['subject-1'],
              referenceAssetIds: ['shot-3-ref'],
            },
          ],
        },
      ],
    },
  });

  assert.deepEqual(deleted, ['shot:ref-1', 'scene:ref-1', 'subject:ref-1']);
  assert.equal(subjectCreates.length, 2);
  assert.equal(sceneCreates.length, 1);
  assert.equal(shotCreates.length, 3);

  assert.equal(subjectCreates[0]?.id, 'subject-1');
  assert.deepEqual(subjectCreates[0]?.referenceAssetIdsJson, ['subject-ref-prev']);
  assert.deepEqual(subjectCreates[1]?.generatedAssetIdsJson, ['subject-gen-direct']);
  assert.deepEqual(subjectCreates[1]?.referenceAssetIdsJson, ['partner-ref-prev']);

  assert.equal(sceneCreates[0]?.id, 'scene-1');
  assert.equal(sceneCreates[0]?.time, '夜晚');
  assert.equal(sceneCreates[0]?.locationType, 'indoor');
  assert.deepEqual(sceneCreates[0]?.generatedAssetIdsJson, ['scene-gen-prev']);

  assert.equal(shotCreates[0]?.id, 'shot-1');
  assert.equal(shotCreates[0]?.sceneId, 'scene-created-1');
  assert.equal(shotCreates[0]?.targetModelFamilySlug, 'seedance-2.0');
  assert.deepEqual(shotCreates[0]?.referenceAssetIdsJson, ['shot-ref-prev']);
  assert.deepEqual(shotCreates[0]?.subjectBindingsJson, ['subject-1']);

  assert.equal(shotCreates[1]?.targetModelFamilySlug, 'veo-3.1');
  assert.deepEqual(shotCreates[1]?.generatedAssetIdsJson, ['shot-gen-direct']);
  assert.deepEqual(shotCreates[1]?.referenceAssetIdsJson, ['shot-ref-fallback']);
  assert.deepEqual(shotCreates[1]?.subjectBindingsJson, ['subject-created-2']);

  assert.equal(shotCreates[2]?.id, 'shot-3');
  assert.deepEqual(shotCreates[2]?.subjectBindingsJson, ['subject-1']);
  assert.deepEqual(shotCreates[2]?.referenceAssetIdsJson, ['shot-3-ref']);
});

test('syncPlannerRefinementDerivedData keeps subject and scene assets when titles change but semantic fingerprint remains close', async () => {
  const subjectCreates: Array<Record<string, unknown>> = [];
  const sceneCreates: Array<Record<string, unknown>> = [];

  const db = {
    plannerShotScript: {
      deleteMany: async () => {},
      create: async () => {},
    },
    plannerScene: {
      deleteMany: async () => {},
      create: async ({ data }: { data: Record<string, unknown> }) => {
        sceneCreates.push(data);
        return { id: 'scene-1' };
      },
    },
    plannerSubject: {
      deleteMany: async () => {},
      create: async ({ data }: { data: Record<string, unknown> }) => {
        subjectCreates.push(data);
        return { id: 'subject-1' };
      },
    },
  };

  await syncPlannerRefinementDerivedData({
    db: db as any,
    refinementVersionId: 'ref-2',
    structuredDoc: {
      projectTitle: '项目',
      episodeTitle: '第1集',
      episodeCount: 1,
      pointCost: 38,
      summaryBullets: ['摘要'],
      highlights: [{ title: '亮点', description: '说明' }],
      styleBullets: ['风格'],
      subjectBullets: ['主体'],
      subjects: [
        {
          title: '调查者林夜',
          prompt: '黑色风衣，年轻侦探，冷静眼神',
        },
      ],
      sceneBullets: ['场景'],
      scenes: [
        {
          title: '旧楼档案室',
          prompt: '昏暗档案室，潮湿铁门，冷白顶灯',
        },
      ],
      scriptSummary: ['摘要'],
      acts: [
        {
          title: '第一幕',
          time: '夜',
          location: '档案室',
          shots: [{ title: '01', visual: '调查者林夜推门进入档案室', composition: '中景', motion: '推进', voice: '旁白', line: '他到了。' }],
        },
      ],
    },
    previousProjection: {
      subjects: [
        {
          title: '林夜',
          prompt: '年轻侦探，黑色风衣，冷静眼神',
          semanticFingerprint: '林夜|年轻侦探|黑色风衣|冷静眼神',
          referenceAssetIds: ['subject-ref-prev'],
          generatedAssetIds: ['subject-gen-prev'],
        },
      ],
      scenes: [
        {
          title: '废弃档案室',
          prompt: '潮湿铁门，冷白顶灯，昏暗档案室',
          semanticFingerprint: '废弃档案室|潮湿铁门|冷白顶灯|昏暗档案室',
          referenceAssetIds: ['scene-ref-prev'],
          generatedAssetIds: ['scene-gen-prev'],
        },
      ],
    },
  });

  assert.deepEqual(subjectCreates[0]?.referenceAssetIdsJson, ['subject-ref-prev']);
  assert.deepEqual(subjectCreates[0]?.generatedAssetIdsJson, ['subject-gen-prev']);
  assert.deepEqual(sceneCreates[0]?.referenceAssetIdsJson, ['scene-ref-prev']);
  assert.deepEqual(sceneCreates[0]?.generatedAssetIdsJson, ['scene-gen-prev']);
});
