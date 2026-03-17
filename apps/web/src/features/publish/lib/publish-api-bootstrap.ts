import { getMockStudioProject } from '@aiv/mock-data';

import type { ApiPublishWorkspace, PublishPageBootstrap } from './publish-api';
import { buildPublishStudio } from './publish-page-bootstrap';
import { publishPageDataFromFixture } from './publish-page-data';

export interface ApiProjectDetail {
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

export function selectPublishEpisodeId(project: ApiProjectDetail) {
  return project.currentEpisodeId ?? project.episodes[0]?.id ?? null;
}

export function buildPublishBootstrap(project: ApiProjectDetail, workspace: ApiPublishWorkspace): PublishPageBootstrap {
  return {
    studio: buildPublishStudio(project, workspace),
    runtimeApi: {
      projectId: project.id,
      episodeId: workspace.episode.id,
    },
    initialPublishWorkspace: workspace,
  };
}

export function buildPublishFixtureFallback(projectId: string): PublishPageBootstrap {
  const fixture = getMockStudioProject(projectId);
  return {
    studio: fixture ? publishPageDataFromFixture(fixture) : null,
  };
}
