import test from 'node:test';
import assert from 'node:assert/strict';

import { __testables, extractPlatouCatalogModels } from './platou-model-catalog.js';

test('platou model catalog helpers normalize ids, humanize labels and infer kinds', () => {
  assert.equal(__testables.normalizeModelId(' veo3.1 '), 'veo3.1');
  assert.equal(__testables.humanizeModelId('gemini-3.1-flash-image-preview'), 'Gemini 3.1 Flash Image Preview');
  assert.equal(__testables.slugifyModelId('Gemini 3.1/Flash Image'), 'gemini-3-1-flash-image');
  assert.equal(__testables.inferModelKindFromMetadata({ modality: 'video-generation' }), 'VIDEO');
  assert.equal(__testables.inferModelKind('seedream-3.0', {}), 'IMAGE');
  assert.equal(__testables.inferModelKind('whisper-large-v3', {}), null);
});

test('extractPlatouCatalogModels classifies payloads, deduplicates and ignores unsupported models', () => {
  const models = extractPlatouCatalogModels({
    data: [
      { id: 'gemini-3.1-flash-lite-preview', type: 'text' },
      { id: 'seedream-3.0' },
      { id: 'veo3.1' },
      { id: 'veo3.1' },
      { id: 'whisper-large-v3' },
      { id: 'custom-model', capabilities: ['image-generation'] },
    ],
  });

  assert.deepEqual(models, [
    {
      id: 'custom-model',
      modelKind: 'IMAGE',
      label: 'Custom Model',
    },
    {
      id: 'gemini-3.1-flash-lite-preview',
      modelKind: 'TEXT',
      label: 'Gemini 3.1 Flash Lite Preview',
    },
    {
      id: 'seedream-3.0',
      modelKind: 'IMAGE',
      label: 'Seedream 3.0',
    },
    {
      id: 'veo3.1',
      modelKind: 'VIDEO',
      label: 'Veo 3.1',
    },
  ]);
});
