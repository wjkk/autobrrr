import type { StudioFixture } from '@aiv/domain';
import { createRuntimeStudioFixture, getMockStudioProject } from '@aiv/mock-data';

import { AivApiError, requestAivApiFromServer } from '@/lib/aiv-api';

import type { ApiCreationWorkspace, ApiProjectDetail, CreationRuntimeApiContext } from './creation-api';

function toProjectStatus(status: string) {
  return status.toLowerCase() as StudioFixture['project']['status'];
}

function buildStudioFixtureFromApi(project: ApiProjectDetail, workspace: ApiCreationWorkspace): StudioFixture {
  const prompt = project.brief?.trim() || project.title;
  const baseStudio = createRuntimeStudioFixture({
    prompt,
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
      summary: episode.id === workspace.episode.id ? project.brief ?? '' : '待补充当前集剧情摘要。',
      sequence: episode.episodeNo,
      status: toProjectStatus(episode.status),
    })),
    creation: {
      ...baseStudio.creation,
      selectedShotId: workspace.shots[0]?.id ?? baseStudio.creation.selectedShotId,
      shots: workspace.shots.map((shot) => ({
        id: shot.id,
        title: shot.title,
        subtitleText: shot.subtitleText,
        narrationText: shot.narrationText,
        imagePrompt: shot.imagePrompt,
        motionPrompt: shot.motionPrompt,
        preferredModel: 'Vision Auto',
        resolution: shot.activeVersion?.mediaKind === 'video' ? '1080P' : '720P',
        durationMode: '4s',
        durationSeconds: 4,
        cropToVoice: false,
        status: shot.status === 'success' || shot.status === 'failed' || shot.status === 'queued' ? shot.status : 'pending',
        versions: shot.activeVersion
          ? [{
              id: shot.activeVersion.id,
              label: shot.activeVersion.label,
              modelId: 'Vision Auto',
              status: shot.activeVersion.status === 'active' ? 'active' : 'archived',
              mediaKind: shot.activeVersion.mediaKind,
              createdAt: '刚刚',
            }]
          : [],
        activeVersionId: shot.activeVersionId ?? '',
        selectedVersionId: shot.activeVersionId,
        pendingApplyVersionId: null,
        materials: [],
        activeMaterialId: null,
        canvasTransform: {
          ratio: '9:16',
          zoom: 100,
          offsetX: 0,
          offsetY: 0,
          flipX: false,
        },
        lastError: shot.status === 'failed' ? '本次生成失败，请重试。' : '',
      })),
      playback: {
        ...baseStudio.creation.playback,
        currentSecond: 0,
        totalSecond: Math.max(4, workspace.shots.length * 4),
        playing: false,
      },
      lipSync: {
        ...baseStudio.creation.lipSync,
        baseShotId: workspace.shots[0]?.id ?? baseStudio.creation.lipSync.baseShotId,
      },
    },
  };
}

export async function fetchCreationStudioProject(projectId: string): Promise<{ studio: ReturnType<typeof buildStudioFixtureFromApi> | null; runtimeApi?: CreationRuntimeApiContext }> {
  try {
    const project = await requestAivApiFromServer<ApiProjectDetail>(`/api/studio/projects/${encodeURIComponent(projectId)}`, { allowNotFound: true });
    if (!project) {
      return { studio: null };
    }

    const episodeId = project.currentEpisodeId ?? project.episodes[0]?.id;
    if (!episodeId) {
      throw new AivApiError('Project did not expose an episode id.', 'AIV_CREATION_EPISODE_REQUIRED');
    }

    const workspace = await requestAivApiFromServer<ApiCreationWorkspace>(
      `/api/projects/${encodeURIComponent(project.id)}/creation/workspace?episodeId=${encodeURIComponent(episodeId)}`,
    );

    if (!workspace) {
      throw new AivApiError('Creation workspace is empty.', 'AIV_CREATION_WORKSPACE_EMPTY');
    }

    return {
      studio: buildStudioFixtureFromApi(project, workspace),
      runtimeApi: {
        projectId: project.id,
        episodeId: workspace.episode.id,
      },
    };
  } catch {
    return {
      studio: getMockStudioProject(projectId),
    };
  }
}
