import assert from 'node:assert/strict';
import test from 'node:test';
import { z } from 'zod';

import { AppError, invalidArgument, parseOrThrow, toAppError } from './app-error.js';

test('parseOrThrow returns parsed data for valid payloads', () => {
  const result = parseOrThrow(z.object({ projectId: z.string().min(1) }), { projectId: 'project-1' }, 'Invalid payload.');
  assert.deepEqual(result, { projectId: 'project-1' });
});

test('parseOrThrow throws AppError with validation details for invalid payloads', () => {
  assert.throws(
    () => parseOrThrow(z.object({ projectId: z.string().min(1) }), { projectId: '' }, 'Invalid payload.'),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, 'INVALID_ARGUMENT');
      assert.equal(error.statusCode, 400);
      assert.equal(error.message, 'Invalid payload.');
      assert.ok(error.details);
      return true;
    },
  );
});

test('toAppError preserves AppError instances and wraps unknown errors', () => {
  const known = invalidArgument('Bad request.');
  assert.equal(toAppError(known), known);

  const unknown = toAppError(new Error('boom'));
  assert.ok(unknown instanceof AppError);
  assert.equal(unknown.code, 'INTERNAL_ERROR');
  assert.equal(unknown.statusCode, 500);
});
