import type { ProjectStatus } from '@aiv/domain';

import { createPlannerPageData } from './planner-page-data';
import type { ApiPlannerWorkspace } from './planner-api';

export interface ApiPlannerProjectDetail {
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

export function toPlannerProjectStatus(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === 'publishing') {
    return 'export_ready' satisfies ProjectStatus;
  }
  if (normalized === 'ready') {
    return 'ready_for_storyboard' satisfies ProjectStatus;
  }
  return normalized as ProjectStatus;
}

export function buildPlannerPageDataFromApi(project: ApiPlannerProjectDetail, workspace: ApiPlannerWorkspace) {
  const runtimeMessages = (workspace.messages ?? [])
    .map((message) => {
      const content = message.content ?? {};
      const text = typeof content.text === 'string' ? content.text.trim() : '';
      if (!text) {
        return null;
      }

      return {
        id: message.id,
        role: message.role === 'user' ? ('user' as const) : ('assistant' as const),
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
      status: toPlannerProjectStatus(project.status),
    },
    episodes: project.episodes.map((episode) => ({
      id: episode.id,
      title: episode.title,
      summary: episode.id === workspace.episode.id ? (workspace.episode.summary ?? project.brief ?? '') : '待补充当前集剧情摘要。',
      sequence: episode.episodeNo,
      status: toPlannerProjectStatus(episode.status),
    })),
    submittedRequirement: workspace.episode.summary ?? project.brief ?? '',
    pointCost: 0,
    messages: runtimeMessages,
    creationPoints: 120,
  });
}
