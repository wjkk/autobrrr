import type { CreationTrack, CreationViewMode, CreationWorkspace, Shot } from '@aiv/domain';
import type { Dispatch, SetStateAction } from 'react';

import { creationCopy } from '@/lib/copy';

import {
  applyCanvasDraftState,
  applyCropStoryboardState,
  applySelectedVersionState,
  attachMaterialState,
  confirmModelChangeState,
  deriveStoryboardFromFramesState,
  removeMaterialState,
  resetShotState,
  selectShotState,
  selectVersionState,
  setActiveMaterialState,
  setCreationTrack,
  setCreationViewMode,
} from './creation-state';
import { makeCanvasDraft, makeModelPickerDraft, makeStoryToolDraft } from './ui-state';
import type { CanvasDraft, CreationDialogState, MaterialTab, ModelPickerDraft, StoryToolDraft, StoryToolMode } from './ui-state';

interface CreateCreationWorkspaceEditActionsArgs {
  creation: CreationWorkspace;
  dialog: CreationDialogState;
  activeShot: Shot | null;
  activeVersion: Shot['versions'][number] | null;
  storyToolDraft: StoryToolDraft;
  modelPickerDraft: ModelPickerDraft;
  canvasDraft: CanvasDraft;
  uploadedMaterialName: string;
  setCreation: Dispatch<SetStateAction<CreationWorkspace>>;
  setDialog: Dispatch<SetStateAction<CreationDialogState>>;
  setNotice: Dispatch<SetStateAction<string | null>>;
  setUploadedMaterialName: Dispatch<SetStateAction<string>>;
  setMaterialTab: Dispatch<SetStateAction<MaterialTab>>;
  setCanvasDraft: Dispatch<SetStateAction<CanvasDraft>>;
  setStoryToolDraft: Dispatch<SetStateAction<StoryToolDraft>>;
  setModelPickerDraft: Dispatch<SetStateAction<ModelPickerDraft>>;
  setModelPickerKind: Dispatch<SetStateAction<'image' | 'video'>>;
}

