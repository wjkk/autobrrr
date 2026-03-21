import assert from 'node:assert/strict';
import test from 'node:test';

import { AppError } from '../lib/app-error.js';
import { __testables } from './publish-commands.js';

test('assertPublishableShots rejects missing active versions', () => {
  assert.throws(
    () => __testables.assertPublishableShots([
      { activeVersion: { status: 'ACTIVE' } },
      { activeVersion: null },
    ]),
    (error) => error instanceof AppError && error.code === 'PUBLISH_NOT_READY' && error.statusCode === 409,
  );
});
