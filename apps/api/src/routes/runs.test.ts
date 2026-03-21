import assert from 'node:assert/strict';
import test from 'node:test';

import { AppError } from '../lib/app-error.js';
import { __testables } from './runs.js';

test('assertRunIsCancelable rejects terminal run statuses', () => {
  assert.throws(
    () => __testables.assertRunIsCancelable({ status: 'COMPLETED' }),
    (error) => error instanceof AppError && error.code === 'RUN_NOT_CANCELABLE' && error.statusCode === 409,
  );
});
