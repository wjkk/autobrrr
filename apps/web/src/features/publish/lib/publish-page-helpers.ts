import type { PublishDraft } from '@aiv/domain';

import type { ApiPublishWorkspace } from './publish-api';
import type { PublishPageData } from './publish-page-data';

const HISTORY_CATEGORIES = ['全部', '短剧漫剧', '音乐MV', '知识分享'] as const;

export type PublishHistoryCategory = (typeof HISTORY_CATEGORIES)[number];

export function listPublishHistoryCategories() {
  return HISTORY_CATEGORIES;
}

export function resolveInitialPublishHistoryId(studio: PublishPageData) {
  return studio.historyWorks.find((item) => item.title === studio.publish.draft.title)?.id ?? studio.historyWorks[0]?.id ?? null;
}

export function filterPublishHistoryWorks(studio: PublishPageData, activeCategory: PublishHistoryCategory) {
  if (activeCategory === '全部') {
    return studio.historyWorks;
  }

  return studio.historyWorks.filter((item) => item.category === activeCategory);
}

export function buildPublishMetricSummary(args: {
  studio: PublishPageData;
  selectedHistory: PublishPageData['historyWorks'][number] | null;
  publishSummary: ApiPublishWorkspace['summary'] | null;
  draft: PublishDraft;
}) {
  return [
    {
      label: '当前项目',
      value: args.studio.project.title,
      meta: `${args.studio.project.aspectRatio} · ${args.publishSummary?.readyToPublish ? '可发布' : '待发布'}`,
    },
    {
      label: '历史作品',
      value: String(args.studio.historyWorks.length),
      meta: args.selectedHistory?.category ?? '未绑定',
    },
    {
      label: '当前来源',
      value: args.selectedHistory?.title ?? '未选择',
      meta: args.selectedHistory?.durationLabel ?? '--:--',
    },
    {
      label: '可发布分镜',
      value: args.publishSummary ? `${args.publishSummary.publishableShotCount}/${args.publishSummary.totalShots}` : '--',
      meta: args.draft.status === 'submitted' ? '提交后进入审核队列' : '提交前请确认素材完整',
    },
  ];
}

export function applyPublishHistoryBinding(args: {
  historyWorks: PublishPageData['historyWorks'];
  draft: PublishDraft;
  historyId: string;
}) {
  const target = args.historyWorks.find((item) => item.id === args.historyId);
  if (!target) {
    return null;
  }

  return {
    selectedHistoryId: target.id,
    draft: {
      ...args.draft,
      title: target.title,
      intro: target.intro,
      script: target.script,
    },
    notice: '已从历史作品回填标题、简介与剧本描述。',
  };
}

export function validatePublishDraftSubmission(draft: PublishDraft) {
  if (!draft.title.trim() || !draft.intro.trim()) {
    return '标题和简介未完成，暂不能发布。';
  }

  return null;
}

export function buildPublishSubmitPayload(args: {
  episodeId: string;
  draft: PublishDraft;
  selectedHistoryId: string | null;
}) {
  return {
    episodeId: args.episodeId,
    title: args.draft.title.trim(),
    intro: args.draft.intro.trim(),
    script: args.draft.script,
    tag: args.draft.tag,
    sourceHistoryId: args.selectedHistoryId,
  };
}
