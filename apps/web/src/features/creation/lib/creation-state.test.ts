import assert from 'node:assert/strict';
import test from 'node:test';

import type { CreationWorkspace, Shot } from '@aiv/domain';

import type { CreationPageData } from './creation-page-data';
import {
  applySelectedVersionState,
  cloneCreationFixture,
  deriveStoryboardFromFramesState,
  finishBatchGenerationState,
} from './creation-state.js';

function makeShot(overrides?: Partial<Shot>): Shot {
  return {
    id: 'shot-1',
    title: '分镜 01',
    subtitleText: '字幕',
    narrationText: '旁白',
    imagePrompt: '原始画面提示词',
    motionPrompt: '原始运动提示词',
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
    materials: [
      {
        id: 'material-1',
        label: '素材 1',
        source: 'generated',
        kind: 'image',
      },
    ],
    activeMaterialId: 'material-1',
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
  const shots = overrides?.shots ?? [makeShot(), makeShot({ id: 'shot-2', title: '分镜 02', activeVersionId: 'version-2', selectedVersionId: 'version-2', versions: [{ id: 'version-2', label: '版本 1', modelId: 'seedance-2.0', status: 'active', mediaKind: 'image', createdAt: '刚刚' }] })];
  return {
    selectedShotId: shots[0].id,
    activeTrack: 'visual',
    viewMode: 'storyboard',
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

function makePageData(creation: CreationWorkspace): CreationPageData {
  return {
    brandName: 'AIV',
    project: {
      id: 'project-1',
      title: '项目',
      brief: '',
      contentMode: 'single',
      executionMode: 'auto',
      aspectRatio: '16:9',
      status: 'draft',
    },
    episodes: [
      {
        id: 'episode-1',
        title: '第 1 集',
        summary: '',
        sequence: 1,
        status: 'draft',
      },
    ],
    creation,
    historyWorks: [],
    explore: {
      categories: ['全部'],
    },
  };
}

test('cloneCreationFixture keeps valid selected shot and falls back lipsync base shot to selected shot when missing', () => {
  const workspace = makeWorkspace({
    selectedShotId: 'missing-shot',
    lipSync: {
      ...makeWorkspace().lipSync,
      baseShotId: 'missing-shot',
    },
  });

  const result = cloneCreationFixture(makePageData(workspace), 'shot-2', 'storyboard');

  assert.equal(result.selectedShotId, 'shot-2');
  assert.equal(result.lipSync.baseShotId, 'shot-2');
  assert.notEqual(result.shots[0], workspace.shots[0]);
});

test('deriveStoryboardFromFramesState inserts a derived shot after the base shot and syncs playback selection', () => {
  const workspace = makeWorkspace();

  const result = deriveStoryboardFromFramesState(workspace, 'shot-1', {
    ratio: '9:16',
    clipIn: 1,
    clipOut: 5,
    focus: 'motion',
    keepNarration: true,
    frameCount: 4,
    selectedFrames: [5, 1, 3],
    sourceVersionId: 'version-1',
  });

  assert.equal(result.shots.length, 3);
  const derivedShot = result.shots[1];
  assert.equal(derivedShot.title, '分镜 03');
  assert.match(derivedShot.narrationText, /#1 \/ #3 \/ #5/);
  assert.equal(derivedShot.canvasTransform.ratio, '9:16');
  assert.equal(result.selectedShotId, derivedShot.id);
  assert.equal(result.playback.currentSecond, 4);
});

test('finishBatchGenerationState marks the final shot failed for all-target runs and creates versions for successful shots', () => {
  const workspace = makeWorkspace({
    shots: [
      makeShot({ id: 'shot-1', status: 'generating', versions: [{ id: 'version-1', label: '版本 1', modelId: 'seedance-2.0', status: 'active', mediaKind: 'image', createdAt: '刚刚' }] }),
      makeShot({ id: 'shot-2', status: 'generating', versions: [{ id: 'version-2', label: '版本 1', modelId: 'seedance-2.0', status: 'active', mediaKind: 'image', createdAt: '刚刚' }], activeVersionId: 'version-2', selectedVersionId: 'version-2' }),
    ],
  });

  const result = finishBatchGenerationState(workspace, 'all');

  assert.equal(result.shots[0].status, 'success');
  assert.equal(result.shots[0].versions.length, 2);
  assert.equal(result.shots[0].pendingApplyVersionId, result.shots[0].selectedVersionId);
  assert.equal(result.shots[1].status, 'failed');
  assert.match(result.shots[1].lastError, /批量生成结果不稳定/);
});

test('applySelectedVersionState promotes selected version to active and clears pending apply', () => {
  const workspace = makeWorkspace({
    shots: [
      makeShot({
        versions: [
          { id: 'version-1', label: '版本 1', modelId: 'seedance-2.0', status: 'active', mediaKind: 'image', createdAt: '较早' },
          { id: 'version-2', label: '版本 2', modelId: 'seedance-2.0', status: 'pending_apply', mediaKind: 'video', createdAt: '刚刚' },
        ],
        activeVersionId: 'version-1',
        selectedVersionId: 'version-2',
        pendingApplyVersionId: 'version-2',
      }),
    ],
  });

  const result = applySelectedVersionState(workspace, 'shot-1', 'version-2');
  const shot = result.shots[0];

  assert.equal(shot.activeVersionId, 'version-2');
  assert.equal(shot.selectedVersionId, 'version-2');
  assert.equal(shot.pendingApplyVersionId, null);
  assert.deepEqual(
    shot.versions.map((version) => [version.id, version.status]),
    [
      ['version-1', 'archived'],
      ['version-2', 'active'],
    ],
  );
});
