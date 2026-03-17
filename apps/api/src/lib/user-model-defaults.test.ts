import assert from 'node:assert/strict';
import test from 'node:test';

import { filterUserEnabledEndpoints, resolveDefaultEndpointSlugFromSelections } from './user-model-defaults.js';

test('resolveDefaultEndpointSlugFromSelections ignores disabled defaults and respects provider ownership', () => {
  const result = resolveDefaultEndpointSlugFromSelections(
    [
      {
        providerId: 'provider-a',
        defaultEndpointSlug: 'text-a',
        enabledSlugs: ['text-b'],
      },
      {
        providerId: 'provider-b',
        defaultEndpointSlug: 'text-b',
        enabledSlugs: ['text-b'],
      },
    ],
    [
      {
        slug: 'text-a',
        providerId: 'provider-a',
      },
      {
        slug: 'text-b',
        providerId: 'provider-b',
      },
    ],
  );

  assert.equal(result, 'text-b');
});

test('filterUserEnabledEndpoints keeps all endpoints when enabled list is empty and filters by provider selection otherwise', () => {
  const result = filterUserEnabledEndpoints(
    [
      { slug: 'image-a', providerId: 'provider-a', extra: 'A' },
      { slug: 'image-b', providerId: 'provider-a', extra: 'B' },
      { slug: 'image-c', providerId: 'provider-b', extra: 'C' },
      { slug: 'image-d', providerId: 'provider-c', extra: 'D' },
    ],
    [
      {
        providerId: 'provider-a',
        defaultEndpointSlug: 'image-b',
        enabledSlugs: ['image-b'],
      },
      {
        providerId: 'provider-b',
        defaultEndpointSlug: null,
        enabledSlugs: [],
      },
    ],
  );

  assert.deepEqual(result, [
    { slug: 'image-b', providerId: 'provider-a', extra: 'B' },
    { slug: 'image-c', providerId: 'provider-b', extra: 'C' },
  ]);
});
