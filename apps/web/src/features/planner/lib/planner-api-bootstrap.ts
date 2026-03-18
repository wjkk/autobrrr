import type { PlannerPageBootstrap, ApiPlannerWorkspace } from './planner-api';
import { buildPlannerPageDataFromApi, type ApiPlannerProjectDetail } from './planner-page-bootstrap';
import { outlineToPreviewStructuredPlannerDoc } from './planner-structured-doc';

export function selectPlannerEpisodeId(project: ApiPlannerProjectDetail) {
  return project.currentEpisodeId ?? project.episodes[0]?.id ?? null;
}

export function buildPlannerBootstrap(
  project: ApiPlannerProjectDetail,
  workspace: ApiPlannerWorkspace,
): PlannerPageBootstrap {
  return {
    studio: buildPlannerPageDataFromApi(project, workspace),
    error: null,
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
}
