import type { ProjectStatus } from '@aiv/domain';
import { getMockStudioProject } from '@aiv/mock-data';

import { requestAivApiFromServer } from '@/lib/aiv-api';

import type { PlannerPageBootstrap, ApiPlannerWorkspace } from './planner-api';
import { createPlannerPageData, plannerPageDataFromFixture } from './planner-page-data';
import { outlineToPreviewStructuredPlannerDoc } from './planner-structured-doc';

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
  const normalized = status.toLowerCase();
  if (normalized === 'publishing') {
    return 'export_ready' satisfies ProjectStatus;
  }
  if (normalized === 'ready') {
    return 'ready_for_storyboard' satisfies ProjectStatus;
  }
  return normalized as ProjectStatus;
}

function buildPlannerStudio(project: ApiProjectDetail, workspace: ApiPlannerWorkspace) {
  const runtimeMessages = (workspace.messages ?? [])
    .map((message) => {
      const content = message.content ?? {};
      const text = typeof content.text === 'string' ? content.text : '';
      if (!text) {
        return null;
      }

      return {
        id: message.id,
        role: message.role === 'user' ? 'user' as const : 'assistant' as const,
        content: text,
      };
    })
    .filter((message): message is { id: string; role: 'user' | 'assistant'; content: string } => message !== null);

  return createPlannerPageData({
    project: {
      id: project.id,
      title: project.title,
      brief: project.brief ?? '',
      contentMode: project.contentMode,
      executionMode: 'auto',
      aspectRatio: '9:16',
      status: toProjectStatus(project.status),
    },
    episodes: project.episodes.map((episode) => ({
      id: episode.id,
      title: episode.title,
      summary: episode.id === workspace.episode.id ? (workspace.episode.summary ?? project.brief ?? '') : '待补充当前集剧情摘要。',
      sequence: episode.episodeNo,
      status: toProjectStatus(episode.status),
    })),
    submittedRequirement: workspace.episode.summary ?? project.brief ?? '',
    pointCost: 0,
    messages: runtimeMessages,
    creationPoints: 120,
  });
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
