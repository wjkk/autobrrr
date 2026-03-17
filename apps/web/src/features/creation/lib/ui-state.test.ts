import assert from 'node:assert/strict';
import test from 'node:test';

import type { Shot } from '@aiv/domain';

import {
  makeCanvasDraft,
  makeGenerationDraft,
  makeModelPickerDraft,
  makeStoryToolDraft,
  normalizeViewMode,
} from './ui-state';

function buildShot(overrides: Partial<Shot> = {}): Shot {
  return {
    id: 'shot-1',
    title: '镜头一',
    subtitleText: '',
    narrationText: '',
    imagePrompt: '',
    motionPrompt: '',
    preferredModel: 'vision-auto',
    resolution: '720P',
    durationMode: '4s',
    durationSeconds: 4,
    cropToVoice: false,
    status: 'pending',
    versions: [],
    activeVersionId: 'version-1',
    selectedVersionId: 'version-2',
    pendingApplyVersionId: null,
    materials: [],
    activeMaterialId: null,
    canvasTransform: {
      ratio: '9:16',
      zoom: 100,
      offsetX: 12,
      offsetY: -4,
      flipX: true,
    },
    lastError: '',
    ...overrides,
  };
}

test('makeGenerationDraft and makeCanvasDraft mirror shot runtime values', () => {
  const shot = buildShot({
    preferredModel: 'ark-seedance-2-video',
    resolution: '1080P',
    durationMode: '6s',
    cropToVoice: true,
  });

  assert.deepEqual(makeGenerationDraft(shot), {
    model: 'ark-seedance-2-video',
    resolution: '1080P',
    durationMode: '6s',
    cropToVoice: true,
  });
  assert.deepEqual(makeCanvasDraft(shot), {
    ratio: '9:16',
    zoom: 100,
    offsetX: 12,
    offsetY: -4,
    flipX: true,
  });
});

test('makeStoryToolDraft prefers selected version and preserves shot duration', () => {
  const shot = buildShot({
    durationSeconds: 6,
    selectedVersionId: 'version-selected',
    activeVersionId: 'version-active',
  });

  assert.deepEqual(makeStoryToolDraft(shot), {
    ratio: '9:16',
    clipIn: 0,
    clipOut: 6,
    focus: 'subject',
    keepNarration: true,
    frameCount: 3,
    selectedFrames: [2, 4],
    sourceVersionId: 'version-selected',
  });
});

test('makeModelPickerDraft classifies detail/reference models and normalizeViewMode keeps fallback', () => {
  assert.deepEqual(makeModelPickerDraft(buildShot({ preferredModel: 'VeoDetailModel' })), {
    selectedModel: 'VeoDetailModel',
    category: 'detail',
  });
  assert.deepEqual(makeModelPickerDraft(buildShot({ preferredModel: 'ReferenceControlModel' })), {
    selectedModel: 'ReferenceControlModel',
    category: 'reference',
  });
  assert.deepEqual(makeModelPickerDraft(buildShot({ preferredModel: 'ark-seedance-2-video' })), {
    selectedModel: 'ark-seedance-2-video',
    category: 'auto',
  });

  assert.equal(normalizeViewMode(undefined, 'storyboard'), 'storyboard');
  assert.equal(normalizeViewMode('lipsync', 'storyboard'), 'lipsync');
});
