import type { ProjectStatus } from '@aiv/domain';
import { getMockStudioProject } from '@aiv/mock-data';

import { requestAivApiFromServer } from '@/lib/aiv-api';

import type { ApiPublishWorkspace, PublishPageBootstrap } from './publish-api';
import { createPublishPageData, publishPageDataFromFixture } from './publish-page-data';

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

function toProjectStatus(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === 'publishing') {
    return 'export_ready' satisfies ProjectStatus;
  }
  if (normalized === 'ready') {
    return 'ready_for_storyboard' satisfies ProjectStatus;
  }
  return normalized as ProjectStatus;
}

function buildPublishStudio(project: ApiProjectDetail, workspace: ApiPublishWorkspace) {
  return createPublishPageData({
    project: {
      id: project.id,
      title: project.title,
      brief: project.brief ?? '',
      contentMode: project.contentMode,
      executionMode: 'auto',
      aspectRatio: '9:16',
      status: toProjectStatus(project.status),
    },
    episodes: project.episodes.map((episode) => ({
      id: episode.id,
      title: episode.title,
      summary: project.brief ?? '',
      sequence: episode.episodeNo,
      status: toProjectStatus(episode.status),
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

export async function fetchPublishStudioProject(projectId: string): Promise<PublishPageBootstrap> {
  try {
    const project = await requestAivApiFromServer<ApiProjectDetail>(`/api/studio/projects/${encodeURIComponent(projectId)}`, { allowNotFound: true });
    if (!project) {
      return { studio: null };
    }

    const episodeId = project.currentEpisodeId ?? project.episodes[0]?.id;
    if (!episodeId) {
      return { studio: null };
    }

    const workspace = await requestAivApiFromServer<ApiPublishWorkspace>(
      `/api/projects/${encodeURIComponent(project.id)}/publish/workspace?episodeId=${encodeURIComponent(episodeId)}`,
    );

    if (!workspace) {
      return { studio: null };
    }

    return {
      studio: buildPublishStudio(project, workspace),
      runtimeApi: {
        projectId: project.id,
        episodeId: workspace.episode.id,
      },
      initialPublishWorkspace: workspace,
    };
  } catch {
    const fixture = getMockStudioProject(projectId);
    return {
      studio: fixture ? publishPageDataFromFixture(fixture) : null,
    };
  }
}
