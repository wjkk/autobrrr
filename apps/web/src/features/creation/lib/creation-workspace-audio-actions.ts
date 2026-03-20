import type { CreationWorkspace } from '@aiv/domain';
import type { Dispatch, SetStateAction } from 'react';

import {
  addLipsyncDialogueState,
  removeLipsyncDialogueState,
  seekPlaybackState,
  setLipsyncFieldState,
  setMusicFieldState,
  setVoiceFieldState,
  togglePlaybackState,
  toggleSubtitleState,
  updateLipsyncDialogueState,
} from './creation-state';
import type { CreationDialogState } from './ui-state';

interface CreateCreationWorkspaceAudioActionsArgs {
  creation: CreationWorkspace;
  setCreation: Dispatch<SetStateAction<CreationWorkspace>>;
  setDialog: Dispatch<SetStateAction<CreationDialogState>>;
  setNotice: Dispatch<SetStateAction<string | null>>;
  setLipsyncNotice: Dispatch<SetStateAction<string | null>>;
}

export function createCreationWorkspaceAudioActions(args: CreateCreationWorkspaceAudioActionsArgs) {
  const { creation, setCreation, setDialog, setNotice, setLipsyncNotice } = args;

  const togglePlayback = () => {
    if (!creation.playback.totalSecond) {
      return;
    }
    setCreation((current) => togglePlaybackState(current));
  };

  const seekPlayback = (nextSecond: number) => {
    setCreation((current) => seekPlaybackState(current, nextSecond));
  };

  const toggleSubtitle = () => {
    setCreation((current) => toggleSubtitleState(current));
    setNotice(null);
  };

  const setVoiceField = <T extends keyof typeof creation.voice>(field: T, value: typeof creation.voice[T]) => {
    setCreation((current) => setVoiceFieldState(current, field, value));
  };

  const setMusicField = <T extends keyof typeof creation.music>(field: T, value: typeof creation.music[T]) => {
    setCreation((current) => setMusicFieldState(current, field, value));
  };

  const setLipsyncField = <T extends keyof typeof creation.lipSync>(field: T, value: typeof creation.lipSync[T]) => {
    setCreation((current) => setLipsyncFieldState(current, field, value));
  };

  const addLipsyncDialogue = () => {
    setCreation((current) => addLipsyncDialogueState(current));
  };

  const updateLipsyncDialogue = (dialogueId: string, field: 'speaker' | 'text', value: string) => {
    setCreation((current) => updateLipsyncDialogueState(current, dialogueId, field, value));
  };

  const removeLipsyncDialogue = (dialogueId: string) => {
    if (creation.lipSync.dialogues.length <= 1) {
      setLipsyncNotice('多人模式至少保留 1 条对白。');
      return;
    }
    setCreation((current) => removeLipsyncDialogueState(current, dialogueId));
  };

  const submitLipsync = () => {
    const { lipSync } = creation;
    if (!lipSync.baseShotId) {
      setLipsyncNotice('请先选择底图。');
      return;
    }
    if (lipSync.inputMode === 'text' && !lipSync.dialogues.some((item) => item.text.trim())) {
      setLipsyncNotice('文本模式下必须输入对白。');
      return;
    }
    if (lipSync.inputMode === 'audio' && !lipSync.audioName.trim()) {
      setLipsyncNotice('上传模式下必须选择音频文件。');
      return;
    }
    setLipsyncNotice('对口型任务已提交，当前为 mock 成功态。');
  };

  const openLipsyncDialog = () => {
    setLipsyncNotice(null);
    setDialog((current) => (current.type === 'lipsync' ? { type: 'none' } : { type: 'lipsync' }));
  };

  return {
    togglePlayback,
    seekPlayback,
    toggleSubtitle,
    setVoiceField,
    setMusicField,
    setLipsyncField,
    addLipsyncDialogue,
    updateLipsyncDialogue,
    removeLipsyncDialogue,
    submitLipsync,
    openLipsyncDialog,
  };
}
