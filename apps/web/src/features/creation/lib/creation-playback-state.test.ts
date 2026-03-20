import assert from 'node:assert/strict';
import test from 'node:test';

import type { CreationWorkspace, Shot } from '@aiv/domain';

import {
  seekPlaybackState,
  selectShotState,
  togglePlaybackState,
} from './creation-playback-state.js';
import {
  addLipsyncDialogueState,
  updateLipsyncDialogueState,
} from './creation-audio-state.js';

function makeShot(overrides?: Partial<Shot>): Shot {
  return {
    id: 'shot-1',
    title: '分镜 01',
    subtitleText: '字幕',
    narrationText: '旁白',
    imagePrompt: '画面',
    motionPrompt: '运动',
    preferredModel: 'seedance-2.0',
    resolution: '1080P',
    durationMode: '4s',
    durationSeconds: 4,
    cropToVoice: false,
    status: 'pending',
    versions: [
      {
        id: 'version-1',
        label: '版本 1',
        modelId: 'seedance-2.0',
        status: 'active',
        mediaKind: 'image',
        createdAt: '刚刚',
      },
    ],
    activeVersionId: 'version-1',
    selectedVersionId: 'version-1',
    pendingApplyVersionId: null,
    materials: [],
    activeMaterialId: null,
    canvasTransform: {
      ratio: '16:9',
      zoom: 100,
      offsetX: 0,
      offsetY: 0,
      flipX: false,
    },
    lastError: '',
    ...overrides,
  };
}

function makeWorkspace(overrides?: Partial<CreationWorkspace>): CreationWorkspace {
  const shots = overrides?.shots ?? [makeShot(), makeShot({ id: 'shot-2', title: '分镜 02', durationSeconds: 6 })];
  return {
    selectedShotId: shots[0].id,
    activeTrack: 'visual',
    viewMode: 'default',
    points: 100,
    shots,
    playback: {
      currentSecond: 0,
      totalSecond: shots.reduce((sum, shot) => sum + shot.durationSeconds, 0),
      playing: false,
      subtitleVisible: true,
    },
    voice: {
      mode: 'text',
      audioName: '',
      voiceName: '默认',
      emotion: '默认',
      volume: 100,
      speed: 1,
    },
    music: {
      mode: 'ai',
      prompt: '',
      trackName: '',
      progress: '',
      volume: 80,
      generating: false,
      applied: false,
    },
    lipSync: {
      mode: 'single',
      inputMode: 'text',
      baseShotId: shots[0].id,
      audioName: '',
      dialogues: [],
      voiceModel: '默认',
      emotion: '默认',
      volume: 100,
      speed: 1,
    },
    ...overrides,
  };
}

test('selectShotState can sync playback position to the selected shot offset', () => {
  const result = selectShotState(makeWorkspace(), 'shot-2', true);

  assert.equal(result.selectedShotId, 'shot-2');
  assert.equal(result.playback.currentSecond, 4);
  assert.equal(result.playback.playing, false);
});

test('seekPlaybackState clamps seconds and togglePlaybackState restarts at the end', () => {
  const workspace = makeWorkspace({
    playback: {
      currentSecond: 12,
      totalSecond: 10,
      playing: false,
      subtitleVisible: true,
    },
  });

  const sought = seekPlaybackState(workspace, 99);
  const toggled = togglePlaybackState(sought);

  assert.equal(sought.playback.currentSecond, 10);
  assert.equal(toggled.playback.currentSecond, 0);
  assert.equal(toggled.playback.playing, true);
});

test('lipsync dialogue state helpers append and update dialogue items', () => {
  const added = addLipsyncDialogueState(makeWorkspace());
  const dialogue = added.lipSync.dialogues[0];
  const updated = updateLipsyncDialogueState(added, dialogue.id, 'text', '新的对白');

  assert.equal(added.lipSync.dialogues.length, 1);
  assert.equal(dialogue.speaker, '角色 A');
  assert.equal(updated.lipSync.dialogues[0]?.text, '新的对白');
});
