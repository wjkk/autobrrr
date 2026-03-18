import assert from 'node:assert/strict';
import test from 'node:test';

import { __testables } from './worker.js';

test('readWorkerRuntimeConfig enables once mode from cli flag and reads positive intervals', () => {
  const config = __testables.readWorkerRuntimeConfig(
    ['--once'],
    {
      AIV_WORKER_IDLE_INTERVAL_MS: '2500',
      AIV_WORKER_ERROR_RETRY_MS: '4500',
    } as NodeJS.ProcessEnv,
  );

  assert.deepEqual(config, {
    once: true,
    idleIntervalMs: 2500,
    errorRetryMs: 4500,
  });
});

test('readWorkerRuntimeConfig falls back to defaults for invalid env values', () => {
  const config = __testables.readWorkerRuntimeConfig(
    [],
    {
      AIV_WORKER_ONCE: '0',
      AIV_WORKER_IDLE_INTERVAL_MS: '-1',
      AIV_WORKER_ERROR_RETRY_MS: 'oops',
    } as NodeJS.ProcessEnv,
  );

  assert.equal(config.once, false);
  assert.equal(config.idleIntervalMs, 1500);
  assert.equal(config.errorRetryMs, 3000);
});
