import assert from 'node:assert/strict';
import test from 'node:test';

import { hashPassword, verifyPassword } from './password.js';

test('hashPassword produces scrypt hashes and verifyPassword accepts the original password', () => {
  const hash = hashPassword('secret-123');

  assert.match(hash, /^scrypt\$/);
  assert.equal(verifyPassword('secret-123', hash), true);
  assert.equal(verifyPassword('wrong-password', hash), false);
});

test('verifyPassword rejects malformed hashes without throwing', () => {
  assert.equal(verifyPassword('secret-123', 'plain-text'), false);
  assert.equal(verifyPassword('secret-123', 'scrypt$missing-derived'), false);
});
