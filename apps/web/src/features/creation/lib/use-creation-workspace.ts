'use client';

import type { CreationWorkspace } from '@aiv/domain';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { CreationRuntimeApiContext } from './creation-api';
import type { CreationPageData } from './creation-page-data';
import {
  buildRuntimeModelOptions,
  resolveRuntimeModelDisplayName,
  type RuntimeModelOption,
} from './creation-runtime-api';
import { cloneCreationFixture } from './creation-state';
import { formatClock, formatShotDuration, shotAccent, statusLabel } from './creation-utils';
import {
  makeCanvasDraft,
  makeGenerationDraft,
  makeModelPickerDraft,
  makeStoryToolDraft,
  type CanvasDraft,
  type CreationDialogState,
  type GenerationDraft,
  type MaterialTab,
  type ModelPickerDraft,
  type StoryToolDraft,
} from './ui-state';
import { createCreationWorkspaceAudioActions } from './creation-workspace-audio-actions';
import { createCreationWorkspaceEditActions } from './creation-workspace-edit-actions';
import { createCreationWorkspaceGenerationActions } from './creation-workspace-generation-actions';
import { useCreationPlayback } from './use-creation-playback';
import { useCreationRuntimeModelCatalog } from './use-creation-runtime-model-catalog';

interface UseCreationWorkspaceOptions {
  studio: CreationPageData;
  runtimeApi?: CreationRuntimeApiContext;
  initialShotId?: string;
  initialView?: CreationWorkspace['viewMode'];
}

export function useCreationWorkspace({ studio, runtimeApi, initialShotId, initialView }: UseCreationWorkspaceOptions) {
  const initialCreation = cloneCreationFixture(studio, initialShotId, initialView);
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const generationTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const playbackFrameRef = useRef<number | null>(null);
  const playbackLastTickRef = useRef<number | null>(null);

  const [creation, setCreation] = useState(initialCreation);
  const [dialog, setDialog] = useState<CreationDialogState>({ type: 'none' });
  const [notice, setNotice] = useState<string | null>(null);
  const [materialTab, setMaterialTab] = useState<MaterialTab>('local');
  const [uploadedMaterialName, setUploadedMaterialName] = useState('');
  const [generateDraft, setGenerateDraft] = useState<GenerationDraft>(() => makeGenerationDraft(initialCreation.shots.find((shot) => shot.id === initialCreation.selectedShotId) ?? initialCreation.shots[0]));
  const [canvasDraft, setCanvasDraft] = useState<CanvasDraft>(() => makeCanvasDraft(initialCreation.shots.find((shot) => shot.id === initialCreation.selectedShotId) ?? initialCreation.shots[0]));
  const [storyToolDraft, setStoryToolDraft] = useState<StoryToolDraft>(() => makeStoryToolDraft(initialCreation.shots.find((shot) => shot.id === initialCreation.selectedShotId) ?? initialCreation.shots[0]));
  const [modelPickerDraft, setModelPickerDraft] = useState<ModelPickerDraft>(() => makeModelPickerDraft(initialCreation.shots.find((shot) => shot.id === initialCreation.selectedShotId) ?? initialCreation.shots[0]));
  const [lipsyncNotice, setLipsyncNotice] = useState<string | null>(null);
  const [modelPickerKind, setModelPickerKind] = useState<'image' | 'video'>('image');

  const runtimeModelCatalog = useCreationRuntimeModelCatalog(runtimeApi);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      generationTimersRef.current.forEach((timer) => clearTimeout(timer));
      if (playbackFrameRef.current !== null) {
        cancelAnimationFrame(playbackFrameRef.current);
      }
    };
  }, []);

  const activeShot = useMemo(
    () => creation.shots.find((shot) => shot.id === creation.selectedShotId) ?? creation.shots[0] ?? null,
    [creation.selectedShotId, creation.shots],
  );

  const activeVersion = useMemo(() => {
    if (!activeShot) {
      return null;
    }
    return activeShot.versions.find((version) => version.id === activeShot.activeVersionId) ?? activeShot.versions[0] ?? null;
  }, [activeShot]);

  const selectedVersion = useMemo(() => {
    if (!activeShot) {
      return null;
    }
    return activeShot.versions.find((version) => version.id === activeShot.selectedVersionId) ?? activeVersion;
  }, [activeShot, activeVersion]);

  const pendingVersion = useMemo(() => {
    if (!activeShot) {
      return null;
    }
    return activeShot.versions.find((version) => version.id === activeShot.pendingApplyVersionId) ?? null;
  }, [activeShot]);

  const activeMaterial = useMemo(() => {
    if (!activeShot) {
      return null;
    }
    return activeShot.materials.find((item) => item.id === activeShot.activeMaterialId) ?? activeShot.materials[0] ?? null;
  }, [activeShot]);

  useEffect(() => {
    if (!activeShot) {
      return;
    }
    setGenerateDraft(makeGenerationDraft(activeShot));
    setCanvasDraft(makeCanvasDraft(activeShot));
    setStoryToolDraft(makeStoryToolDraft(activeShot));
    setModelPickerDraft(makeModelPickerDraft(activeShot));
  }, [activeShot]);

  useCreationPlayback({
    creation,
    playbackFrameRef,
    playbackLastTickRef,
    setCreation,
  });

  const availableModelOptions: RuntimeModelOption[] = buildRuntimeModelOptions(
    modelPickerKind === 'video' ? runtimeModelCatalog.video : runtimeModelCatalog.image,
    modelPickerKind,
  );
  const resolveModelDisplayName = (modelId: string) => resolveRuntimeModelDisplayName(runtimeModelCatalog, modelId);

  const generationActions = createCreationWorkspaceGenerationActions({
    creation,
    activeShot,
    generateDraft,
    runtimeApi,
    runtimeModelCatalog,
    timersRef,
    generationTimersRef,
    setCreation,
    setDialog,
    setNotice,
    setGenerateDraft,
  });

  const editActions = createCreationWorkspaceEditActions({
    creation,
    dialog,
    activeShot,
    activeVersion,
    storyToolDraft,
    modelPickerDraft,
    canvasDraft,
    uploadedMaterialName,
    setCreation,
    setDialog,
    setNotice,
    setUploadedMaterialName,
    setMaterialTab,
    setCanvasDraft,
    setStoryToolDraft,
    setModelPickerDraft,
    setModelPickerKind,
  });

  const audioActions = createCreationWorkspaceAudioActions({
    creation,
    setCreation,
    setDialog,
    setNotice,
    setLipsyncNotice,
  });

  return {
    studio,
    creation,
    dialog,
    notice,
    materialTab,
    uploadedMaterialName,
    generateDraft,
    canvasDraft,
    storyToolDraft,
    modelPickerDraft,
    lipsyncNotice,
    activeShot,
    activeVersion,
    selectedVersion,
    pendingVersion,
    activeMaterial,
    statusLabel,
    shotAccent,
    formatClock,
    formatShotDuration,
    setDialog,
    setNotice,
    setMaterialTab,
    setUploadedMaterialName,
    setGenerateDraft,
    setCanvasDraft,
    setStoryToolDraft,
    setModelPickerDraft,
    setLipsyncNotice,
    modelPickerKind,
    availableModelOptions,
    resolveModelDisplayName,
    ...generationActions,
    ...editActions,
    ...audioActions,
  };
}

export type CreationWorkspaceController = ReturnType<typeof useCreationWorkspace>;
