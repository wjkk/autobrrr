import assert from 'node:assert/strict';
import test from 'node:test';

import {
  readNullableString,
  readNumber,
  readObject,
  readObjectArray,
  readString,
  readStringArray,
  readStringCoerce,
  toInputJsonObject,
} from './json-helpers.js';

test('readObject returns plain objects and falls back to empty object', () => {
  assert.deepEqual(readObject({ ok: true }), { ok: true });
  assert.deepEqual(readObject(null), {});
  assert.deepEqual(readObject(['x']), {});
});

test('readString trims non-empty strings and rejects blanks', () => {
  assert.equal(readString('  hello  '), 'hello');
  assert.equal(readString('   '), null);
  assert.equal(readString(1), null);
});

test('readNullableString preserves raw string values without trimming', () => {
  assert.equal(readNullableString('  hello  '), '  hello  ');
  assert.equal(readNullableString(''), '');
  assert.equal(readNullableString(1), null);
});

test('readStringCoerce trims strings and coerces finite numbers', () => {
  assert.equal(readStringCoerce('  hello  '), 'hello');
  assert.equal(readStringCoerce(42), '42');
  assert.equal(readStringCoerce(Number.NaN), null);
});

test('readNumber only accepts finite numbers', () => {
  assert.equal(readNumber(12.5), 12.5);
  assert.equal(readNumber(Number.POSITIVE_INFINITY), null);
  assert.equal(readNumber('12.5'), null);
});

test('readObjectArray keeps only plain objects', () => {
  assert.deepEqual(readObjectArray([{ id: 1 }, null, ['x'], { id: 2 }]), [{ id: 1 }, { id: 2 }]);
  assert.deepEqual(readObjectArray('x'), []);
});

test('readStringArray keeps only non-empty string items', () => {
  assert.deepEqual(readStringArray(['a', '  ', 1, 'b']), ['a', 'b']);
  assert.deepEqual(readStringArray({ items: ['a'] }), []);
});

test('toInputJsonObject returns the same record for Prisma input usage', () => {
  const value = { title: '项目', count: 1 };

  assert.deepEqual(toInputJsonObject(value), value);
});
