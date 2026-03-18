import type { ProjectStatus } from '@aiv/domain';

import { AivApiError, requestAivApiFromServer } from '@/lib/aiv-api';
import { toWorkspaceBootstrapError } from '@/features/shared/lib/workspace-bootstrap-error';

import type { ApiPublishWorkspace, PublishPageBootstrap } from './publish-api';
import {
  buildPublishBootstrap,
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
      throw new AivApiError('Project did not expose a publish episode id.', 'AIV_PUBLISH_EPISODE_REQUIRED');
    }

    const workspace = await requestAivApiFromServer<ApiPublishWorkspace>(
      `/api/projects/${encodeURIComponent(project.id)}/publish/workspace?episodeId=${encodeURIComponent(episodeId)}`,
    );

    if (!workspace) {
      throw new AivApiError('Publish workspace is empty.', 'AIV_PUBLISH_WORKSPACE_EMPTY');
    }

    return buildPublishBootstrap(project, workspace);
  } catch (error) {
    return {
      studio: null,
      error: toWorkspaceBootstrapError(error, '加载发布工作区失败。'),
    };
  }
}
