import type { CreationWorkspace } from '@aiv/domain';

import { nextLocalId } from './creation-utils';

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
