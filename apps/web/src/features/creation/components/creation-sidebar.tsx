'use client';

import type { CreationWorkspaceController } from '../lib/use-creation-workspace';
import { CreationAudioSidebar } from './creation-audio-sidebar';
import { CreationLipsyncSidebar } from './creation-lipsync-sidebar';
import { CreationVisualSidebar } from './creation-visual-sidebar';

interface CreationSidebarProps {
  controller: CreationWorkspaceController;
}

export function CreationSidebar({ controller }: CreationSidebarProps) {
  const { creation, activeShot } = controller;

  if (!activeShot) {
    return null;
  }

  if (creation.activeTrack === 'visual') {
    return <CreationVisualSidebar controller={controller} />;
  }

  if (creation.viewMode === 'lipsync') {
    return <CreationLipsyncSidebar controller={controller} />;
  }

  return <CreationAudioSidebar controller={controller} />;
}
