import assert from 'node:assert/strict';
import test from 'node:test';

import { AppError } from '../lib/app-error.js';
import { __testables } from './provider-callbacks.js';

test('assertProviderJobMatches rejects mismatched callback job ids', () => {
  assert.throws(
    () => __testables.assertProviderJobMatches(
      { providerJobId: 'job-1' },
      { providerJobId: 'job-2' },
    ),
    (error) => error instanceof AppError && error.code === 'PROVIDER_JOB_MISMATCH' && error.statusCode === 409,
  );
});
