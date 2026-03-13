import { createRuntimeStudioFixture, getMockStudioProject } from '@aiv/mock-data';

import { requestAivApiFromServer } from '@/lib/aiv-api';

import type { ApiPublishWorkspace, PublishPageBootstrap } from './publish-api';

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
  return status.toLowerCase() as ReturnType<typeof createRuntimeStudioFixture>['project']['status'];
}

function buildPublishStudio(project: ApiProjectDetail, workspace: ApiPublishWorkspace) {
  const baseStudio = createRuntimeStudioFixture({
    prompt: project.brief?.trim() || project.title,
    contentMode: project.contentMode,
  });

  return {
    ...baseStudio,
    scenarioLabel: 'API Project',
    project: {
      ...baseStudio.project,
      id: project.id,
      title: project.title,
      brief: project.brief ?? '',
      contentMode: project.contentMode,
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
      successMessage: baseStudio.publish.successMessage,
    },
  };
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
    return {
      studio: getMockStudioProject(projectId),
    };
  }
}
