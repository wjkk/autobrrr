import test from 'node:test';
import assert from 'node:assert/strict';

import { __testables } from './external-api-call-logs.js';

test('external api call log helpers truncate strings and normalize nested json values', () => {
  assert.equal(__testables.truncateString('abcdef', 4), 'abcd…');

  const normalized = __testables.normalizeJsonValue({
    prompt: 'x'.repeat(9000),
    nested: {
      list: [1, true, null, new Date('2026-03-17T00:00:00.000Z')],
    },
  }) as Record<string, unknown>;

  assert.equal(typeof normalized.prompt, 'string');
  assert.equal((normalized.prompt as string).endsWith('…'), true);
  assert.deepEqual((normalized.nested as Record<string, unknown>).list, [1, true, null, '2026-03-17T00:00:00.000Z']);
});

test('external api call log helpers cap depth and detect provider request ids from metadata or payload', () => {
  const deep = { a: { b: { c: { d: { e: { f: { g: 'too-deep' } } } } } } };
  const normalized = __testables.normalizeJsonValue(deep) as Record<string, unknown>;
  const nested = (((((normalized.a as Record<string, unknown>).b as Record<string, unknown>).c as Record<string, unknown>).d as Record<string, unknown>).e as Record<string, unknown>).f as Record<string, unknown>;
  assert.deepEqual(nested, { g: '[truncated-depth]' });

  assert.equal(
    __testables.readProviderRequestId({ request_id: 'req-1' }, { providerRequestId: 'req-explicit' }),
    'req-explicit',
  );
  assert.equal(__testables.readProviderRequestId({ traceId: 'trace-1' }), 'trace-1');
  assert.equal(__testables.readProviderRequestId(null), null);
});
