import assert from 'node:assert/strict';
import test from 'node:test';

import { mergeProviderConfigOptions, parseProviderConfigOptions } from './provider-config-options.js';

test('parseProviderConfigOptions reads defaults, enabled models and catalog sync state', () => {
  const result = parseProviderConfigOptions({
    textEndpointSlug: 'ark-text-default',
    imageEndpointSlug: 'ark-image-default',
    videoEndpointSlug: 'ark-video-default',
    audioEndpointSlug: 'ark-audio-default',
    textEndpointSlugs: ['ark-text-default', 'ark-text-alt'],
    imageEndpointSlugs: ['ark-image-default'],
    videoEndpointSlugs: ['ark-video-default'],
    audioEndpointSlugs: ['ark-audio-default'],
    catalogSyncStatus: 'passed',
    catalogSyncMessage: 'synced',
    catalogSyncedAt: '2026-03-17T12:00:00.000Z',
    catalogModelCount: 42,
  });

  assert.deepEqual(result, {
    defaults: {
      textEndpointSlug: 'ark-text-default',
      imageEndpointSlug: 'ark-image-default',
      videoEndpointSlug: 'ark-video-default',
      audioEndpointSlug: 'ark-audio-default',
    },
    enabledModels: {
      textEndpointSlugs: ['ark-text-default', 'ark-text-alt'],
      imageEndpointSlugs: ['ark-image-default'],
      videoEndpointSlugs: ['ark-video-default'],
      audioEndpointSlugs: ['ark-audio-default'],
    },
    catalogSync: {
      status: 'passed',
      message: 'synced',
      syncedAt: '2026-03-17T12:00:00.000Z',
      modelCount: 42,
    },
    raw: {
      textEndpointSlug: 'ark-text-default',
      imageEndpointSlug: 'ark-image-default',
      videoEndpointSlug: 'ark-video-default',
      audioEndpointSlug: 'ark-audio-default',
      textEndpointSlugs: ['ark-text-default', 'ark-text-alt'],
      imageEndpointSlugs: ['ark-image-default'],
      videoEndpointSlugs: ['ark-video-default'],
      audioEndpointSlugs: ['ark-audio-default'],
      catalogSyncStatus: 'passed',
      catalogSyncMessage: 'synced',
      catalogSyncedAt: '2026-03-17T12:00:00.000Z',
      catalogModelCount: 42,
    },
  });
});

test('mergeProviderConfigOptions preserves unrelated raw fields and patches selected settings', () => {
  const result = mergeProviderConfigOptions(
    {
      providerNote: 'keep-me',
      textEndpointSlug: 'old-text',
      textEndpointSlugs: ['old-text'],
      catalogSyncStatus: 'failed',
    },
    {
      defaults: {
        videoEndpointSlug: 'new-video',
      },
      enabledModels: {
        audioEndpointSlugs: ['audio-a', 'audio-b'],
      },
      catalogSync: {
        status: 'passed',
        modelCount: 99,
      },
    },
  );

  assert.deepEqual(result, {
    providerNote: 'keep-me',
    textEndpointSlug: 'old-text',
    imageEndpointSlug: null,
    videoEndpointSlug: 'new-video',
    audioEndpointSlug: null,
    textEndpointSlugs: ['old-text'],
    imageEndpointSlugs: [],
    videoEndpointSlugs: [],
    audioEndpointSlugs: ['audio-a', 'audio-b'],
    catalogSyncStatus: 'passed',
    catalogSyncMessage: null,
    catalogSyncedAt: null,
    catalogModelCount: 99,
  });
});
