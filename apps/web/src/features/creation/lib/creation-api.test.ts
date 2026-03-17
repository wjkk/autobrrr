import assert from 'node:assert/strict';
import test from 'node:test';

import type { CreationWorkspace } from '@aiv/domain';

import { mergeCreationWorkspaceFromApi } from './creation-api';

function buildBaseWorkspace(): CreationWorkspace {
  return {
    activeTrack: 'visual',
    viewMode: 'default',
    selectedShotId: 'shot-legacy',
    shots: [],
    playback: {
      playing: true,
      currentSecond: 20,
      totalSecond: 40,
      subtitleVisible: true,
    },
    voice: {
      mode: 'text',
      audioName: '',
      voiceName: '默认音色',
      emotion: '默认',
      volume: 80,
      speed: 1,
    },
    music: {
      mode: 'ai',
      prompt: '',
      trackName: '',
      progress: '',
      volume: 72,
      generating: false,
      applied: false,
    },
    lipSync: {
      mode: 'single',
      inputMode: 'text',
      baseShotId: 'shot-legacy',
      audioName: '',
      dialogues: [],
      voiceModel: '默认口型',
      emotion: '默认',
      volume: 80,
      speed: 1,
    },
    points: 120,
  };
}

test('mergeCreationWorkspaceFromApi maps preferred model, materials and total duration from API workspace', () => {
  const result = mergeCreationWorkspaceFromApi(buildBaseWorkspace(), {
    project: {
      id: 'project-1',
      title: '项目A',
      status: 'READY',
    },
    episode: {
      id: 'episode-1',
      episodeNo: 1,
      title: '第1集',
      status: 'READY',
    },
    shots: [
      {
        id: 'shot-1',
        sequenceNo: 1,
        title: '镜头一',
        subtitleText: '镜头一 6s',
        narrationText: '旁白',
        imagePrompt: '图像提示词',
        motionPrompt: '推镜 6秒',
        promptJson: {
          mode: 'multi-shot',
        },
        targetVideoModelFamilySlug: 'seedance-2-0',
        materialBindings: [
          {
            id: 'asset-1',
            sourceUrl: 'https://example.com/generated.png',
            fileName: 'generated.png',
            mediaKind: 'image',
            sourceKind: 'generated',
            createdAt: '2026-03-17T10:00:00.000Z',
          },
        ],
        finalizedAt: '2026-03-17T10:00:00.000Z',
        status: 'running',
        latestGenerationRun: {
          id: 'run-1',
          runType: 'VIDEO_GENERATION',
          status: 'completed',
          modelEndpoint: {
            id: 'endpoint-1',
            slug: 'ark-seedance-2-video',
            label: 'Seedance 2.0',
          },
        },
        activeVersionId: 'version-1',
        activeVersion: {
          id: 'version-1',
          label: 'V1',
          mediaKind: 'video',
          status: 'active',
        },
      },
      {
        id: 'shot-2',
        sequenceNo: 2,
        title: '镜头二',
        subtitleText: '',
        narrationText: '',
        imagePrompt: '第二个镜头',
        motionPrompt: '静止',
        promptJson: null,
        targetVideoModelFamilySlug: null,
        materialBindings: [],
        finalizedAt: null,
        status: 'queued',
        latestGenerationRun: null,
        activeVersionId: null,
        activeVersion: null,
      },
    ],
  });

  assert.equal(result.selectedShotId, 'shot-1');
  assert.equal(result.playback.playing, false);
  assert.equal(result.playback.totalSecond, 10);
  assert.equal(result.playback.currentSecond, 10);
  assert.equal(result.lipSync.baseShotId, 'shot-1');
  assert.equal(result.shots[0]?.preferredModel, 'ark-seedance-2-video');
  assert.equal(result.shots[0]?.durationMode, '6s');
  assert.equal(result.shots[0]?.status, 'generating');
  assert.deepEqual(result.shots[0]?.materials, [
    {
      id: 'asset-1',
      label: 'generated.png',
      source: 'generated',
      kind: 'image',
    },
  ]);
  assert.equal(result.shots[1]?.status, 'queued');
  assert.equal(result.shots[1]?.preferredModel, 'vision-auto');
});

test('mergeCreationWorkspaceFromApi preserves current selection and lipsync base shot when still present', () => {
  const current = buildBaseWorkspace();
  current.selectedShotId = 'shot-2';
  current.lipSync.baseShotId = 'shot-2';
  current.playback.currentSecond = 3;

  const result = mergeCreationWorkspaceFromApi(current, {
    project: {
      id: 'project-1',
      title: '项目A',
      status: 'READY',
    },
    episode: {
      id: 'episode-1',
      episodeNo: 1,
      title: '第1集',
      status: 'READY',
    },
    shots: [
      {
        id: 'shot-1',
        sequenceNo: 1,
        title: '镜头一',
        subtitleText: '',
        narrationText: '',
        imagePrompt: '',
        motionPrompt: '',
        promptJson: null,
        targetVideoModelFamilySlug: null,
        materialBindings: [],
        finalizedAt: null,
        status: 'success',
        latestGenerationRun: null,
        activeVersionId: null,
        activeVersion: null,
      },
      {
        id: 'shot-2',
        sequenceNo: 2,
        title: '镜头二',
        subtitleText: '',
        narrationText: '',
        imagePrompt: '',
        motionPrompt: '',
        promptJson: null,
        targetVideoModelFamilySlug: 'seko-video',
        materialBindings: [],
        finalizedAt: null,
        status: 'success',
        latestGenerationRun: null,
        activeVersionId: null,
        activeVersion: null,
      },
    ],
  });

  assert.equal(result.selectedShotId, 'shot-2');
  assert.equal(result.lipSync.baseShotId, 'shot-2');
  assert.equal(result.playback.currentSecond, 3);
});
