import type { Shot, ShotStatus, ShotVersion } from '@aiv/domain';

export function nextLocalId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function cloneShot(shot: Shot): Shot {
  return {
    ...shot,
    versions: shot.versions.map((version) => ({ ...version })),
    materials: shot.materials.map((material) => ({ ...material })),
    canvasTransform: { ...shot.canvasTransform },
  };
}

export function buildVersion(shot: Shot, modelId: string): ShotVersion {
  return {
    id: nextLocalId(`${shot.id}-v`),
    label: `版本 ${shot.versions.length + 1}`,
    modelId,
    status: 'pending_apply',
    mediaKind: 'video',
    createdAt: '刚刚',
  };
}

export function syncVersionStatuses(shot: Shot, activeVersionId: string, pendingApplyVersionId: string | null): ShotVersion[] {
  return shot.versions.map((version) => {
    if (version.id === activeVersionId) {
      return { ...version, status: 'active' };
    }

    if (pendingApplyVersionId && version.id === pendingApplyVersionId) {
      return { ...version, status: 'pending_apply' };
    }

    return { ...version, status: 'archived' };
  });
}

export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const minute = Math.floor(safe / 60);
  const second = Math.floor(safe % 60);
  return `${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
}

export function formatShotDuration(seconds: number): string {
  return `00:${String(seconds).padStart(2, '0')}`;
}

export function getShotOffset(shots: Shot[], targetShotId: string): number {
  let offset = 0;

  for (const shot of shots) {
    if (shot.id === targetShotId) {
      return offset;
    }

    offset += shot.durationSeconds;
  }

  return 0;
}

export function getShotAtSecond(shots: Shot[], currentSecond: number): Shot | null {
  let offset = 0;

  for (const shot of shots) {
    const nextOffset = offset + shot.durationSeconds;
    if (currentSecond >= offset && currentSecond < nextOffset) {
      return shot;
    }
    offset = nextOffset;
  }

  return shots[shots.length - 1] ?? null;
}

export function statusLabel(status: ShotStatus): string {
  if (status === 'success') {
    return '已完成';
  }

  if (status === 'failed') {
    return '失败';
  }

  if (status === 'generating') {
    return '生成中';
  }

  if (status === 'queued') {
    return '排队中';
  }

  return '待生成';
}

export function shotAccent(shotId: string): { from: string; to: string; glow: string } {
  const palette = [
    { from: '#4b6cb7', to: '#182848', glow: 'rgba(92, 137, 255, 0.24)' },
    { from: '#6f4ba8', to: '#24193f', glow: 'rgba(175, 110, 255, 0.22)' },
    { from: '#a85a33', to: '#352012', glow: 'rgba(255, 159, 67, 0.24)' },
    { from: '#227a8a', to: '#122a35', glow: 'rgba(59, 198, 224, 0.22)' },
  ];

  const index = Math.abs(
    Array.from(shotId).reduce((sum, char) => sum + char.charCodeAt(0), 0),
  ) % palette.length;

  return palette[index];
}
