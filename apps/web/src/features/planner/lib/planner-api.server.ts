import { requestAivApiFromServer } from '@/lib/aiv-api';

import type { PlannerPageBootstrap, ApiPlannerWorkspace } from './planner-api';
import { buildPlannerBootstrap, buildPlannerFixtureFallback, selectPlannerEpisodeId } from './planner-api-bootstrap';
import type { ApiPlannerProjectDetail } from './planner-page-bootstrap';

export async function fetchPlannerStudioProject(projectId: string): Promise<PlannerPageBootstrap> {
  try {
    const project = await requestAivApiFromServer<ApiPlannerProjectDetail>(`/api/studio/projects/${encodeURIComponent(projectId)}`, { allowNotFound: true });
    if (!project) {
      return { studio: null };
    }

    const episodeId = selectPlannerEpisodeId(project);
    if (!episodeId) {
      return { studio: null };
    }

    const workspace = await requestAivApiFromServer<ApiPlannerWorkspace>(
      `/api/projects/${encodeURIComponent(project.id)}/planner/workspace?episodeId=${encodeURIComponent(episodeId)}`,
    );

    if (!workspace) {
      return { studio: null };
    }

    return buildPlannerBootstrap(project, workspace);
  } catch {
    return buildPlannerFixtureFallback(projectId);
  }
}
