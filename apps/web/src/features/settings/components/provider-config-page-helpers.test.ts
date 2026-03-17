import assert from 'node:assert/strict';
import test from 'node:test';

import type { ProviderConfigItem } from '../lib/provider-config-api';
import {
  getDefaultModelSlug,
  getEnabledModelSlugs,
  makeDraft,
  modelKindLabel,
  setEnabledModelSlugs,
  shouldAutoSyncConfig,
} from './provider-config-page-helpers.js';

function makeConfig(overrides?: Partial<ProviderConfigItem>): ProviderConfigItem {
  return {
    provider: {
      id: 'provider-1',
      code: 'ark',
      name: 'Volcengine Ark',
      providerType: 'openai_compatible',
      baseUrl: 'https://ark.example.com',
      enabled: true,
      ...overrides?.provider,
    },
    endpoints: overrides?.endpoints ?? [
      { id: 'ep-text', slug: 'ark-text', label: 'Ark Text', modelKind: 'text', familySlug: 'ark-text', isDefault: true },
      { id: 'ep-image', slug: 'ark-image', label: 'Seedream', modelKind: 'image', familySlug: 'ark-image', isDefault: false },
      { id: 'ep-video', slug: 'ark-video', label: 'Seedance', modelKind: 'video', familySlug: 'ark-video', isDefault: false },
      { id: 'ep-audio', slug: 'ark-audio', label: 'Ark Audio', modelKind: 'audio', familySlug: 'ark-audio', isDefault: false },
    ],
    userConfig: {
      id: 'config-1',
      configured: true,
      hasApiKey: true,
      maskedApiKey: 'abcd••••wxyz',
      enabled: true,
      baseUrlOverride: null,
      defaults: {
        textEndpointSlug: 'ark-text',
        imageEndpointSlug: 'ark-image',
        videoEndpointSlug: 'ark-video',
        audioEndpointSlug: 'ark-audio',
        ...overrides?.userConfig?.defaults,
      },
      enabledModels: {
        textEndpointSlugs: ['ark-text'],
        imageEndpointSlugs: ['ark-image'],
        videoEndpointSlugs: ['ark-video'],
        audioEndpointSlugs: ['ark-audio'],
        ...overrides?.userConfig?.enabledModels,
      },
      catalogSync: {
        status: null,
        message: null,
        syncedAt: null,
        modelCount: null,
        ...overrides?.userConfig?.catalogSync,
      },
      lastTest: {
        status: null,
        message: null,
        endpointSlug: null,
        testedAt: null,
        ...overrides?.userConfig?.lastTest,
      },
      updatedAt: null,
      ...overrides?.userConfig,
    },
  };
}

test('makeDraft maps defaults, enabled models and selects text test first when available', () => {
  const result = makeDraft(makeConfig());

  assert.equal(result.baseUrlOverride, 'https://ark.example.com');
  assert.equal(result.testKind, 'text');
  assert.equal(result.defaults.audioEndpointSlug, 'ark-audio');
  assert.deepEqual(result.enabledModels.videoEndpointSlugs, ['ark-video']);
});

test('makeDraft falls back to image then video for test kind when text models are absent', () => {
  const imageFirst = makeDraft(makeConfig({
    endpoints: [
      { id: 'ep-image', slug: 'ark-image', label: 'Seedream', modelKind: 'image', familySlug: 'ark-image', isDefault: false },
      { id: 'ep-video', slug: 'ark-video', label: 'Seedance', modelKind: 'video', familySlug: 'ark-video', isDefault: false },
    ],
  }));
  const videoOnly = makeDraft(makeConfig({
    endpoints: [
      { id: 'ep-video', slug: 'ark-video', label: 'Seedance', modelKind: 'video', familySlug: 'ark-video', isDefault: false },
    ],
  }));

  assert.equal(imageFirst.testKind, 'image');
  assert.equal(videoOnly.testKind, 'video');
});

test('model kind helpers expose stable labels and slice correct enabled/default values', () => {
  const draft = makeDraft(makeConfig());

  assert.equal(modelKindLabel('audio'), '音频');
  assert.deepEqual(getEnabledModelSlugs(draft, 'audio'), ['ark-audio']);
  assert.equal(getDefaultModelSlug(draft, 'video'), 'ark-video');
});

test('setEnabledModelSlugs only replaces the targeted model kind', () => {
  const draft = makeDraft(makeConfig());

  const result = setEnabledModelSlugs(draft, 'audio', ['ark-audio-2']);

  assert.deepEqual(result, {
    textEndpointSlugs: ['ark-text'],
    imageEndpointSlugs: ['ark-image'],
    videoEndpointSlugs: ['ark-video'],
    audioEndpointSlugs: ['ark-audio-2'],
  });
});

test('shouldAutoSyncConfig only schedules configurable enabled unsynced providers once', () => {
  const config = makeConfig();

  assert.equal(shouldAutoSyncConfig(config, null, new Set()), true);
  assert.equal(shouldAutoSyncConfig(config, 'ark', new Set()), false);
  assert.equal(shouldAutoSyncConfig(config, null, new Set(['ark'])), false);
  assert.equal(shouldAutoSyncConfig(makeConfig({ userConfig: { ...config.userConfig, configured: false } }), null, new Set()), false);
  assert.equal(
    shouldAutoSyncConfig(makeConfig({ userConfig: { ...config.userConfig, catalogSync: { status: 'passed', message: 'ok', syncedAt: '2026-03-17T00:00:00.000Z', modelCount: 12 } } }), null, new Set()),
    false,
  );
  assert.equal(
    shouldAutoSyncConfig(makeConfig({ provider: { ...config.provider, code: 'mock' } }), null, new Set()),
    false,
  );
});
