import assert from 'node:assert/strict';
import test from 'node:test';

import { __testables } from './env.js';

test('stripWrappingQuotes removes matching quote wrappers and keeps plain values', () => {
  assert.equal(__testables.stripWrappingQuotes('"value"'), 'value');
  assert.equal(__testables.stripWrappingQuotes("'value'"), 'value');
  assert.equal(__testables.stripWrappingQuotes('value'), 'value');
});

test('applyEnvFileContent skips comments, preserves existing vars and unquotes new values', () => {
  const target: NodeJS.ProcessEnv = {
    EXISTING: 'keep',
  };

  __testables.applyEnvFileContent(
    [
      '# comment',
      'EXISTING=override',
      'API_PORT=3001',
      'SESSION_COOKIE_NAME="custom_cookie"',
      'EMPTY_VALUE=',
      'BROKEN_LINE',
    ].join('\n'),
    target,
  );

  assert.deepEqual(target, {
    EXISTING: 'keep',
    API_PORT: '3001',
    SESSION_COOKIE_NAME: 'custom_cookie',
    EMPTY_VALUE: '',
  });
});

test('parseEnv applies defaults and coerces numeric fields', () => {
  const parsed = __testables.parseEnv({
    DATABASE_URL: 'mysql://root:root@127.0.0.1:3306/aiv',
    API_PORT: '3002',
    SESSION_TTL_DAYS: '7',
  });

  assert.deepEqual(parsed, {
    DATABASE_URL: 'mysql://root:root@127.0.0.1:3306/aiv',
    API_PORT: 3002,
    API_PUBLIC_BASE_URL: undefined,
    SESSION_COOKIE_NAME: 'aiv_session',
    SESSION_TTL_DAYS: 7,
  });
});

test('parseEnv rejects missing database url and invalid public base url', () => {
  assert.throws(
    () => __testables.parseEnv({}),
    /DATABASE_URL/,
  );
  assert.throws(
    () => __testables.parseEnv({
      DATABASE_URL: 'mysql://root:root@127.0.0.1:3306/aiv',
      API_PUBLIC_BASE_URL: 'not-a-url',
    }),
    /API_PUBLIC_BASE_URL/,
  );
});
