import assert from 'node:assert/strict';
import test from 'node:test';

import { mapProviderConfig, mapProviderEndpoints } from './provider-config-presenter.js';

test('mapProviderEndpoints normalizes family model kind to lowercase', () => {
  const result = mapProviderEndpoints([
    {
      id: 'endpoint-1',
      slug: 'ark-seedance-2-video',
      label: 'Seedance 2.0',
      isDefault: true,
      family: {
        slug: 'ark-video-catalog',
        modelKind: 'VIDEO',
      },
    },
  ]);

  assert.deepEqual(result, [
    {
      id: 'endpoint-1',
      slug: 'ark-seedance-2-video',
      label: 'Seedance 2.0',
      modelKind: 'video',
      familySlug: 'ark-video-catalog',
      isDefault: true,
    },
  ]);
});

test('mapProviderConfig masks api key and exposes parsed defaults, enabled models and test state', () => {
  const result = mapProviderConfig({
    provider: {
      id: 'provider-1',
      code: 'ark',
      name: 'Volcengine Ark',
      providerType: 'OPENAI_COMPATIBLE',
      baseUrl: 'https://ark.example.com',
      enabled: true,
    },
    endpoints: [
      {
        id: 'endpoint-1',
        slug: 'ark-seedance-2-video',
        label: 'Seedance 2.0',
        modelKind: 'video',
        familySlug: 'ark-video-catalog',
        isDefault: true,
      },
    ],
    config: {
      id: 'config-1',
      enabled: true,
      apiKey: '1234567890abcdef',
      baseUrlOverride: 'https://custom.example.com',
      optionsJson: {
        videoEndpointSlug: 'ark-seedance-2-video',
        audioEndpointSlug: 'ark-audio-voice',
        videoEndpointSlugs: ['ark-seedance-2-video'],
        audioEndpointSlugs: ['ark-audio-voice'],
        catalogSyncStatus: 'passed',
        catalogSyncMessage: 'ok',
        catalogSyncedAt: '2026-03-17T12:00:00.000Z',
        catalogModelCount: 88,
      },
      lastTestStatus: 'passed',
      lastTestMessage: 'connected',
      lastTestAt: new Date('2026-03-17T13:00:00.000Z'),
      lastTestEndpointSlug: 'ark-seedance-2-video',
      updatedAt: new Date('2026-03-17T14:00:00.000Z'),
    },
  });

  assert.equal(result.provider.providerType, 'openai_compatible');
  assert.equal(result.userConfig.maskedApiKey, '1234••••cdef');
  assert.equal(result.userConfig.defaults.videoEndpointSlug, 'ark-seedance-2-video');
  assert.equal(result.userConfig.defaults.audioEndpointSlug, 'ark-audio-voice');
  assert.deepEqual(result.userConfig.enabledModels.audioEndpointSlugs, ['ark-audio-voice']);
  assert.deepEqual(result.userConfig.catalogSync, {
    status: 'passed',
    message: 'ok',
    syncedAt: '2026-03-17T12:00:00.000Z',
    modelCount: 88,
  });
  assert.deepEqual(result.userConfig.lastTest, {
    status: 'passed',
    message: 'connected',
    endpointSlug: 'ark-seedance-2-video',
    testedAt: '2026-03-17T13:00:00.000Z',
  });
});

test('mapProviderConfig returns empty user config defaults when user has not configured provider', () => {
  const result = mapProviderConfig({
    provider: {
      id: 'provider-1',
      code: 'platou',
      name: 'Platou',
      providerType: 'NATIVE',
      baseUrl: null,
      enabled: true,
    },
  });

  assert.deepEqual(result.userConfig, {
    id: null,
    configured: false,
    hasApiKey: false,
    maskedApiKey: null,
    enabled: true,
    baseUrlOverride: null,
    defaults: {
      textEndpointSlug: null,
      imageEndpointSlug: null,
      videoEndpointSlug: null,
      audioEndpointSlug: null,
    },
    enabledModels: {
      textEndpointSlugs: [],
      imageEndpointSlugs: [],
      videoEndpointSlugs: [],
      audioEndpointSlugs: [],
    },
    catalogSync: {
      status: null,
      message: null,
      syncedAt: null,
      modelCount: null,
    },
    lastTest: {
      status: null,
      message: null,
      endpointSlug: null,
      testedAt: null,
    },
    updatedAt: null,
  });
});
