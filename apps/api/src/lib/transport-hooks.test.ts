import assert from 'node:assert/strict';
import test from 'node:test';

import { emitTransportHook, setTransportHook } from './transport-hooks.js';

test('emitTransportHook is a safe no-op without an active hook', async () => {
  setTransportHook(null);

  await assert.doesNotReject(async () => {
    await emitTransportHook({
      providerCode: 'ark',
      capability: 'text',
      operation: 'chat.completions',
      request: {
        url: 'https://ark.example.com/chat/completions',
        method: 'POST',
      },
      latencyMs: 12,
    });
  });
});

test('emitTransportHook forwards events to the active hook', async () => {
  let receivedProviderCode: string | null = null;
  setTransportHook(async (event) => {
    receivedProviderCode = event.providerCode;
  });

  await emitTransportHook({
    providerCode: 'platou',
    capability: 'video',
    operation: 'videos.submit',
    request: {
      url: 'https://platou.example.com/videos',
      method: 'POST',
    },
    latencyMs: 24,
  });

  assert.equal(receivedProviderCode, 'platou');
  setTransportHook(null);
});
