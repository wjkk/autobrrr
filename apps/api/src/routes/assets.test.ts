import assert from 'node:assert/strict';
import test from 'node:test';

import { AppError } from '../lib/app-error.js';
import { __testables } from './assets.js';

test('assertOwnedResourceOrThrow maps missing resources to NOT_FOUND', () => {
  assert.throws(
    () => __testables.assertOwnedResourceOrThrow(null, 'Project not found.'),
    (error) => error instanceof AppError && error.code === 'NOT_FOUND' && error.statusCode === 404,
  );
});
