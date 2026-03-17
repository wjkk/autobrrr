import assert from 'node:assert/strict';
import test from 'node:test';

import { ArkApiError, queryArkVideoGeneration, submitArkAudioSpeech, submitArkTextResponse } from './ark-client.js';

function createJsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json',
    },
  });
}

test('submitArkTextResponse surfaces structured api errors with status and code', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    createJsonResponse(
      {
        error: {
          message: 'Bad model',
          code: 'invalid_model',
        },
      },
      400,
    )) as typeof fetch;

  try {
    await assert.rejects(
      () =>
        submitArkTextResponse({
          baseUrl: 'https://ark.example.com',
          apiKey: 'key',
          model: 'bad-model',
          prompt: 'hello',
        }),
      (error: unknown) => {
        assert.ok(error instanceof ArkApiError);
        assert.equal(error.status, 400);
        assert.equal(error.code, 'invalid_model');
        assert.deepEqual(error.payload, {
          error: {
            message: 'Bad model',
            code: 'invalid_model',
          },
        });
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('queryArkVideoGeneration falls back to list endpoint after task lookup 404', async () => {
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    calls.push(url);

    if (calls.length === 1) {
      return createJsonResponse(
        {
          error: {
            message: 'Task not found',
          },
        },
        404,
      );
    }

    return createJsonResponse({
      items: [
        {
          id: 'task-1',
          status: 'queued',
        },
      ],
    });
  }) as typeof fetch;

  try {
    const payload = await queryArkVideoGeneration({
      baseUrl: 'https://ark.example.com',
      apiKey: 'key',
      taskId: 'task-1',
    });

    assert.deepEqual(payload, {
      id: 'task-1',
      status: 'queued',
    });
    assert.match(calls[0] ?? '', /\/contents\/generations\/tasks\/task-1$/);
    assert.match(calls[1] ?? '', /filter\.task_ids=task-1/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('submitArkAudioSpeech surfaces plain-text binary endpoint errors', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response('rate limited', {
      status: 429,
      headers: {
        'content-type': 'text/plain',
      },
    })) as typeof fetch;

  try {
    await assert.rejects(
      () =>
        submitArkAudioSpeech({
          baseUrl: 'https://ark.example.com',
          apiKey: 'key',
          model: 'speech-model',
          prompt: 'hello',
        }),
      (error: unknown) => {
        assert.ok(error instanceof ArkApiError);
        assert.equal(error.status, 429);
        assert.equal(error.message, 'rate limited');
        assert.equal(error.payload, 'rate limited');
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
