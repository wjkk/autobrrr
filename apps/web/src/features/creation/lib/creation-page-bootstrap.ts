import type { CreationWorkspace, ProjectStatus } from '@aiv/domain';

import { createCreationPageData } from './creation-page-data';
import { mergeCreationWorkspaceFromApi, type ApiCreationWorkspace, type ApiProjectDetail } from './creation-api';

export function toCreationProjectStatus(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === 'publishing') {
    return 'export_ready' satisfies ProjectStatus;
  }
  if (normalized === 'ready') {
    return 'ready_for_storyboard' satisfies ProjectStatus;
  }
  return normalized as ProjectStatus;
}

export function buildCreationPageDataFromApi(project: ApiProjectDetail, workspace: ApiCreationWorkspace) {
  const baseCreationWorkspace: CreationWorkspace = {
    activeTrack: 'visual',
    viewMode: 'default',
    selectedShotId: workspace.shots[0]?.id ?? '',
    shots: [],
    playback: {
      playing: false,
      currentSecond: 0,
      totalSecond: 0,
      subtitleVisible: true,
    },
    voice: {
      mode: 'text',
      audioName: '',
      voiceName: '默认音色',
      emotion: '默认',
      volume: 80,
      speed: 1,
    },
    music: {
      mode: 'ai',
      prompt: '',
      trackName: '',
      progress: '',
      volume: 72,
      generating: false,
      applied: false,
    },
    lipSync: {
      mode: 'single',
      inputMode: 'text',
      baseShotId: workspace.shots[0]?.id ?? '',
      audioName: '',
      dialogues: [],
      voiceModel: '默认口型',
      emotion: '默认',
      volume: 80,
      speed: 1,
    },
    points: 120,
  };
  const creationWorkspace = mergeCreationWorkspaceFromApi(baseCreationWorkspace, workspace);

  return createCreationPageData({
    project: {
      id: project.id,
      title: project.title,
      brief: project.brief ?? '',
      contentMode: project.contentMode,
      executionMode: 'auto',
      aspectRatio: '9:16',
      status: toCreationProjectStatus(project.status),
    },
    episodes: project.episodes.map((episode) => ({
      id: episode.id,
      title: episode.title,
      summary: episode.id === workspace.episode.id ? project.brief ?? '' : '待补充当前集剧情摘要。',
      sequence: episode.episodeNo,
      status: toCreationProjectStatus(episode.status),
    })),
    creation: creationWorkspace,
  });
}
