import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

import {
  queryArkVideoGeneration,
  submitArkAudioSpeech,
  submitArkTextResponse,
} from '../src/lib/ark-client.js';
import { submitPlatouChatCompletion } from '../src/lib/platou-client.js';

async function withTempDir(fn: (dir: string) => Promise<void>) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aiv-provider-replay-smoke-'));
  try {
    await fn(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

async function withServer(fn: (baseUrl: string) => Promise<void>) {
  const server = http.createServer(async (request, response) => {
    if (request.url === '/responses' && request.method === 'POST') {
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ id: 'resp-1', output_text: 'ok' }));
      return;
    }

    if (request.url === '/contents/generations/tasks/task-1' && request.method === 'GET') {
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ id: 'task-1', status: 'queued' }));
      return;
    }

    if (request.url === '/audio/speech' && request.method === 'POST') {
      response.statusCode = 200;
      response.setHeader('content-type', 'audio/mpeg');
      response.end(Buffer.from('fake-audio'));
      return;
    }

    if (request.url === '/v1/chat/completions' && request.method === 'POST') {
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ id: 'chatcmpl-1', choices: [{ message: { content: 'ok' } }] }));
      return;
    }

    response.statusCode = 404;
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ error: { message: 'Not found' } }));
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to bind smoke provider replay server.');
  }

  try {
    await fn(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

async function main() {
  await withTempDir(async (captureDir) => {
    await withServer(async (baseUrl) => {
      process.env.AIV_PROVIDER_CAPTURE_DIR = captureDir;
      delete process.env.AIV_PROVIDER_REPLAY_DIR;

      const arkText = await submitArkTextResponse({
        baseUrl,
        apiKey: 'smoke-key',
        model: 'smoke-model',
        prompt: 'hello',
      });
      assert.equal((arkText as { id?: string }).id, 'resp-1');

      const arkVideoPoll = await queryArkVideoGeneration({
        baseUrl,
        apiKey: 'smoke-key',
        taskId: 'task-1',
      });
      assert.equal((arkVideoPoll as { status?: string }).status, 'queued');

      const arkAudio = await submitArkAudioSpeech({
        baseUrl,
        apiKey: 'smoke-key',
        model: 'speech-1',
        prompt: 'hello world',
      });
      assert.equal(arkAudio.contentType, 'audio/mpeg');
      assert.equal(arkAudio.buffer.toString(), 'fake-audio');

      const platouText = await submitPlatouChatCompletion({
        baseUrl,
        apiKey: 'smoke-key',
        model: 'platou-model',
        prompt: 'hello',
      });
      assert.equal((platouText as { id?: string }).id, 'chatcmpl-1');
    });

    process.env.AIV_PROVIDER_REPLAY_DIR = captureDir;
    delete process.env.AIV_PROVIDER_CAPTURE_DIR;

    const replayBaseUrl = 'http://127.0.0.1:9';

    const replayedArkText = await submitArkTextResponse({
      baseUrl: replayBaseUrl,
      apiKey: 'smoke-key',
      model: 'smoke-model',
      prompt: 'hello',
    });
    assert.equal((replayedArkText as { id?: string }).id, 'resp-1');

    const replayedArkVideoPoll = await queryArkVideoGeneration({
      baseUrl: replayBaseUrl,
      apiKey: 'smoke-key',
      taskId: 'task-1',
    });
    assert.equal((replayedArkVideoPoll as { status?: string }).status, 'queued');

    const replayedArkAudio = await submitArkAudioSpeech({
      baseUrl: replayBaseUrl,
      apiKey: 'smoke-key',
      model: 'speech-1',
      prompt: 'hello world',
    });
    assert.equal(replayedArkAudio.buffer.toString(), 'fake-audio');

    const replayedPlatouText = await submitPlatouChatCompletion({
      baseUrl: replayBaseUrl,
      apiKey: 'smoke-key',
      model: 'platou-model',
      prompt: 'hello',
    });
    assert.equal((replayedPlatouText as { id?: string }).id, 'chatcmpl-1');
  });

  delete process.env.AIV_PROVIDER_CAPTURE_DIR;
  delete process.env.AIV_PROVIDER_REPLAY_DIR;

  console.log('[smoke:provider-replay] ok');
}

main().catch((error) => {
  delete process.env.AIV_PROVIDER_CAPTURE_DIR;
  delete process.env.AIV_PROVIDER_REPLAY_DIR;
  console.error('[smoke:provider-replay] failed');
  console.error(error);
  process.exitCode = 1;
});
