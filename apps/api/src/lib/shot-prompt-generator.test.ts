import assert from 'node:assert/strict';
import test from 'node:test';

import { generateShotPrompts, groupShotsForMultiShotModel } from './shot-prompt-generator.js';

const baseShots = [
  {
    id: 'shot-2',
    actKey: 'act-1',
    actTitle: '第一幕',
    sceneId: 'scene-1',
    sceneName: '天台',
    title: '冲突升级',
    durationSeconds: 4,
    visualDescription: '角色逼近镜头',
    composition: '中景',
    cameraMotion: '推镜',
    soundDesign: '风声增强',
    dialogue: '你必须现在做决定',
    sortOrder: 2,
  },
  {
    id: 'shot-1',
    actKey: 'act-1',
    actTitle: '第一幕',
    sceneId: 'scene-1',
    sceneName: '天台',
    title: '角色登场',
    durationSeconds: 3,
    visualDescription: '角色从门后走出',
    composition: '全景',
    cameraMotion: '移镜',
    soundDesign: '脚步声与风声',
    sortOrder: 1,
  },
  {
    id: 'shot-3',
    actKey: 'act-2',
    actTitle: '第二幕',
    sceneId: 'scene-2',
    sceneName: '走廊',
    title: '转场',
    durationSeconds: 2,
    visualDescription: '灯光闪烁',
    composition: '近景',
    cameraMotion: '拉镜',
    soundDesign: '电流噪声',
    sortOrder: 3,
  },
];

test('groupShotsForMultiShotModel keeps act boundaries and sorts by sortOrder', () => {
  const groups = groupShotsForMultiShotModel({
    shots: baseShots,
    maxShotsPerGeneration: 2,
  });

  assert.deepEqual(
    groups.map((group) => group.map((shot) => shot.id)),
    [['shot-1', 'shot-2'], ['shot-3']],
  );
});

test('generateShotPrompts emits multi-shot narrative prompt for supported models', () => {
  const prompts = generateShotPrompts({
    modelFamilySlug: 'seedance-2-0',
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
    },
    shots: baseShots,
  });

  assert.equal(prompts[0]?.mode, 'multi-shot');
  assert.deepEqual(prompts[0]?.shotIds, ['shot-1', 'shot-2']);
  assert.match(prompts[0]?.promptText ?? '', /wide shot/);
  assert.match(prompts[0]?.promptText ?? '', /tracking shot/);
  assert.match(prompts[0]?.promptText ?? '', /脚步声与风声/);
});

test('generateShotPrompts emits per-shot prompts for single-shot models', () => {
  const prompts = generateShotPrompts({
    modelFamilySlug: 'wan-2-6',
    capability: {
      supportsMultiShot: false,
      maxShotsPerGeneration: 1,
      timestampMeaning: 'ignored',
      audioDescStyle: 'none',
      referenceImageSupport: 'style',
      maxReferenceImages: 1,
      maxReferenceVideos: 0,
      maxReferenceAudios: 0,
      cameraVocab: 'chinese',
      maxDurationSeconds: null,
      maxResolution: null,
      promptStyle: 'single-shot',
      knownIssues: [],
    },
    shots: baseShots.slice(0, 2),
  });

  assert.equal(prompts.length, 2);
  assert.equal(prompts[0]?.mode, 'single-shot');
  assert.doesNotMatch(prompts[0]?.promptText ?? '', /脚步声与风声/);
  assert.match(prompts[0]?.promptText ?? '', /天台/);
});
