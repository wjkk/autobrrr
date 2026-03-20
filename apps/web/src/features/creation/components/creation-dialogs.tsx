'use client';

import type { CreationWorkspaceController } from '../lib/use-creation-workspace';
import { CreationMaterialsDialogs } from './creation-materials-dialogs';
import { CreationModelPickerDialogs } from './creation-model-picker-dialogs';
import { CreationStoryToolDialogs } from './creation-story-tool-dialogs';
import { CreationVideoTaskDialogs } from './creation-video-task-dialogs';

interface CreationDialogsProps {
  controller: CreationWorkspaceController;
}

export function CreationDialogs({ controller }: CreationDialogsProps) {
  const { activeShot, dialog } = controller;

  if (!activeShot) {
    return null;
  }

  if (dialog.type === 'canvas' || dialog.type === 'lipsync') {
    return null;
  }

  return (
    <>
      <CreationVideoTaskDialogs controller={controller} />
      <CreationMaterialsDialogs controller={controller} />
      <CreationStoryToolDialogs controller={controller} />
      <CreationModelPickerDialogs controller={controller} />
    </>
  );
}
