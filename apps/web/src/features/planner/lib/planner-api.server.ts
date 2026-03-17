import { getMockStudioProject } from '@aiv/mock-data';

import { requestAivApiFromServer } from '@/lib/aiv-api';

import type { PlannerPageBootstrap, ApiPlannerWorkspace } from './planner-api';
import { buildPlannerPageDataFromApi, type ApiPlannerProjectDetail } from './planner-page-bootstrap';
import { plannerPageDataFromFixture } from './planner-page-data';
import { outlineToPreviewStructuredPlannerDoc } from './planner-structured-doc';

export async function fetchPlannerStudioProject(projectId: string): Promise<PlannerPageBootstrap> {
  try {
    const project = await requestAivApiFromServer<ApiPlannerProjectDetail>(`/api/studio/projects/${encodeURIComponent(projectId)}`, { allowNotFound: true });
    if (!project) {
      return { studio: null };
    }

    const episodeId = project.currentEpisodeId ?? project.episodes[0]?.id;
    if (!episodeId) {
      return { studio: null };
    }

    const workspace = await requestAivApiFromServer<ApiPlannerWorkspace>(
      `/api/projects/${encodeURIComponent(project.id)}/planner/workspace?episodeId=${encodeURIComponent(episodeId)}`,
    );

    if (!workspace) {
      return { studio: null };
    }

    return {
      studio: buildPlannerPageDataFromApi(project, workspace),
      runtimeApi: {
        projectId: project.id,
        episodeId: workspace.episode.id,
      },
      initialGeneratedText: workspace.latestPlannerRun?.generatedText ?? null,
      initialStructuredDoc:
        workspace.activeRefinement?.structuredDoc
        ?? (workspace.activeOutline?.outlineDoc ? outlineToPreviewStructuredPlannerDoc(workspace.activeOutline.outlineDoc) : null)
        ?? workspace.latestPlannerRun?.structuredDoc
        ?? null,
      initialPlannerReady: workspace.plannerSession?.status === 'ready',
      initialWorkspace: workspace,
    };
  } catch {
    const fixture = getMockStudioProject(projectId);
    return {
      studio: fixture ? plannerPageDataFromFixture(fixture) : null,
    };
  }
}
