import type { CreationViewMode, CreationWorkspace } from '@aiv/domain';

import type { CreationPageData } from './creation-page-data';

import { cloneShot } from './creation-utils';
import {
  addLipsyncDialogueState,
  removeLipsyncDialogueState,
  setLipsyncFieldState,
  setMusicFieldState,
  setVoiceFieldState,
  updateLipsyncDialogueState,
} from './creation-audio-state';
import {
  advancePlaybackState,
  seekPlaybackState,
  selectShotState,
  setCreationTrack,
  setCreationViewMode,
  setInlineShotFieldState,
  toggleInlineCropState,
  togglePlaybackState,
  toggleSubtitleState,
} from './creation-playback-state';
import {
  applyCanvasDraftState,
  applyCropStoryboardState,
  applySelectedVersionState,
  attachMaterialState,
  cancelShotGenerationState,
  confirmModelChangeState,
  deriveStoryboardFromFramesState,
  finishBatchGenerationState,
  finishShotGenerationState,
  removeMaterialState,
  resetShotState,
  selectVersionState,
  setActiveMaterialState,
  startBatchGenerationState,
  startShotGenerationState,
} from './creation-shot-state';
import { normalizeViewMode } from './ui-state';

export function cloneCreationFixture(studio: CreationPageData, initialShotId?: string, initialView?: CreationViewMode): CreationWorkspace {
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

export {
  addLipsyncDialogueState,
  advancePlaybackState,
  applyCanvasDraftState,
  applyCropStoryboardState,
  applySelectedVersionState,
  attachMaterialState,
  cancelShotGenerationState,
  confirmModelChangeState,
  deriveStoryboardFromFramesState,
  finishBatchGenerationState,
  finishShotGenerationState,
  removeLipsyncDialogueState,
  removeMaterialState,
  resetShotState,
  seekPlaybackState,
  selectShotState,
  selectVersionState,
  setActiveMaterialState,
  setCreationTrack,
  setCreationViewMode,
  setInlineShotFieldState,
  setLipsyncFieldState,
  setMusicFieldState,
  setVoiceFieldState,
  startBatchGenerationState,
  startShotGenerationState,
  toggleInlineCropState,
  togglePlaybackState,
  toggleSubtitleState,
  updateLipsyncDialogueState,
};
