import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  captureBinaryResponse,
  captureJsonResponse,
  tryReplayBinaryResponse,
  tryReplayJsonResponse,
} from './provider-capture-replay.js';

async function withTempDir(fn: (dir: string) => Promise<void>) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aiv-provider-replay-'));
  try {
    await fn(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

test('provider capture/replay preserves json payloads with stable request matching', async () => {
  await withTempDir(async (dir) => {
    const request = {
      providerCode: 'ark',
      capability: 'video' as const,
      operation: '/contents/generations/tasks',
      request: {
        url: 'https://ark.example.com/contents/generations/tasks',
        method: 'POST' as const,
        body: {
          model: 'seedance-2-0',
          prompt: '生成夜雨追逐镜头',
          nested: {
            b: 2,
            a: 1,
          },
        },
      },
    };

    await captureJsonResponse({
      captureDir: dir,
      request,
      ok: true,
      status: 200,
      response: {
        id: 'task-1',
        status: 'queued',
      },
    });

    const replayed = await tryReplayJsonResponse<{ id: string; status: string }>({
      replayDir: dir,
      request: {
        ...request,
        request: {
          ...request.request,
          body: {
            nested: {
              a: 1,
              b: 2,
            },
            prompt: '生成夜雨追逐镜头',
            model: 'seedance-2-0',
          },
        },
      },
    });

    assert.deepEqual(replayed, {
      ok: true,
      status: 200,
      payload: {
        id: 'task-1',
        status: 'queued',
      },
    });
  });
});

test('provider capture/replay preserves binary payloads', async () => {
  await withTempDir(async (dir) => {
    const request = {
      providerCode: 'ark',
      capability: 'audio' as const,
      operation: '/audio/speech',
      request: {
        url: 'https://ark.example.com/audio/speech',
        method: 'POST' as const,
        body: {
          model: 'speech-1',
          input: 'hello',
        },
      },
    };

    await captureBinaryResponse({
      captureDir: dir,
      request,
      ok: true,
      status: 200,
      contentType: 'audio/mpeg',
      buffer: Buffer.from('fake-audio'),
    });

    const replayed = await tryReplayBinaryResponse({
      replayDir: dir,
      request,
    });

    assert.equal(replayed?.ok, true);
    assert.equal(replayed?.status, 200);
    assert.equal(replayed?.contentType, 'audio/mpeg');
    assert.equal(replayed?.buffer.toString(), 'fake-audio');
  });
});

test('provider capture/replay preserves recorded error responses', async () => {
  await withTempDir(async (dir) => {
    const request = {
      providerCode: 'platou',
      capability: 'text' as const,
      operation: '/v1/chat/completions',
      request: {
        url: 'https://platou.example.com/v1/chat/completions',
        method: 'POST' as const,
        body: {
          model: 'platou-model',
          prompt: 'hello',
        },
      },
    };

    await captureJsonResponse({
      captureDir: dir,
      request,
      ok: false,
      status: 429,
      response: {
        error: {
          message: 'Rate limit',
        },
      },
    });

    const replayed = await tryReplayJsonResponse<{ error: { message: string } }>({
      replayDir: dir,
      request: {
        ...request,
        request: {
          ...request.request,
          url: 'http://127.0.0.1:8787/v1/chat/completions',
        },
      },
    });

    assert.deepEqual(replayed, {
      ok: false,
      status: 429,
      payload: {
        error: {
          message: 'Rate limit',
        },
      },
    });
  });
});
