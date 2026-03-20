import type { CreationWorkspace, MaterialAsset, Shot } from '@aiv/domain';

import { nextLocalId } from './creation-utils';

export function updateShotList(shots: Shot[], shotId: string, updater: (shot: Shot) => Shot): Shot[] {
  return shots.map((shot) => (shot.id === shotId ? updater(shot) : shot));
}

export function appendMaterial(shot: Shot, label: string, source: MaterialAsset['source']): Shot {
  const material: MaterialAsset = {
    id: nextLocalId(`asset-${shot.id}`),
    label,
    source,
    kind: 'image',
  };

  return {
    ...shot,
    materials: [...shot.materials, material],
    activeMaterialId: material.id,
  };
}

export function syncCreationWithShots(current: CreationWorkspace, shots: Shot[], selectedShotId = current.selectedShotId): CreationWorkspace {
  const safeSelectedShotId = shots.some((shot) => shot.id === selectedShotId)
    ? selectedShotId
    : shots[0]?.id ?? current.selectedShotId;
  const totalSecond = Math.max(current.playback.totalSecond || 0, shots.reduce((sum, shot) => sum + shot.durationSeconds, 0));

  return {
    ...current,
    shots,
    selectedShotId: safeSelectedShotId,
    playback: {
      ...current.playback,
      currentSecond: Math.min(current.playback.currentSecond, totalSecond),
      totalSecond,
    },
  };
}
