import assert from 'node:assert/strict';
import test from 'node:test';

import { __testables } from './provider-config-query-service.js';

test('collectRequestedEndpointSlugs gathers defaults and enabled selections across all kinds', () => {
  const result = __testables.collectRequestedEndpointSlugs({
    defaults: {
      textEndpointSlug: 'ark-text',
      audioEndpointSlug: 'ark-audio',
    },
    enabledModels: {
      textEndpointSlugs: ['ark-text'],
      imageEndpointSlugs: ['ark-image'],
      videoEndpointSlugs: ['ark-video'],
      audioEndpointSlugs: ['ark-audio'],
    },
  });

  assert.deepEqual(result, ['ark-text', 'ark-audio', 'ark-text', 'ark-image', 'ark-video', 'ark-audio']);
});

test('hasMismatchedDefaultSelection rejects defaults missing from enabled lists and ignores empty lists', () => {
  assert.equal(
    __testables.hasMismatchedDefaultSelection({
      defaults: {
        videoEndpointSlug: 'ark-video-default',
      },
      enabledModels: {
        textEndpointSlugs: [],
        imageEndpointSlugs: [],
        videoEndpointSlugs: ['ark-video-alt'],
        audioEndpointSlugs: [],
      },
    }),
    true,
  );

  assert.equal(
    __testables.hasMismatchedDefaultSelection({
      defaults: {
        videoEndpointSlug: 'ark-video-default',
      },
      enabledModels: {
        textEndpointSlugs: [],
        imageEndpointSlugs: [],
        videoEndpointSlugs: [],
        audioEndpointSlugs: [],
      },
    }),
    false,
  );
});

test('resolveNextProviderConfigOptions preserves unrelated fields and current enabled lists for omitted kinds', () => {
  const result = __testables.resolveNextProviderConfigOptions(
    {
      extraFlag: true,
      audioEndpointSlug: 'old-audio',
      audioEndpointSlugs: ['old-audio'],
      videoEndpointSlugs: ['old-video'],
    },
    {
      defaults: {
        videoEndpointSlug: 'new-video',
      },
      enabledModels: {
        textEndpointSlugs: ['text-a'],
        imageEndpointSlugs: ['image-a'],
        videoEndpointSlugs: ['new-video'],
        audioEndpointSlugs: ['old-audio'],
      },
    },
  );

  assert.deepEqual(result, {
    extraFlag: true,
    audioEndpointSlugs: ['old-audio'],
    videoEndpointSlugs: ['new-video'],
    textEndpointSlug: null,
    imageEndpointSlug: null,
    videoEndpointSlug: 'new-video',
    audioEndpointSlug: 'old-audio',
    textEndpointSlugs: ['text-a'],
    imageEndpointSlugs: ['image-a'],
    catalogSyncStatus: null,
    catalogSyncMessage: null,
    catalogSyncedAt: null,
    catalogModelCount: null,
  });
});
