import assert from 'node:assert/strict';
import test from 'node:test';

import {
  fetchServerListOrEmpty,
  fetchServerValueOrFallback,
  fetchServerValueOrHandledError,
  fetchServerValueOrNull,
} from './server-fetch-fallback';

test('fetchServerValueOrFallback returns loaded values and falls back on nullish or thrown results', async () => {
  assert.equal(await fetchServerValueOrFallback(async () => 'value', 'fallback'), 'value');
  assert.equal(await fetchServerValueOrFallback(async () => null, 'fallback'), 'fallback');
  assert.equal(await fetchServerValueOrFallback(async () => undefined, 'fallback'), 'fallback');
  assert.equal(
    await fetchServerValueOrFallback(async () => {
      throw new Error('boom');
    }, 'fallback'),
    'fallback',
  );
});

test('fetchServerValueOrNull and fetchServerListOrEmpty provide standard null and empty-list fallbacks', async () => {
  assert.deepEqual(await fetchServerValueOrNull(async () => ({ id: 'user-1' })), { id: 'user-1' });
  assert.equal(await fetchServerValueOrNull(async () => null), null);
  assert.deepEqual(await fetchServerListOrEmpty(async () => ['a', 'b']), ['a', 'b']);
  assert.deepEqual(await fetchServerListOrEmpty(async () => null), []);
});

test('fetchServerValueOrHandledError delegates success and error shaping to callers', async () => {
  assert.deepEqual(
    await fetchServerValueOrHandledError<string[], { projects: string[]; error: string | null }>(
      async (): Promise<string[] | null> => ['project-1'],
      () => ({ projects: [], error: 'failed' }),
      (value) => ({ projects: value ?? [], error: null }),
    ),
    {
      projects: ['project-1'],
      error: null,
    },
  );

  assert.deepEqual(
    await fetchServerValueOrHandledError<string[], { projects: string[]; error: string | null }>(
      async (): Promise<string[] | null> => {
        throw new Error('加载失败');
      },
      (error) => ({
        projects: [],
        error: error instanceof Error ? error.message : 'failed',
      }),
      (value) => ({ projects: value ?? [], error: null }),
    ),
    {
      projects: [],
      error: '加载失败',
    },
  );
});
