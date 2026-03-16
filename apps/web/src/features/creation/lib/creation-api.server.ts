import type { StudioFixture } from '@aiv/domain';
import { createRuntimeStudioFixture, getMockStudioProject } from '@aiv/mock-data';

import { AivApiError, requestAivApiFromServer } from '@/lib/aiv-api';

import { mergeCreationWorkspaceFromApi, type ApiCreationWorkspace, type ApiProjectDetail, type CreationRuntimeApiContext } from './creation-api';

function toProjectStatus(status: string) {
  return status.toLowerCase() as StudioFixture['project']['status'];
}

function buildStudioFixtureFromApi(project: ApiProjectDetail, workspace: ApiCreationWorkspace): StudioFixture {
  const prompt = project.brief?.trim() || project.title;
  const baseStudio = createRuntimeStudioFixture({
    prompt,
    contentMode: project.contentMode,
  });
  const creationWorkspace = mergeCreationWorkspaceFromApi(baseStudio.creation, workspace);

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
      summary: episode.id === workspace.episode.id ? project.brief ?? '' : '待补充当前集剧情摘要。',
      sequence: episode.episodeNo,
      status: toProjectStatus(episode.status),
    })),
    creation: {
      ...creationWorkspace,
      points: baseStudio.creation.points,
    },
  };
}

export async function fetchCreationStudioProject(projectId: string): Promise<{ studio: ReturnType<typeof buildStudioFixtureFromApi> | null; runtimeApi?: CreationRuntimeApiContext }> {
  try {
    const project = await requestAivApiFromServer<ApiProjectDetail>(`/api/studio/projects/${encodeURIComponent(projectId)}`, { allowNotFound: true });
    if (!project) {
      return { studio: null };
    }

    const episodeId = project.currentEpisodeId ?? project.episodes[0]?.id;
    if (!episodeId) {
      throw new AivApiError('Project did not expose an episode id.', 'AIV_CREATION_EPISODE_REQUIRED');
    }

    const workspace = await requestAivApiFromServer<ApiCreationWorkspace>(
      `/api/projects/${encodeURIComponent(project.id)}/creation/workspace?episodeId=${encodeURIComponent(episodeId)}`,
    );

    if (!workspace) {
      throw new AivApiError('Creation workspace is empty.', 'AIV_CREATION_WORKSPACE_EMPTY');
    }

    return {
      studio: buildStudioFixtureFromApi(project, workspace),
      runtimeApi: {
        projectId: project.id,
        episodeId: workspace.episode.id,
      },
    };
  } catch {
    return {
      studio: getMockStudioProject(projectId),
    };
  }
}
