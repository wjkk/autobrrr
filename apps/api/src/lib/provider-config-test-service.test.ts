import assert from 'node:assert/strict';
import test from 'node:test';

import { ArkApiError } from './ark-client.js';
import { __testables } from './provider-config-test-service.js';

test('needsVideoReferenceImage only enables i2v-like video models', () => {
  assert.equal(__testables.needsVideoReferenceImage('seedance-i2v-v1'), true);
  assert.equal(__testables.needsVideoReferenceImage('seedance_t2v_v1'), false);
  assert.equal(__testables.needsVideoReferenceImage('video-model'), false);
});

test('pickTestEndpoint prefers requested default endpoint and platou video-first fallback', () => {
  const endpoints = [
    {
      id: 'text-1',
      slug: 'platou-text',
      label: 'Platou Text',
      modelKind: 'text',
      familySlug: 'platou-text',
      isDefault: false,
      remoteModelKey: 'platou-text-model',
    },
    {
      id: 'video-1',
      slug: 'platou-video',
      label: 'Platou Video',
      modelKind: 'video',
      familySlug: 'platou-video',
      isDefault: false,
      remoteModelKey: 'platou-video-model',
    },
    {
      id: 'image-1',
      slug: 'platou-image',
      label: 'Platou Image',
      modelKind: 'image',
      familySlug: 'platou-image',
      isDefault: false,
      remoteModelKey: 'platou-image-model',
    },
  ];

  const requested = __testables.pickTestEndpoint({
    providerCode: 'platou',
    requestedKind: 'image',
    endpoints,
    defaults: {
      textEndpointSlug: null,
      imageEndpointSlug: 'platou-image',
      videoEndpointSlug: null,
      audioEndpointSlug: null,
    },
  });
  assert.equal(requested?.slug, 'platou-image');

  const fallback = __testables.pickTestEndpoint({
    providerCode: 'platou',
    endpoints,
    defaults: {
      textEndpointSlug: null,
      imageEndpointSlug: null,
      videoEndpointSlug: null,
      audioEndpointSlug: null,
    },
  });
  assert.equal(fallback?.slug, 'platou-video');
});

test('getProviderTestError preserves ModelNotOpen and normalizes generic failures', () => {
  const modelNotOpen = __testables.getProviderTestError(new ArkApiError('Model not open', 403, undefined, 'ModelNotOpen'));
  assert.deepEqual(modelNotOpen, {
    code: 'PROVIDER_MODEL_NOT_OPEN',
    message: 'Model not open',
  });

  const generic = __testables.getProviderTestError(new Error('network failed'));
  assert.deepEqual(generic, {
    code: 'PROVIDER_TEST_FAILED',
    message: 'network failed',
  });
});
