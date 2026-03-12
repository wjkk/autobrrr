import type { CSSProperties } from 'react';
import type { CreationWorkspace, Shot } from '@aiv/domain';

import { getShotAtSecond, getShotOffset } from './creation-utils';

interface SubtitleSegment {
  start: number;
  end: number;
  text: string;
}

const subtitleTimelineByShot: Record<string, SubtitleSegment[]> = {
  'shot-1': [
    { start: 0, end: 0.85, text: '科技宅大刘' },
    { start: 0.85, end: 2.65, text: '带回了新的家庭成员' },
    { start: 2.65, end: 4.2, text: '' },
  ],
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function getShotPlaybackWindow(workspace: CreationWorkspace, shot: Shot) {
  const offset = getShotOffset(workspace.shots, shot.id);
  const localSecond = workspace.playback.currentSecond - offset;

  return {
    shotOffset: offset,
    localSecond,
    clampedSecond: clamp(localSecond, 0, shot.durationSeconds),
    progress: clamp(localSecond / Math.max(shot.durationSeconds, 0.001), 0, 1),
    isInWindow: localSecond >= 0 && localSecond <= shot.durationSeconds,
  };
}

export function getPlaybackShot(workspace: CreationWorkspace) {
  return getShotAtSecond(workspace.shots, workspace.playback.currentSecond) ?? workspace.shots[0] ?? null;
}

export function getPlaybackSubtitle(workspace: CreationWorkspace, shot: Shot) {
  if (!workspace.playback.subtitleVisible) {
    return '';
  }

  const window = getShotPlaybackWindow(workspace, shot);
  const segments = subtitleTimelineByShot[shot.id];

  if (!segments) {
    return window.isInWindow ? shot.subtitleText : '';
  }

  if (!window.isInWindow) {
    return '';
  }

  const match = segments.find((item) => window.localSecond >= item.start && window.localSecond < item.end);

  return match?.text ?? shot.subtitleText;
}

export function getStageMotionStyle(workspace: CreationWorkspace, shot: Shot) {
  const { progress } = getShotPlaybackWindow(workspace, shot);
  const driftX = (progress - 0.5) * 12;
  const driftY = (0.5 - progress) * 8;
  const scale = 1.018 + (1 - Math.abs(progress - 0.5) * 2) * 0.022;
  const glow = 0.18 + (1 - Math.abs(progress - 0.5) * 2) * 0.16;

  return {
    '--stage-drift-x': `${driftX.toFixed(2)}px`,
    '--stage-drift-y': `${driftY.toFixed(2)}px`,
    '--stage-scale': scale.toFixed(4),
    '--stage-glow-strength': glow.toFixed(3),
    '--stage-progress': progress.toFixed(4),
  } as CSSProperties;
}

export function getTimelinePlayheadRatio(workspace: CreationWorkspace) {
  return clamp(workspace.playback.currentSecond / Math.max(workspace.playback.totalSecond, 0.001), 0, 1);
}
