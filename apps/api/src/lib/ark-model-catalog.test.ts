import assert from 'node:assert/strict';
import test from 'node:test';

import { extractArkCatalogModels } from './ark-model-catalog.js';

test('extractArkCatalogModels classifies ark model catalog across text image video and audio', () => {
  const result = extractArkCatalogModels({
    data: [
      { id: 'doubao-seed-1-8-251228' },
      { id: 'seedream-2.0-pro' },
      { id: 'seedance-2.0-pro' },
      { id: 'voice-tts-pro', type: 'speech' },
    ],
  });

  assert.deepEqual(result, [
    {
      id: 'doubao-seed-1-8-251228',
      modelKind: 'TEXT',
      label: 'Doubao Seed 1 8 251228',
    },
    {
      id: 'seedance-2.0-pro',
      modelKind: 'VIDEO',
      label: 'Seedance 2.0 Pro',
    },
    {
      id: 'seedream-2.0-pro',
      modelKind: 'IMAGE',
      label: 'Seedream 2.0 Pro',
    },
    {
      id: 'voice-tts-pro',
      modelKind: 'AUDIO',
      label: 'Voice Tts Pro',
    },
  ]);
});

test('extractArkCatalogModels prefers metadata, skips duplicates and ignores unknown models', () => {
  const result = extractArkCatalogModels({
    items: [
      { id: 'voice-chat-experiment', modality: 'chat' },
      { id: 'voice-chat-experiment', modality: 'chat' },
      { id: 'mystery-model' },
      { model: 'seedance-live', capabilities: ['video'] },
      'seedream-raw',
    ],
  });

  assert.deepEqual(result, [
    {
      id: 'seedance-live',
      modelKind: 'VIDEO',
      label: 'Seedance Live',
    },
    {
      id: 'seedream-raw',
      modelKind: 'IMAGE',
      label: 'Seedream Raw',
    },
    {
      id: 'voice-chat-experiment',
      modelKind: 'TEXT',
      label: 'Voice Chat Experiment',
    },
  ]);
});
