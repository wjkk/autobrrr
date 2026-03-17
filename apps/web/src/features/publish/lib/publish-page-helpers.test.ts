import assert from 'node:assert/strict';
import test from 'node:test';

import type { PublishPageData } from './publish-page-data';
import {
  applyPublishHistoryBinding,
  buildPublishMetricSummary,
  filterPublishHistoryWorks,
  listPublishHistoryCategories,
  resolveInitialPublishHistoryId,
} from './publish-page-helpers';

function buildPublishStudio(): PublishPageData {
  return {
    brandName: 'AIV',
    project: {
      id: 'project-1',
      title: '项目A',
      brief: '简介',
      contentMode: 'single',
      executionMode: 'auto',
      aspectRatio: '9:16',
      status: 'ready_for_storyboard',
    },
    episodes: [],
    publish: {
      draft: {
        title: '历史作品B',
        intro: '默认简介',
        script: '默认剧本',
        tag: 'Ready',
        status: 'draft',
      },
      successMessage: '发布成功',
    },
    historyWorks: [
      {
        id: 'history-1',
        title: '历史作品A',
        intro: 'A 简介',
        script: 'A 剧本',
        category: '短剧漫剧',
        durationLabel: '00:12',
        coverLabel: 'A',
      },
      {
        id: 'history-2',
        title: '历史作品B',
        intro: 'B 简介',
        script: 'B 剧本',
        category: '音乐MV',
        durationLabel: '00:30',
        coverLabel: 'B',
      },
    ],
  };
}

test('publish page helpers resolve initial history and filter categories', () => {
  const studio = buildPublishStudio();

  assert.deepEqual(listPublishHistoryCategories(), ['全部', '短剧漫剧', '音乐MV', '知识分享']);
  assert.equal(resolveInitialPublishHistoryId(studio), 'history-2');
  assert.deepEqual(
    filterPublishHistoryWorks(studio, '音乐MV').map((item) => item.id),
    ['history-2'],
  );
});

test('buildPublishMetricSummary uses publish summary and selected history metadata', () => {
  const studio = buildPublishStudio();
  const selectedHistory = studio.historyWorks[1] ?? null;

  const result = buildPublishMetricSummary({
    studio,
    selectedHistory,
    publishSummary: {
      totalShots: 8,
      publishableShotCount: 6,
      readyToPublish: true,
    },
    draft: studio.publish.draft,
  });

  assert.deepEqual(result, [
    { label: '当前项目', value: '项目A', meta: '9:16 · 可发布' },
    { label: '历史作品', value: '2', meta: '音乐MV' },
    { label: '当前来源', value: '历史作品B', meta: '00:30' },
    { label: '可发布分镜', value: '6/8', meta: '提交前请确认素材完整' },
  ]);
});

test('applyPublishHistoryBinding updates draft from selected history work', () => {
  const studio = buildPublishStudio();

  const result = applyPublishHistoryBinding({
    historyWorks: studio.historyWorks,
    draft: studio.publish.draft,
    historyId: 'history-1',
  });

  assert.deepEqual(result, {
    selectedHistoryId: 'history-1',
    draft: {
      title: '历史作品A',
      intro: 'A 简介',
      script: 'A 剧本',
      tag: 'Ready',
      status: 'draft',
    },
    notice: '已从历史作品回填标题、简介与剧本描述。',
  });
});
