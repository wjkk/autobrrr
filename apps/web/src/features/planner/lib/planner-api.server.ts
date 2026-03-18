import { AivApiError, requestAivApiFromServer } from '@/lib/aiv-api';
import { toWorkspaceBootstrapError } from '@/features/shared/lib/workspace-bootstrap-error';

import type { PlannerPageBootstrap, ApiPlannerWorkspace } from './planner-api';
import { buildPlannerBootstrap, selectPlannerEpisodeId } from './planner-api-bootstrap';
import type { ApiPlannerProjectDetail } from './planner-page-bootstrap';

function readEpisodeIdOverride(value: string | undefined) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

export async function fetchPlannerStudioProject(projectId: string, episodeIdOverride?: string): Promise<PlannerPageBootstrap> {
  try {
    const project = await requestAivApiFromServer<ApiPlannerProjectDetail>(`/api/studio/projects/${encodeURIComponent(projectId)}`, { allowNotFound: true });
    if (!project) {
      return { studio: null };
    }

    const episodeId = readEpisodeIdOverride(episodeIdOverride) ?? selectPlannerEpisodeId(project);
    if (!episodeId) {
      throw new AivApiError('Project did not expose a planner episode id.', 'AIV_PLANNER_EPISODE_REQUIRED');
    }

    const workspace = await requestAivApiFromServer<ApiPlannerWorkspace>(
      `/api/projects/${encodeURIComponent(project.id)}/planner/workspace?episodeId=${encodeURIComponent(episodeId)}`,
    );

    if (!workspace) {
      throw new AivApiError('Planner workspace is empty.', 'AIV_PLANNER_WORKSPACE_EMPTY');
    }

    return buildPlannerBootstrap(project, workspace);
  } catch (error) {
    return {
      studio: null,
      error: toWorkspaceBootstrapError(error, '加载策划工作区失败。'),
    };
  }
}
