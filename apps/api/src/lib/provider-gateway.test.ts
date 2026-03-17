import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getProviderGatewayCapabilities,
  submitAudioGeneration,
  submitImageGeneration,
  submitTextGeneration,
  submitVideoGeneration,
  supportsProviderGatewayCapability,
} from './provider-gateway.js';

test('provider gateway capabilities expose current supported matrix', () => {
  assert.equal(supportsProviderGatewayCapability('ark', 'audio'), true);
  assert.equal(supportsProviderGatewayCapability('platou', 'audio'), false);
  assert.equal(supportsProviderGatewayCapability('unknown-provider', 'text'), false);

  assert.deepEqual(getProviderGatewayCapabilities('ark'), {
    text: true,
    image: true,
    video: true,
    audio: true,
    lipsync: false,
  });
});

test('provider gateway rejects unsupported text/image/video/audio requests before fetch', async () => {
  await assert.rejects(
    () =>
      submitTextGeneration({
        providerCode: 'unknown-provider',
        baseUrl: 'https://example.com',
        apiKey: 'key',
        model: 'model',
        prompt: 'hello',
      }),
    /does not support text generation/i,
  );

  await assert.rejects(
    () =>
      submitImageGeneration({
        providerCode: 'unknown-provider',
        baseUrl: 'https://example.com',
        apiKey: 'key',
        model: 'model',
        prompt: 'hello',
      }),
    /does not support image generation/i,
  );

  await assert.rejects(
    () =>
      submitVideoGeneration({
        providerCode: 'unknown-provider',
        baseUrl: 'https://example.com',
        apiKey: 'key',
        model: 'model',
        prompt: 'hello',
      }),
    /does not support video generation/i,
  );

  await assert.rejects(
    () =>
      submitAudioGeneration({
        providerCode: 'platou',
        baseUrl: 'https://example.com',
        apiKey: 'key',
        model: 'model',
        prompt: 'hello',
      }),
    /does not support audio generation/i,
  );
});
