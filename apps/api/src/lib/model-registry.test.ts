import assert from 'node:assert/strict';
import test from 'node:test';

import { __testables } from './model-registry.js';

test('rankEndpoint prefers official providers only when strategy asks for it', () => {
  const official = {
    provider: { providerType: 'OFFICIAL' },
  };
  const proxy = {
    provider: { providerType: 'PROXY' },
  };
  const custom = {
    provider: { providerType: 'CUSTOM' },
  };

  assert.equal(__testables.rankEndpoint(official as never, 'preferOfficial'), 0);
  assert.equal(__testables.rankEndpoint(proxy as never, 'preferOfficial'), 1);
  assert.equal(__testables.rankEndpoint(custom as never, 'preferOfficial'), 2);
  assert.equal(__testables.rankEndpoint(proxy as never, 'default'), 0);
});

test('resolveModelSelectionWithDeps returns requested endpoint when endpointSlug matches', async () => {
  const result = await __testables.resolveModelSelectionWithDeps(
    {
      modelKind: 'VIDEO',
      endpointSlug: 'seedance-pro',
    },
    {
      prisma: {
        modelEndpoint: {
          findFirst: async () => ({
            id: 'endpoint-1',
            slug: 'seedance-pro',
            family: { id: 'family-1', slug: 'seedance-2-0' },
            provider: { id: 'provider-1', code: 'ark' },
          }),
        },
      } as never,
    },
  );

  assert.equal(result?.endpoint.slug, 'seedance-pro');
  assert.equal(result?.family.slug, 'seedance-2-0');
  assert.equal(result?.provider.code, 'ark');
});

test('resolveModelSelectionWithDeps prefers official default endpoints when sorting candidates', async () => {
  const result = await __testables.resolveModelSelectionWithDeps(
    {
      modelKind: 'IMAGE',
      strategy: 'preferOfficial',
    },
    {
      prisma: {
        modelEndpoint: {
          findMany: async () => [
            {
              id: 'endpoint-1',
              slug: 'custom-image',
              isDefault: true,
              priority: 0,
              createdAt: new Date('2026-03-17T00:00:00.000Z'),
              family: { id: 'family-1', slug: 'seedream-3' },
              provider: { id: 'provider-1', code: 'custom', providerType: 'CUSTOM' },
            },
            {
              id: 'endpoint-2',
              slug: 'ark-image',
              isDefault: false,
              priority: 5,
              createdAt: new Date('2026-03-18T00:00:00.000Z'),
              family: { id: 'family-2', slug: 'seedream-2' },
              provider: { id: 'provider-2', code: 'ark', providerType: 'OFFICIAL' },
            },
          ],
        },
      } as never,
    },
  );

  assert.equal(result?.endpoint.slug, 'ark-image');
  assert.equal(result?.provider.code, 'ark');
});

test('resolveModelSelectionWithDeps returns null when no active endpoints are available', async () => {
  const result = await __testables.resolveModelSelectionWithDeps(
    {
      modelKind: 'TEXT',
    },
    {
      prisma: {
        modelEndpoint: {
          findMany: async () => [],
        },
      } as never,
    },
  );

  assert.equal(result, null);
});
