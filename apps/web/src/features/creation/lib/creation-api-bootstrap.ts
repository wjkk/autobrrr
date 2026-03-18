import { buildCreationPageDataFromApi } from './creation-page-bootstrap';
import type { ApiCreationWorkspace, ApiProjectDetail, CreationRuntimeApiContext } from './creation-api';
import type { WorkspaceBootstrapError } from '@/features/shared/lib/workspace-bootstrap-error';

export interface CreationPageBootstrap {
  studio: ReturnType<typeof buildCreationPageDataFromApi> | null;
  error?: WorkspaceBootstrapError | null;
  runtimeApi?: CreationRuntimeApiContext;
}

export function selectCreationEpisodeId(project: ApiProjectDetail) {
  return project.currentEpisodeId ?? project.episodes[0]?.id ?? null;
}

export function buildCreationBootstrap(project: ApiProjectDetail, workspace: ApiCreationWorkspace) {
  return {
    studio: buildCreationPageDataFromApi(project, workspace),
    error: null,
    runtimeApi: {
      projectId: project.id,
      episodeId: workspace.episode.id,
    },
  } satisfies CreationPageBootstrap;
}
