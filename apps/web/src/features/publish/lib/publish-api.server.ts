import type { ProjectStatus } from '@aiv/domain';
import { getMockStudioProject } from '@aiv/mock-data';

import { requestAivApiFromServer } from '@/lib/aiv-api';

import type { ApiPublishWorkspace, PublishPageBootstrap } from './publish-api';
import { buildPublishStudio } from './publish-page-bootstrap';
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
