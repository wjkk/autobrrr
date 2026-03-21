import assert from 'node:assert/strict';
import test from 'node:test';

import { AppError } from '../lib/app-error.js';
import { __testables } from './auth.js';

test('assertLoginUserOrThrow rejects missing or inactive users with INVALID_CREDENTIALS', () => {
  assert.throws(
    () => __testables.assertLoginUserOrThrow(null, 'password123'),
    (error) => error instanceof AppError && error.code === 'INVALID_CREDENTIALS' && error.statusCode === 401,
  );
});
