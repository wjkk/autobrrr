import assert from 'node:assert/strict';
import test from 'node:test';

import { PlatouApiError, queryPlatouVideoGeneration, submitPlatouChatCompletion } from './platou-client.js';

function createJsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json',
    },
  });
}

test('submitPlatouChatCompletion surfaces nested provider errors with status and payload', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    createJsonResponse(
      {
        error: {
          message: 'Rate limit',
        },
      },
      429,
    )) as typeof fetch;

  try {
    await assert.rejects(
      () =>
        submitPlatouChatCompletion({
          baseUrl: 'https://platou.example.com',
          apiKey: 'key',
          model: 'platou-model',
          prompt: 'hello',
        }),
      (error: unknown) => {
        assert.ok(error instanceof PlatouApiError);
        assert.equal(error.status, 429);
        assert.equal(error.message, 'Rate limit');
        assert.deepEqual(error.payload, {
          error: {
            message: 'Rate limit',
          },
        });
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('queryPlatouVideoGeneration surfaces top-level message errors', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    createJsonResponse(
      {
        message: 'Task missing',
      },
      404,
    )) as typeof fetch;

  try {
    await assert.rejects(
      () =>
        queryPlatouVideoGeneration({
          baseUrl: 'https://platou.example.com',
          apiKey: 'key',
          taskId: 'task-1',
        }),
      (error: unknown) => {
        assert.ok(error instanceof PlatouApiError);
        assert.equal(error.status, 404);
        assert.equal(error.message, 'Task missing');
        assert.deepEqual(error.payload, {
          message: 'Task missing',
        });
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
