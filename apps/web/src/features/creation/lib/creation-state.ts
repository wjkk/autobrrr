import type { CreationTrack, CreationViewMode, CreationWorkspace, MaterialAsset, Shot, StudioFixture } from '@aiv/domain';

import { buildVersion, cloneShot, getShotOffset, nextLocalId, syncVersionStatuses } from './creation-utils';
import type { CanvasDraft, GenerationDraft, StoryToolDraft } from './ui-state';
import { normalizeViewMode } from './ui-state';

function updateShotList(shots: Shot[], shotId: string, updater: (shot: Shot) => Shot): Shot[] {
  return shots.map((shot) => (shot.id === shotId ? updater(shot) : shot));
}

function appendMaterial(shot: Shot, label: string, source: MaterialAsset['source']): Shot {
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

function syncCreationWithShots(current: CreationWorkspace, shots: Shot[], selectedShotId = current.selectedShotId): CreationWorkspace {
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

export function cloneCreationFixture(studio: StudioFixture, initialShotId?: string, initialView?: CreationViewMode): CreationWorkspace {
  const selectedShotId = studio.creation.shots.some((shot) => shot.id === initialShotId)
    ? initialShotId ?? studio.creation.selectedShotId
    : studio.creation.selectedShotId;

  return {
    ...studio.creation,
    selectedShotId,
    viewMode: normalizeViewMode(initialView, studio.creation.viewMode),
    shots: studio.creation.shots.map(cloneShot),
    playback: { ...studio.creation.playback },
    voice: { ...studio.creation.voice },
    music: { ...studio.creation.music },
    lipSync: {
      ...studio.creation.lipSync,
      dialogues: studio.creation.lipSync.dialogues.map((item) => ({ ...item })),
      baseShotId: studio.creation.shots.some((shot) => shot.id === studio.creation.lipSync.baseShotId)
        ? studio.creation.lipSync.baseShotId
        : selectedShotId,
    },
  };
}

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

export function startShotGenerationState(current: CreationWorkspace, shotId: string, draft: GenerationDraft): CreationWorkspace {
  return {
    ...current,
    shots: updateShotList(current.shots, shotId, (shot) => ({
      ...shot,
      preferredModel: draft.model,
      resolution: draft.resolution,
      durationMode: draft.durationMode,
      cropToVoice: draft.cropToVoice,
      status: 'generating',
    })),
  };
}

export function finishShotGenerationState(current: CreationWorkspace, shotId: string, modelId: string, mediaKind: 'image' | 'video' = 'video'): CreationWorkspace {
  return {
    ...current,
    shots: updateShotList(current.shots, shotId, (shot) => {
      const newVersion = buildVersion(shot, modelId, mediaKind);
      return {
        ...shot,
        preferredModel: modelId,
        status: 'success',
        versions: syncVersionStatuses({ ...shot, versions: [...shot.versions, newVersion] }, shot.activeVersionId, newVersion.id),
        selectedVersionId: newVersion.id,
        pendingApplyVersionId: newVersion.id,
      };
    }),
  };
}

export function cancelShotGenerationState(current: CreationWorkspace, shotId: string): CreationWorkspace {
  return {
    ...current,
    shots: updateShotList(current.shots, shotId, (shot) => ({
      ...shot,
      status: shot.versions.length ? 'success' : 'pending',
    })),
  };
}

export function startBatchGenerationState(current: CreationWorkspace, target: 'all' | 'missing'): CreationWorkspace {
  return {
    ...current,
    shots: current.shots.map((shot) => {
      const shouldRun = target === 'all' || shot.status === 'pending' || shot.status === 'failed';
      return shouldRun ? { ...shot, status: 'generating' } : shot;
    }),
  };
}

export function finishBatchGenerationState(current: CreationWorkspace, target: 'all' | 'missing'): CreationWorkspace {
  return {
    ...current,
    shots: current.shots.map((shot, index) => {
      const shouldRun = target === 'all' || shot.status === 'generating';
      if (!shouldRun) {
        return shot;
      }

      const shouldFail = (target === 'missing' && shot.id.endsWith('2')) || (target === 'all' && index === current.shots.length - 1);
      if (shouldFail) {
        return {
          ...shot,
          status: 'failed',
          lastError: '本次批量生成结果不稳定，建议单镜重试。',
        };
      }

      const newVersion = buildVersion(shot, shot.preferredModel);
      return {
        ...shot,
        status: 'success',
        versions: syncVersionStatuses({ ...shot, versions: [...shot.versions, newVersion] }, shot.activeVersionId || newVersion.id, newVersion.id),
        selectedVersionId: newVersion.id,
        pendingApplyVersionId: newVersion.id,
        lastError: '',
      };
    }),
  };
}

export function selectVersionState(current: CreationWorkspace, shotId: string, versionId: string): CreationWorkspace {
  return {
    ...current,
    shots: updateShotList(current.shots, shotId, (shot) => {
      const pendingApplyVersionId = versionId === shot.activeVersionId ? null : versionId;
      return {
        ...shot,
        selectedVersionId: versionId,
        pendingApplyVersionId,
        versions: syncVersionStatuses(shot, shot.activeVersionId, pendingApplyVersionId),
      };
    }),
  };
}

export function applySelectedVersionState(current: CreationWorkspace, shotId: string, targetVersionId: string): CreationWorkspace {
  return {
    ...current,
    shots: updateShotList(current.shots, shotId, (shot) => ({
      ...shot,
      status: 'success',
      activeVersionId: targetVersionId,
      selectedVersionId: targetVersionId,
      pendingApplyVersionId: null,
      versions: syncVersionStatuses(shot, targetVersionId, null),
    })),
  };
}

export function confirmModelChangeState(current: CreationWorkspace, shotId: string, nextModel: string): CreationWorkspace {
  return {
    ...current,
    shots: updateShotList(current.shots, shotId, (shot) => {
      const baseVersionId = nextLocalId(`${shot.id}-base`);
      return {
        ...shot,
        preferredModel: nextModel,
        status: 'pending',
        versions: [
          {
            id: baseVersionId,
            label: '版本 1',
            modelId: nextModel,
            status: 'active',
            mediaKind: 'image',
            createdAt: '刚刚',
          },
        ],
        activeVersionId: baseVersionId,
        selectedVersionId: baseVersionId,
        pendingApplyVersionId: null,
        lastError: '',
      };
    }),
  };
}

export function resetShotState(current: CreationWorkspace, shotId: string): CreationWorkspace {
  return {
    ...current,
    shots: updateShotList(current.shots, shotId, (shot) => ({
      ...shot,
      status: 'pending',
      pendingApplyVersionId: null,
      selectedVersionId: shot.activeVersionId,
      versions: syncVersionStatuses(shot, shot.activeVersionId, null),
      lastError: '',
    })),
  };
}

export function attachMaterialState(current: CreationWorkspace, shotId: string, label: string, source: MaterialAsset['source']): CreationWorkspace {
  return {
    ...current,
    shots: updateShotList(current.shots, shotId, (shot) => appendMaterial(shot, label, source)),
  };
}

export function setActiveMaterialState(current: CreationWorkspace, shotId: string, materialId: string): CreationWorkspace {
  return {
    ...current,
    shots: updateShotList(current.shots, shotId, (shot) => ({
      ...shot,
      activeMaterialId: materialId,
    })),
  };
}

export function removeMaterialState(current: CreationWorkspace, shotId: string, materialId: string): CreationWorkspace {
  return {
    ...current,
    shots: updateShotList(current.shots, shotId, (shot) => {
      const materials = shot.materials.filter((item) => item.id !== materialId);
      return {
        ...shot,
        materials,
        activeMaterialId: materials[0]?.id ?? null,
      };
    }),
  };
}

export function applyCanvasDraftState(current: CreationWorkspace, shotId: string, draft: CanvasDraft): CreationWorkspace {
  return {
    ...current,
    shots: updateShotList(current.shots, shotId, (shot) => ({
      ...shot,
      canvasTransform: { ...draft },
    })),
  };
}


export function applyCropStoryboardState(current: CreationWorkspace, shotId: string, draft: StoryToolDraft): CreationWorkspace {
  const nextShots = updateShotList(current.shots, shotId, (shot) => {
    const nextDuration = Math.max(2, Math.round(draft.clipOut - draft.clipIn) || shot.durationSeconds);
    const focusOffsetMap = {
      subject: { zoom: Math.max(shot.canvasTransform.zoom, 122), offsetX: 0, offsetY: -8 },
      motion: { zoom: Math.max(shot.canvasTransform.zoom, 112), offsetX: 14, offsetY: 4 },
      environment: { zoom: Math.max(shot.canvasTransform.zoom - 10, 92), offsetX: -18, offsetY: 10 },
    };
    const focusTransform = focusOffsetMap[draft.focus];

    return {
      ...shot,
      durationSeconds: nextDuration,
      durationMode: nextDuration <= 4 ? '4s' : nextDuration <= 6 ? '6s' : '智能',
      cropToVoice: draft.keepNarration,
      canvasTransform: {
        ratio: draft.ratio,
        zoom: focusTransform.zoom,
        offsetX: focusTransform.offsetX,
        offsetY: focusTransform.offsetY,
        flipX: shot.canvasTransform.flipX,
      },
      imagePrompt: `${shot.imagePrompt} 已按${draft.focus === 'subject' ? '主体' : draft.focus === 'motion' ? '动作' : '环境'}重新裁切。`,
    };
  });

  return syncCreationWithShots(current, nextShots);
}

export function deriveStoryboardFromFramesState(current: CreationWorkspace, shotId: string, draft: StoryToolDraft): CreationWorkspace {
  const baseIndex = current.shots.findIndex((shot) => shot.id === shotId);
  if (baseIndex === -1) {
    return current;
  }

  const baseShot = current.shots[baseIndex];
  const sourceVersion = baseShot.versions.find((version) => version.id === draft.sourceVersionId) ?? baseShot.versions[0];
  const nextShotId = nextLocalId('shot-derived');
  const nextVersionId = nextLocalId(`${nextShotId}-base`);
  const framesLabel = draft.selectedFrames.slice().sort((left, right) => left - right).map((frame) => `#${frame}`).join(' / ');
  const derivedShot: Shot = {
    ...cloneShot(baseShot),
    id: nextShotId,
    title: `分镜 ${String(current.shots.length + 1).padStart(2, '0')}`,
    subtitleText: `${baseShot.subtitleText} · 关键帧拆分`,
    narrationText: `由 ${framesLabel} 重新拆出的衍生分镜。`,
    imagePrompt: `${baseShot.imagePrompt} 从关键帧 ${framesLabel} 生出新的分镜结构。`,
    motionPrompt: `${baseShot.motionPrompt} 以关键帧 ${framesLabel} 重组镜头节奏。`,
    resolution: baseShot.resolution,
    durationMode: draft.frameCount >= 4 ? '6s' : '4s',
    durationSeconds: draft.frameCount >= 4 ? 6 : 4,
    cropToVoice: baseShot.cropToVoice,
    status: 'pending',
    versions: [
      {
        id: nextVersionId,
        label: '版本 1',
        modelId: sourceVersion?.modelId ?? baseShot.preferredModel,
        status: 'active',
        mediaKind: 'image',
        createdAt: '刚刚',
      },
    ],
    activeVersionId: nextVersionId,
    selectedVersionId: nextVersionId,
    pendingApplyVersionId: null,
    materials: baseShot.materials.map((material) => ({ ...material })),
    activeMaterialId: baseShot.activeMaterialId,
    canvasTransform: {
      ...baseShot.canvasTransform,
      ratio: draft.ratio,
    },
    lastError: '',
  };

  const nextShots = [...current.shots];
  nextShots.splice(baseIndex + 1, 0, derivedShot);
  const synced = syncCreationWithShots(current, nextShots, derivedShot.id);

  return {
    ...synced,
    playback: {
      ...synced.playback,
      currentSecond: getShotOffset(nextShots, derivedShot.id),
      playing: false,
    },
  };
}

export function setVoiceFieldState<T extends keyof CreationWorkspace['voice']>(current: CreationWorkspace, field: T, value: CreationWorkspace['voice'][T]): CreationWorkspace {
  return {
    ...current,
    voice: {
      ...current.voice,
      [field]: value,
    },
  };
}

export function setMusicFieldState<T extends keyof CreationWorkspace['music']>(current: CreationWorkspace, field: T, value: CreationWorkspace['music'][T]): CreationWorkspace {
  return {
    ...current,
    music: {
      ...current.music,
      [field]: value,
    },
  };
}

export function setLipsyncFieldState<T extends keyof CreationWorkspace['lipSync']>(current: CreationWorkspace, field: T, value: CreationWorkspace['lipSync'][T]): CreationWorkspace {
  return {
    ...current,
    lipSync: {
      ...current.lipSync,
      [field]: value,
    },
  };
}

export function addLipsyncDialogueState(current: CreationWorkspace): CreationWorkspace {
  return {
    ...current,
    lipSync: {
      ...current.lipSync,
      dialogues: [
        ...current.lipSync.dialogues,
        {
          id: nextLocalId('lip'),
          speaker: `角色 ${String.fromCharCode(65 + current.lipSync.dialogues.length)}`,
          text: '',
        },
      ],
    },
  };
}

export function updateLipsyncDialogueState(current: CreationWorkspace, dialogueId: string, field: 'speaker' | 'text', value: string): CreationWorkspace {
  return {
    ...current,
    lipSync: {
      ...current.lipSync,
      dialogues: current.lipSync.dialogues.map((item) => (item.id === dialogueId ? { ...item, [field]: value } : item)),
    },
  };
}

export function removeLipsyncDialogueState(current: CreationWorkspace, dialogueId: string): CreationWorkspace {
  return {
    ...current,
    lipSync: {
      ...current.lipSync,
      dialogues: current.lipSync.dialogues.filter((item) => item.id !== dialogueId),
    },
  };
}
