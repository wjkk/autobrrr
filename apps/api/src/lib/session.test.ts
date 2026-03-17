import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import { createSessionToken, hashSessionToken } from './session.js';

test('createSessionToken returns a 64-byte hex token', () => {
  const token = createSessionToken();

  assert.match(token, /^[0-9a-f]{64}$/);
});

test('hashSessionToken returns stable sha256 hex digests', () => {
  const token = 'session-token';

  assert.equal(
    hashSessionToken(token),
    createHash('sha256').update(token).digest('hex'),
  );
});
