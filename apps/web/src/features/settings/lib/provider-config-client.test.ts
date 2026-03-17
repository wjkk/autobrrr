import assert from 'node:assert/strict';
import test from 'node:test';

import type { DraftState } from '../components/provider-config-page-helpers';
import {
  buildProviderConfigUpdateRequestBody,
  parseProviderConfigMutationResponse,
  parseSettingsAuthResponse,
} from './provider-config-client.js';

const sampleDraft: DraftState = {
  apiKey: '  secret-key  ',
  baseUrlOverride: '  https://override.example.com  ',
  enabled: true,
  testKind: 'video',
  enabledModels: {
    textEndpointSlugs: ['ark-text'],
    imageEndpointSlugs: ['ark-image'],
    videoEndpointSlugs: ['ark-video'],
    audioEndpointSlugs: ['ark-audio'],
  },
  defaults: {
    textEndpointSlug: 'ark-text',
    imageEndpointSlug: '',
    videoEndpointSlug: 'ark-video',
    audioEndpointSlug: '',
  },
};

test('buildProviderConfigUpdateRequestBody trims inputs and normalizes empty defaults to null', () => {
  const result = buildProviderConfigUpdateRequestBody(sampleDraft);

  assert.deepEqual(result, {
    apiKey: 'secret-key',
    baseUrlOverride: 'https://override.example.com',
    enabled: true,
    defaults: {
      textEndpointSlug: 'ark-text',
      imageEndpointSlug: null,
      videoEndpointSlug: 'ark-video',
      audioEndpointSlug: null,
    },
    enabledModels: {
      textEndpointSlugs: ['ark-text'],
      imageEndpointSlugs: ['ark-image'],
      videoEndpointSlugs: ['ark-video'],
      audioEndpointSlugs: ['ark-audio'],
    },
  });
});

test('parseProviderConfigMutationResponse returns data for successful responses and attaches providerConfig on failure', () => {
  const providerConfig = {
    provider: { id: 'provider-1', code: 'ark', name: 'Ark', providerType: 'openai_compatible', baseUrl: null, enabled: true },
    endpoints: [],
    userConfig: {
      id: 'config-1',
      configured: true,
      hasApiKey: true,
      maskedApiKey: 'abcd••••wxyz',
      enabled: true,
      baseUrlOverride: null,
      defaults: { textEndpointSlug: null, imageEndpointSlug: null, videoEndpointSlug: null, audioEndpointSlug: null },
      enabledModels: { textEndpointSlugs: [], imageEndpointSlugs: [], videoEndpointSlugs: [], audioEndpointSlugs: [] },
      catalogSync: { status: null, message: null, syncedAt: null, modelCount: null },
      lastTest: { status: null, message: null, endpointSlug: null, testedAt: null },
      updatedAt: null,
    },
  };

  assert.equal(
    parseProviderConfigMutationResponse(true, { ok: true, data: providerConfig }, 'fallback'),
    providerConfig,
  );

  assert.throws(
    () => parseProviderConfigMutationResponse(false, { ok: false, data: providerConfig, error: { message: 'failed' } }, 'fallback'),
    (error: unknown) => {
      assert.equal(error instanceof Error, true);
      assert.equal((error as Error).message, 'failed');
      assert.equal((error as Error & { providerConfig?: unknown }).providerConfig, providerConfig);
      return true;
    },
  );

  assert.throws(
    () => parseProviderConfigMutationResponse(true, { ok: true }, 'fallback'),
    /返回为空/,
  );
});

test('parseSettingsAuthResponse returns user and preserves server message on failure', () => {
  const user = {
    id: 'user-1',
    email: 'demo@example.com',
    displayName: 'Demo',
  };

  assert.deepEqual(
    parseSettingsAuthResponse(true, { ok: true, data: user }, 'fallback'),
    user,
  );

  assert.throws(
    () => parseSettingsAuthResponse(false, { ok: false, error: { message: 'need login' } }, 'fallback'),
    /need login/,
  );
});
