import type { CreationWorkspace, MaterialAsset, Shot } from '@aiv/domain';

import type { CanvasDraft, GenerationDraft, StoryToolDraft } from './ui-state';

import { buildVersion, cloneShot, getShotOffset, nextLocalId, syncVersionStatuses } from './creation-utils';
import { appendMaterial, syncCreationWithShots, updateShotList } from './creation-state-shared';

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
