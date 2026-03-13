import { createRuntimeStudioFixture, getMockStudioProject } from '@aiv/mock-data';

import { requestAivApiFromServer } from '@/lib/aiv-api';

import type { PlannerPageBootstrap, ApiPlannerWorkspace } from './planner-api';

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

function toProjectStatus(status: string) {
  return status.toLowerCase() as ReturnType<typeof createRuntimeStudioFixture>['project']['status'];
}

function buildPlannerStudio(project: ApiProjectDetail, workspace: ApiPlannerWorkspace) {
  const baseStudio = createRuntimeStudioFixture({
    prompt: project.brief?.trim() || project.title,
    contentMode: project.contentMode,
  });

  return {
    ...baseStudio,
    scenarioLabel: 'API Project',
    project: {
      ...baseStudio.project,
      id: project.id,
      title: project.title,
      brief: project.brief ?? '',
      contentMode: project.contentMode,
      status: toProjectStatus(project.status),
    },
    episodes: project.episodes.map((episode) => ({
      id: episode.id,
      title: episode.title,
      summary: episode.id === workspace.episode.id ? (workspace.episode.summary ?? project.brief ?? '') : '待补充当前集剧情摘要。',
      sequence: episode.episodeNo,
      status: toProjectStatus(episode.status),
    })),
    planner: {
      ...baseStudio.planner,
      input: workspace.episode.summary ?? project.brief ?? '',
      submittedRequirement: workspace.episode.summary ?? project.brief ?? '',
      status: (workspace.plannerSession?.status === 'ready' ? 'ready' : workspace.plannerSession?.status === 'updating' ? 'updating' : 'idle') as 'idle' | 'updating' | 'ready',
      messages: workspace.latestPlannerRun?.generatedText
        ? [
            { id: 'planner-api-user', role: 'user' as const, content: workspace.episode.summary ?? project.brief ?? '' },
            { id: 'planner-api-assistant', role: 'assistant' as const, content: workspace.latestPlannerRun.generatedText },
          ]
        : baseStudio.planner.messages,
    },
  };
}

export async function fetchPlannerStudioProject(projectId: string): Promise<PlannerPageBootstrap> {
  try {
    const project = await requestAivApiFromServer<ApiProjectDetail>(`/api/studio/projects/${encodeURIComponent(projectId)}`, { allowNotFound: true });
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
      studio: buildPlannerStudio(project, workspace),
      runtimeApi: {
        projectId: project.id,
        episodeId: workspace.episode.id,
      },
      initialGeneratedText: workspace.latestPlannerRun?.generatedText ?? null,
      initialPlannerReady: workspace.plannerSession?.status === 'ready',
    };
  } catch {
    return {
      studio: getMockStudioProject(projectId),
    };
  }
}
