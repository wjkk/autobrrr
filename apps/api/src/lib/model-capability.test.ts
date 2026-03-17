import assert from 'node:assert/strict';
import test from 'node:test';

import {
  parseVideoModelCapability,
  readVideoModelCapabilityFromFamily,
  summarizeVideoModelCapabilityForPlanner,
} from './model-capability.js';

test('parseVideoModelCapability fills stable defaults', () => {
  const capability = parseVideoModelCapability(
    {
      supportsMultiShot: true,
    },
    'seedance-2-0',
  );

  assert.equal(capability.supportsMultiShot, true);
  assert.equal(capability.maxShotsPerGeneration, 1);
  assert.equal(capability.audioDescStyle, 'none');
  assert.equal(capability.promptStyle, 'single-shot');
});

test('readVideoModelCapabilityFromFamily rejects non-video families', () => {
  assert.throws(
    () =>
      readVideoModelCapabilityFromFamily({
        id: 'family-1',
        slug: 'doubao-text',
        name: 'Doubao Text',
        modelKind: 'TEXT',
        capabilityJson: {},
      }),
    /not a video family/i,
  );
});

test('summarizeVideoModelCapabilityForPlanner includes multi-shot and audio guidance', () => {
  const summary = summarizeVideoModelCapabilityForPlanner({
    familySlug: 'seedance-2-0',
    familyName: 'Seedance 2.0',
    capability: {
      supportsMultiShot: true,
      maxShotsPerGeneration: 6,
      timestampMeaning: 'narrative-hint',
      audioDescStyle: 'inline',
      referenceImageSupport: 'full',
      maxReferenceImages: 4,
      maxReferenceVideos: 0,
      maxReferenceAudios: 0,
      cameraVocab: 'english-cinematic',
      maxDurationSeconds: 10,
      maxResolution: '1080p',
      promptStyle: 'narrative',
      knownIssues: [],
      qualityNote: '适合连续剧情表达',
    },
  });

  assert.match(summary, /最多可合并 6 个连续分镜/);
  assert.match(summary, /将音效描述自然融入正文/);
  assert.match(summary, /英文电影术语/);
  assert.match(summary, /单次最长时长约 10 秒/);
});
