import type { CreationTrack, CreationViewMode, CreationWorkspace, Shot } from '@aiv/domain';

import { getShotOffset } from './creation-utils';
import { updateShotList } from './creation-state-shared';

export function setCreationViewMode(current: CreationWorkspace, viewMode: CreationViewMode): CreationWorkspace {
  return { ...current, viewMode };
}

export function setCreationTrack(current: CreationWorkspace, activeTrack: CreationTrack): CreationWorkspace {
  return { ...current, activeTrack };
}

export function selectShotState(current: CreationWorkspace, shotId: string, syncPlayback = false): CreationWorkspace {
  return {
    ...current,
    selectedShotId: shotId,
    playback: syncPlayback
      ? {
          ...current.playback,
          currentSecond: getShotOffset(current.shots, shotId),
          playing: false,
        }
      : current.playback,
  };
}

export function setInlineShotFieldState<T extends 'resolution' | 'durationMode'>(current: CreationWorkspace, shotId: string, field: T, value: Shot[T]): CreationWorkspace {
  return {
    ...current,
    shots: updateShotList(current.shots, shotId, (shot) => ({
      ...shot,
      [field]: value,
    })),
  };
}

export function toggleInlineCropState(current: CreationWorkspace, shotId: string): CreationWorkspace {
  return {
    ...current,
    shots: updateShotList(current.shots, shotId, (shot) => ({
      ...shot,
      cropToVoice: !shot.cropToVoice,
    })),
  };
}

export function togglePlaybackState(current: CreationWorkspace): CreationWorkspace {
  const shouldRestart = !current.playback.playing && current.playback.currentSecond >= current.playback.totalSecond;

  return {
    ...current,
    playback: {
      ...current.playback,
      currentSecond: shouldRestart ? 0 : current.playback.currentSecond,
      playing: !current.playback.playing,
    },
  };
}

export function advancePlaybackState(current: CreationWorkspace, deltaSeconds: number): CreationWorkspace {
  const nextSecond = current.playback.currentSecond + deltaSeconds;
  if (nextSecond >= current.playback.totalSecond) {
    return {
      ...current,
      playback: {
        ...current.playback,
        currentSecond: current.playback.totalSecond,
        playing: false,
      },
    };
  }
  return {
    ...current,
    playback: {
      ...current.playback,
      currentSecond: nextSecond,
    },
  };
}

export function seekPlaybackState(current: CreationWorkspace, nextSecond: number): CreationWorkspace {
  const clampedSecond = Math.min(Math.max(nextSecond, 0), current.playback.totalSecond);

  return {
    ...current,
    playback: {
      ...current.playback,
      currentSecond: clampedSecond,
      playing: false,
    },
  };
}

export function toggleSubtitleState(current: CreationWorkspace): CreationWorkspace {
  return {
    ...current,
    playback: {
      ...current.playback,
      subtitleVisible: !current.playback.subtitleVisible,
    },
  };
}
