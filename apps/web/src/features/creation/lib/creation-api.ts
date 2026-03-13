import type { CreationWorkspace, ProjectStatus, Shot, ShotStatus, ShotVersion } from '@aiv/domain';

export interface CreationRuntimeApiContext {
  projectId: string;
  episodeId: string;
}

export interface ApiProjectDetail {
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

export interface ApiWorkspaceShot {
  id: string;
  sequenceNo: number;
  title: string;
  subtitleText: string;
  narrationText: string;
  imagePrompt: string;
  motionPrompt: string;
  status: string;
  latestGenerationRun: {
    id: string;
    runType: string;
    status: string;
    modelEndpoint: {
      id: string;
      slug: string;
      label: string;
    } | null;
  } | null;
  activeVersionId: string | null;
  activeVersion: {
    id: string;
    label: string;
    mediaKind: 'image' | 'video';
    status: string;
  } | null;
}

export interface ApiCreationWorkspace {
  project: {
    id: string;
    title: string;
    status: string;
  };
  episode: {
    id: string;
    episodeNo: number;
    title: string;
    status: string;
  };
  shots: ApiWorkspaceShot[];
}

export interface ApiRun {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'canceled' | 'timed_out';
  providerStatus: string | null;
  output: Record<string, unknown> | null;
  errorCode: string | null;
  errorMessage: string | null;
}

function toProjectStatus(status: string): ProjectStatus {
  return (status.toLowerCase() as ProjectStatus) ?? 'planning';
}

function toShotStatus(status: string): ShotStatus {
  if (status === 'success' || status === 'failed' || status === 'queued') {
    return status;
  }

  if (status === 'running' || status === 'generating') {
    return 'generating';
  }

  return 'pending';
}

function inferDurationSeconds(shot: ApiWorkspaceShot) {
  const prompt = `${shot.motionPrompt} ${shot.subtitleText}`.toLowerCase();
  if (prompt.includes('6s') || prompt.includes('6秒')) {
    return 6;
  }
  return 4;
}

function inferResolution(shot: ApiWorkspaceShot): '720P' | '1080P' {
  return shot.activeVersion?.mediaKind === 'video' ? '1080P' : '720P';
}

function inferPreferredModel(shot: ApiWorkspaceShot) {
  return shot.latestGenerationRun?.modelEndpoint?.slug ?? 'vision-auto';
}

function inferPreferredModelLabel(shot: ApiWorkspaceShot) {
  return shot.latestGenerationRun?.modelEndpoint?.label ?? '智能选择';
}

function mapVersionStatus(status: string): ShotVersion['status'] {
  if (status === 'active') {
    return 'active';
  }
  if (status === 'pending_apply') {
    return 'pending_apply';
  }
  return 'archived';
}

function mapWorkspaceShotToCreationShot(shot: ApiWorkspaceShot): Shot {
  const versions: ShotVersion[] = shot.activeVersion
    ? [
        {
          id: shot.activeVersion.id,
          label: shot.activeVersion.label,
          modelId: inferPreferredModel(shot),
          status: mapVersionStatus(shot.activeVersion.status),
          mediaKind: shot.activeVersion.mediaKind,
          createdAt: '刚刚',
        },
      ]
    : [];
  const durationSeconds = inferDurationSeconds(shot);

  return {
    id: shot.id,
    title: shot.title,
    subtitleText: shot.subtitleText,
    narrationText: shot.narrationText,
    imagePrompt: shot.imagePrompt,
    motionPrompt: shot.motionPrompt,
    preferredModel: inferPreferredModel(shot),
    resolution: inferResolution(shot),
    durationMode: durationSeconds === 6 ? '6s' : '4s',
    durationSeconds,
    cropToVoice: false,
    status: toShotStatus(shot.status),
    versions,
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
  };
}

export function mergeCreationWorkspaceFromApi(current: CreationWorkspace, workspace: ApiCreationWorkspace): CreationWorkspace {
  const mapped = workspace.shots.map(mapWorkspaceShotToCreationShot);
  const selectedShotId = mapped.some((shot) => shot.id === current.selectedShotId) ? current.selectedShotId : mapped[0]?.id ?? current.selectedShotId;
  const totalSecond = mapped.reduce((sum, shot) => sum + shot.durationSeconds, 0);
  const baseShotId = mapped.some((shot) => shot.id === current.lipSync.baseShotId) ? current.lipSync.baseShotId : selectedShotId;

  return {
    ...current,
    shots: mapped,
    selectedShotId,
    playback: {
      ...current.playback,
      playing: false,
      currentSecond: Math.min(current.playback.currentSecond, totalSecond),
      totalSecond,
    },
    lipSync: {
      ...current.lipSync,
      baseShotId,
    },
  };
}
