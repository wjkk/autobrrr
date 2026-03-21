import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildProviderCallbackLogEntry,
  buildRunFailureLogEntry,
  buildWorkerLogEntry,
} from './run-observability.js';

test('buildWorkerLogEntry returns stable structured payloads', () => {
  assert.deepEqual(
    buildWorkerLogEntry('run_processed', {
      runId: 'run-1',
      action: 'processed',
      status: 'completed',
    }),
    {
      scope: 'worker',
      event: 'run_processed',
      runId: 'run-1',
      action: 'processed',
      status: 'completed',
    },
  );
});

test('buildProviderCallbackLogEntry returns stable structured payloads', () => {
  assert.deepEqual(
    buildProviderCallbackLogEntry('completed', {
      callbackToken: 'callback-1',
      runId: 'run-1',
      providerStatus: 'succeeded',
    }),
    {
      scope: 'provider_callback',
      event: 'completed',
      callbackToken: 'callback-1',
      runId: 'run-1',
      providerStatus: 'succeeded',
    },
  );
});

test('buildRunFailureLogEntry returns failure attribution payload', () => {
  assert.deepEqual(buildRunFailureLogEntry({
    runId: 'run-1',
    errorCode: 'PROVIDER_OUTPUT_URL_MISSING',
    errorMessage: 'Provider output did not include a downloadable image URL.',
  }), {
    scope: 'run_lifecycle',
    event: 'run_failed',
    runId: 'run-1',
    errorCode: 'PROVIDER_OUTPUT_URL_MISSING',
    errorMessage: 'Provider output did not include a downloadable image URL.',
  });
});
