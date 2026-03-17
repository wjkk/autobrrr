import type { CreationWorkspace, ProjectStatus } from '@aiv/domain';

import { AivApiError, requestAivApiFromServer } from '@/lib/aiv-api';

import {
  buildCreationBootstrap,
  buildCreationFixtureFallback,
  selectCreationEpisodeId,
  type CreationPageBootstrap,
} from './creation-api-bootstrap';
import { mergeCreationWorkspaceFromApi, type ApiCreationWorkspace, type ApiProjectDetail, type CreationRuntimeApiContext } from './creation-api';

export async function fetchCreationStudioProject(projectId: string): Promise<CreationPageBootstrap> {
  try {
    const project = await requestAivApiFromServer<ApiProjectDetail>(`/api/studio/projects/${encodeURIComponent(projectId)}`, { allowNotFound: true });
    if (!project) {
      return { studio: null };
    }

    const episodeId = selectCreationEpisodeId(project);
    if (!episodeId) {
      throw new AivApiError('Project did not expose an episode id.', 'AIV_CREATION_EPISODE_REQUIRED');
    }

    const workspace = await requestAivApiFromServer<ApiCreationWorkspace>(
      `/api/projects/${encodeURIComponent(project.id)}/creation/workspace?episodeId=${encodeURIComponent(episodeId)}`,
    );

    if (!workspace) {
      throw new AivApiError('Creation workspace is empty.', 'AIV_CREATION_WORKSPACE_EMPTY');
    }

    return buildCreationBootstrap(project, workspace);
  } catch {
    return buildCreationFixtureFallback(projectId);
  }
}
