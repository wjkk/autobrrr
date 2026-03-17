import type { ProjectStatus } from '@aiv/domain';

import { requestAivApiFromServer } from '@/lib/aiv-api';

import type { ApiPublishWorkspace, PublishPageBootstrap } from './publish-api';
import {
  buildPublishBootstrap,
  buildPublishFixtureFallback,
  selectPublishEpisodeId,
  type ApiProjectDetail,
} from './publish-api-bootstrap';

export async function fetchPublishStudioProject(projectId: string): Promise<PublishPageBootstrap> {
  try {
    const project = await requestAivApiFromServer<ApiProjectDetail>(`/api/studio/projects/${encodeURIComponent(projectId)}`, { allowNotFound: true });
    if (!project) {
      return { studio: null };
    }

    const episodeId = selectPublishEpisodeId(project);
    if (!episodeId) {
      return { studio: null };
    }

    const workspace = await requestAivApiFromServer<ApiPublishWorkspace>(
      `/api/projects/${encodeURIComponent(project.id)}/publish/workspace?episodeId=${encodeURIComponent(episodeId)}`,
    );

    if (!workspace) {
      return { studio: null };
    }

    return buildPublishBootstrap(project, workspace);
  } catch {
    return buildPublishFixtureFallback(projectId);
  }
}