export function createCreationWorkspaceEditActions(args: CreateCreationWorkspaceEditActionsArgs) {
  const {
    creation,
    dialog,
    activeShot,
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
  } = args;

  const setViewMode = (viewMode: CreationViewMode) => {
    setCreation((current) => setCreationViewMode(current, viewMode));
    setNotice(null);
  };

  const setActiveTrack = (activeTrack: CreationTrack) => {
    setCreation((current) => setCreationTrack(current, activeTrack));
  };

  const selectShot = (shotId: string, syncPlayback = false) => {
    setCreation((current) => selectShotState(current, shotId, syncPlayback));
  };

  const selectVersion = (versionId: string) => {
    if (!activeShot) {
      return;
    }
    setCreation((current) => selectVersionState(current, activeShot.id, versionId));
    setNotice(null);
  };

  const applySelectedVersion = (shotId?: string, versionId?: string) => {
    const targetShot = creation.shots.find((shot) => shot.id === (shotId ?? activeShot?.id));
    if (!targetShot) {
      return;
    }

    const targetVersionId = versionId ?? targetShot.pendingApplyVersionId;
    if (!targetVersionId) {
      return;
    }

    setCreation((current) => {
      const withSelection = targetVersionId === targetShot.selectedVersionId ? current : selectVersionState(current, targetShot.id, targetVersionId);
      return applySelectedVersionState(withSelection, targetShot.id, targetVersionId);
    });
    setNotice(null);
  };

  const downloadVersion = (shotId?: string, versionId?: string) => {
    const targetShot = creation.shots.find((shot) => shot.id === (shotId ?? activeShot?.id));
    if (!targetShot) {
      return;
    }

    const targetVersion = targetShot.versions.find((version) => version.id === (versionId ?? targetShot.selectedVersionId ?? targetShot.activeVersionId));
    if (!targetVersion) {
      return;
    }

    setNotice(null);
  };

  const openStoryboardTool = (mode: StoryToolMode) => {
    if (!activeShot) {
      return;
    }

    setStoryToolDraft(makeStoryToolDraft(activeShot));
    setDialog({ type: 'story-tool', mode });
  };

  const setStoryToolField = <T extends keyof StoryToolDraft>(field: T, value: StoryToolDraft[T]) => {
    setStoryToolDraft((current) => ({ ...current, [field]: value }));
  };

  const toggleStoryToolFrame = (frame: number) => {
    setStoryToolDraft((current) => {
      const selectedFrames = current.selectedFrames.includes(frame)
        ? current.selectedFrames.filter((item) => item !== frame)
        : [...current.selectedFrames, frame].sort((left, right) => left - right);

      return {
        ...current,
        selectedFrames: selectedFrames.length ? selectedFrames : [frame],
      };
    });
  };

  const submitStoryboardTool = () => {
    if (!activeShot || dialog.type !== 'story-tool') {
      return;
    }

    if (dialog.mode === 'crop') {
      setCreation((current) => applyCropStoryboardState(current, activeShot.id, storyToolDraft));
      setNotice(`${activeShot.title} 的裁剪参数已回写到当前分镜。`);
    } else {
      setCreation((current) => deriveStoryboardFromFramesState(current, activeShot.id, storyToolDraft));
      setNotice(`已从 ${storyToolDraft.selectedFrames.length} 个关键帧生成新的衍生分镜。`);
    }

    setDialog({ type: 'none' });
  };

  const openModelPicker = (kind: 'image' | 'video' = 'image') => {
    if (!activeShot) {
      return;
    }

    setModelPickerKind(kind);
    setModelPickerDraft(makeModelPickerDraft(activeShot));
    setDialog({ type: 'model-picker' });
  };

  const setModelPickerField = <T extends keyof ModelPickerDraft>(field: T, value: ModelPickerDraft[T]) => {
    setModelPickerDraft((current) => ({ ...current, [field]: value }));
  };

  const applyModelPicker = () => {
    if (!activeShot) {
      return;
    }

    if (modelPickerDraft.selectedModel === activeShot.preferredModel) {
      setDialog({ type: 'none' });
      setNotice('当前分镜继续使用现有模型。');
      return;
    }

    setDialog({ type: 'confirm-model-reset', nextModel: modelPickerDraft.selectedModel });
  };

  const requestModelChange = (nextModel: string) => {
    if (!activeShot || nextModel === activeShot.preferredModel) {
      setNotice('当前分镜已使用该模型。');
      return;
    }
    setDialog({ type: 'confirm-model-reset', nextModel });
  };

  const confirmModelChange = (nextModel: string) => {
    if (!activeShot) {
      return;
    }
    setCreation((current) => confirmModelChangeState(current, activeShot.id, nextModel));
    setDialog({ type: 'none' });
    setNotice(creationCopy.modelWarning);
  };

  const resetShot = () => {
    if (!activeShot) {
      return;
    }
    setCreation((current) => resetShotState(current, activeShot.id));
    setNotice(creationCopy.resetSuccess);
  };

  const openMaterialsDialog = () => {
    setMaterialTab('local');
    setDialog({ type: 'materials' });
  };

  const attachLocalMaterial = () => {
    if (!activeShot || !uploadedMaterialName.trim()) {
      setNotice('请先选择本地素材。');
      return;
    }
    setCreation((current) => attachMaterialState(current, activeShot.id, uploadedMaterialName.trim(), 'local'));
    setUploadedMaterialName('');
    setDialog({ type: 'none' });
    setNotice('已应用至当前分镜');
  };

  const applyUploadedMaterial = (name: string) => {
    if (!activeShot || !name.trim()) {
      setNotice('请先选择本地素材。');
      return;
    }
    setCreation((current) => attachMaterialState(current, activeShot.id, name.trim(), 'local'));
    setNotice('已应用至当前分镜');
  };

  const attachHistoryMaterial = (label: string) => {
    if (!activeShot) {
      return;
    }
    setCreation((current) => attachMaterialState(current, activeShot.id, label, 'history'));
    setDialog({ type: 'none' });
    setNotice('已应用至当前分镜');
  };

  const setActiveMaterial = (materialId: string) => {
    if (!activeShot) {
      return;
    }
    setCreation((current) => setActiveMaterialState(current, activeShot.id, materialId));
    setNotice('已切换主素材。');
  };

  const removeMaterial = (materialId: string) => {
    if (!activeShot) {
      return;
    }
    setCreation((current) => removeMaterialState(current, activeShot.id, materialId));
    setNotice('素材已从当前分镜移除。');
  };

  const applyCanvasDraft = () => {
    if (!activeShot) {
      return;
    }
    setCreation((current) => applyCanvasDraftState(current, activeShot.id, canvasDraft));
    setDialog({ type: 'none' });
    setNotice('画布参数已应用到当前分镜。');
  };

  const resetCanvasDraft = () => {
    if (!activeShot) {
      return;
    }
    setCanvasDraft(makeCanvasDraft(activeShot));
  };

  const setCanvasField = (field: keyof CanvasDraft, value: CanvasDraft[keyof CanvasDraft]) => {
    setCanvasDraft((current) => ({ ...current, [field]: value }));
  };

  const openCanvasDialog = () => {
    if (!activeShot) {
      return;
    }

    setCanvasDraft(makeCanvasDraft(activeShot));
    setDialog((current) => (current.type === 'canvas' ? { type: 'none' } : { type: 'canvas' }));
  };

  return {
    setViewMode,
    setActiveTrack,
    selectShot,
    selectVersion,
    applySelectedVersion,
    downloadVersion,
    openStoryboardTool,
    setStoryToolField,
    toggleStoryToolFrame,
    submitStoryboardTool,
    openModelPicker,
    setModelPickerField,
    applyModelPicker,
    requestModelChange,
    confirmModelChange,
    resetShot,
    openMaterialsDialog,
    attachLocalMaterial,
    applyUploadedMaterial,
    attachHistoryMaterial,
    setActiveMaterial,
    removeMaterial,
    applyCanvasDraft,
    resetCanvasDraft,
    setCanvasField,
    openCanvasDialog,
  };
}
