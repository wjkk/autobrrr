import assert from 'node:assert/strict';
import test from 'node:test';

import { __testables } from './studio-projects.js';

test('toCreateStudioProjectAppError maps invalid image model to stable app error', () => {
  const error = __testables.toCreateStudioProjectAppError('INVALID_IMAGE_MODEL');
  assert.equal(error.code, 'INVALID_IMAGE_MODEL');
  assert.equal(error.statusCode, 400);
});
