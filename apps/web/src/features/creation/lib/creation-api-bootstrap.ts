import { getMockStudioProject } from '@aiv/mock-data';

import { creationPageDataFromFixture } from './creation-page-data';
import { buildCreationPageDataFromApi } from './creation-page-bootstrap';
import type { ApiCreationWorkspace, ApiProjectDetail, CreationRuntimeApiContext } from './creation-api';

export interface CreationPageBootstrap {
  studio: ReturnType<typeof buildCreationPageDataFromApi> | null;
  runtimeApi?: CreationRuntimeApiContext;
}

export function selectCreationEpisodeId(project: ApiProjectDetail) {
  return project.currentEpisodeId ?? project.episodes[0]?.id ?? null;
}

export function buildCreationBootstrap(project: ApiProjectDetail, workspace: ApiCreationWorkspace) {
  return {
    studio: buildCreationPageDataFromApi(project, workspace),
    runtimeApi: {
      projectId: project.id,
      episodeId: workspace.episode.id,
    },
  } satisfies CreationPageBootstrap;
}

export function buildCreationFixtureFallback(projectId: string): CreationPageBootstrap {
  const fixture = getMockStudioProject(projectId);
  return {
    studio: fixture ? creationPageDataFromFixture(fixture) : null,
  };
}
