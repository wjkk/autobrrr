import type { ProjectStatus } from '@aiv/domain';

import type { ApiPublishWorkspace } from './publish-api';
import { createPublishPageData } from './publish-page-data';

interface ApiProjectDetail {
  id: string;
  title: string;
  brief: string | null;
  contentMode: 'single' | 'series';
  status: string;
  currentEpisodeId: string | null;
  episodes: Array<{
    id: string;
    episodeNo: number;
    title: string;
    status: string;
  }>;
}

export function toPublishProjectStatus(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === 'publishing') {
    return 'export_ready' satisfies ProjectStatus;
  }
  if (normalized === 'ready') {
    return 'ready_for_storyboard' satisfies ProjectStatus;
  }
  return normalized as ProjectStatus;
}

export function buildPublishStudio(project: ApiProjectDetail, workspace: ApiPublishWorkspace) {
  return createPublishPageData({
    project: {
      id: project.id,
      title: project.title,
      brief: project.brief ?? '',
      contentMode: project.contentMode,
      executionMode: 'auto',
      aspectRatio: '9:16',
      status: toPublishProjectStatus(project.status),
    },
    episodes: project.episodes.map((episode) => ({
      id: episode.id,
      title: episode.title,
      summary: project.brief ?? '',
      sequence: episode.episodeNo,
      status: toPublishProjectStatus(episode.status),
    })),
    publish: {
      draft: {
        title: project.title,
        intro: project.brief ?? '',
        script: workspace.shots.map((shot) => shot.title).join(' / '),
        tag: workspace.summary.readyToPublish ? 'Ready' : 'Draft',
        status: 'draft' as const,
      },
      successMessage: '作品已提交发布队列，稍后可在广场查看。',
    },
  });
}
