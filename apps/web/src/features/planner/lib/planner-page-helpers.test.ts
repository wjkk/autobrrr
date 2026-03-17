import assert from 'node:assert/strict';
import test from 'node:test';

import type { ApiPlannerWorkspace } from './planner-api';
import {
  buildPlannerAssetThumbCandidates,
  buildPlannerEpisodes,
  mapWorkspaceMessagesToThread,
  readPreferredStoryboardModelId,
  toHistoryVersions,
} from './planner-page-helpers';

test('buildPlannerAssetThumbCandidates deduplicates assets and sorts generated assets first', () => {
  const result = buildPlannerAssetThumbCandidates({
    linkedAssets: [
      {
        id: 'asset-generated',
        sourceUrl: 'https://example.com/generated.png',
        fileName: 'generated.png',
        sourceKind: 'generated',
        createdAt: '2026-03-17T10:00:00.000Z',
      },
      {
        id: 'asset-generated',
        sourceUrl: 'https://example.com/generated.png',
        fileName: 'generated.png',
        sourceKind: 'generated',
        createdAt: '2026-03-17T10:00:00.000Z',
      },
    ],
    availableAssets: [
      {
        id: 'asset-upload',
        sourceUrl: 'https://example.com/upload.png',
        fileName: 'upload.png',
        mediaKind: 'image',
        sourceKind: 'upload',
        createdAt: '2026-03-17T09:00:00.000Z',
      },
      {
        id: 'asset-reference',
        sourceUrl: 'https://example.com/reference.png',
        fileName: 'reference.png',
        mediaKind: 'image',
        sourceKind: 'reference',
        createdAt: '2026-03-17T08:00:00.000Z',
      },
      {
        id: 'asset-upload-2',
        sourceUrl: 'https://example.com/upload.png',
        fileName: 'upload-duplicate-url.png',
        mediaKind: 'image',
        sourceKind: 'upload',
        createdAt: '2026-03-17T11:00:00.000Z',
      },
    ],
    fallbackImages: ['https://example.com/fallback-a.png'],
    activeImage: 'https://example.com/active.png',
    fallbackPrefix: 'subject',
  });

  assert.deepEqual(
    result.map((item) => item.key),
    ['linked-asset-generated', 'asset-asset-upload', 'asset-asset-reference', 'subject-active', 'subject-0'],
  );
  assert.equal(result[0]?.label, 'AI生成 · generated.png');
});

test('mapWorkspaceMessagesToThread maps outline and steps messages and filters empty assistant text', () => {
  const result = mapWorkspaceMessagesToThread([
    {
      id: 'msg-outline',
      role: 'assistant',
      messageType: 'assistant_outline_card',
      content: {
        documentTitle: '赛博追凶',
      },
      refinementVersionId: null,
      createdAt: '2026-03-17T10:00:00.000Z',
    },
    {
      id: 'msg-steps',
      role: 'assistant',
      messageType: 'assistant_steps',
      content: {
        steps: [{ title: '生成故事大纲' }],
      },
      refinementVersionId: null,
      createdAt: '2026-03-17T10:01:00.000Z',
    },
    {
      id: 'msg-empty',
      role: 'assistant',
      messageType: 'assistant_text',
      content: {
        text: '   ',
      },
      refinementVersionId: null,
      createdAt: '2026-03-17T10:02:00.000Z',
    },
  ]);

  assert.deepEqual(
    result.map((item) => ({ id: item.id, content: item.content })),
    [
      { id: 'msg-outline', content: '已生成剧本大纲：赛博追凶' },
      { id: 'msg-steps', content: '生成故事大纲' },
    ],
  );
});

test('buildPlannerEpisodes produces series draft list with seeded first episode', () => {
  const result = buildPlannerEpisodes('霓虹代码：神秘U盘危机', 'series', '负责开场设定', 3, 8);

  assert.deepEqual(
    result.map((item) => ({
      id: item.id,
      label: item.label,
      title: item.title,
      styleId: item.styleId,
      shotCount: item.shotCount,
    })),
    [
      { id: 'episode-1', label: 'EP 01', title: '霓虹代码：神秘U盘危机', styleId: 61, shotCount: 8 },
      { id: 'episode-2', label: 'EP 02', title: '霓虹代码：神秘U盘危机·待策划', styleId: 56, shotCount: 0 },
      { id: 'episode-3', label: 'EP 03', title: '霓虹代码：神秘U盘危机·待策划', styleId: 56, shotCount: 0 },
    ],
  );
});

test('readPreferredStoryboardModelId prefers shot target model only when option is known', () => {
  const withKnownTarget = readPreferredStoryboardModelId({
    activeRefinement: {
      shotScripts: [{ targetModelFamilySlug: 'platou-veo-video' }],
    },
  } as ApiPlannerWorkspace);
  const withUnknownTarget = readPreferredStoryboardModelId({
    activeRefinement: {
      shotScripts: [{ targetModelFamilySlug: 'unknown-model' }],
    },
  } as ApiPlannerWorkspace);

  assert.equal(withKnownTarget, 'platou-veo-video');
  assert.equal(withUnknownTarget, 'ark-seedance-2-video');
});

test('toHistoryVersions prefers runtime refinement versions and normalises trigger and status', () => {
  const result = toHistoryVersions({
    runtimeActiveRefinement: {
      id: 'ref-active',
    } as ApiPlannerWorkspace['activeRefinement'],
    runtimeActiveOutline: null,
    runtimeWorkspace: {
      refinementVersions: [
        {
          id: 'ref-2',
          versionNumber: 2,
          triggerType: 'PARTIAL_RERUN',
          status: 'running',
          createdAt: '2026-03-17T12:00:00.000Z',
        },
        {
          id: 'ref-1',
          versionNumber: 1,
          triggerType: 'GENERATE_DOC',
          status: 'unknown_status',
          createdAt: '2026-03-17T11:00:00.000Z',
        },
      ],
    } as ApiPlannerWorkspace,
    localVersions: [
      {
        id: 'local-1',
        versionNumber: 1,
        trigger: 'local',
        status: 'ready',
        createdAt: 1,
      },
    ],
  });

  assert.deepEqual(result, [
    {
      id: 'ref-1',
      versionNumber: 1,
      trigger: 'generate_doc',
      status: 'ready',
      createdAt: new Date('2026-03-17T11:00:00.000Z').getTime(),
    },
    {
      id: 'ref-2',
      versionNumber: 2,
      trigger: 'partial_rerun',
      status: 'running',
      createdAt: new Date('2026-03-17T12:00:00.000Z').getTime(),
    },
  ]);
});
