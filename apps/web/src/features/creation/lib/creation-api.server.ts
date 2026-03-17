import type { CreationWorkspace, ProjectStatus } from '@aiv/domain';
import { getMockStudioProject } from '@aiv/mock-data';

import { AivApiError, requestAivApiFromServer } from '@/lib/aiv-api';

import { createCreationPageData, creationPageDataFromFixture } from './creation-page-data';
import { buildCreationPageDataFromApi } from './creation-page-bootstrap';
import { mergeCreationWorkspaceFromApi, type ApiCreationWorkspace, type ApiProjectDetail, type CreationRuntimeApiContext } from './creation-api';

export async function fetchCreationStudioProject(projectId: string): Promise<{ studio: ReturnType<typeof buildCreationPageDataFromApi> | null; runtimeApi?: CreationRuntimeApiContext }> {
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
      studio: buildCreationPageDataFromApi(project, workspace),
      runtimeApi: {
        projectId: project.id,
        episodeId: workspace.episode.id,
      },
    };
  } catch {
    const fixture = getMockStudioProject(projectId);
    return {
      studio: fixture ? creationPageDataFromFixture(fixture) : null,
    };
  }
}
