import assert from 'node:assert/strict';
import test from 'node:test';

import { __testables } from './provider-config-catalog-service.js';

test('validateProviderCatalogSyncRequest enforces sync support, user config and base url prerequisites', () => {
  assert.deepEqual(__testables.validateProviderCatalogSyncRequest(null), {
    ok: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Provider not found.',
    },
  });

  assert.deepEqual(
    __testables.validateProviderCatalogSyncRequest({
      code: 'mock',
      baseUrl: 'https://example.com',
      userConfigs: [],
    }),
    {
      ok: false,
      error: {
        code: 'SYNC_NOT_SUPPORTED',
        message: 'This provider does not support model catalog sync yet.',
      },
    },
  );

  assert.deepEqual(
    __testables.validateProviderCatalogSyncRequest({
      code: 'ark',
      baseUrl: 'https://ark.example.com',
      userConfigs: [{ enabled: false, apiKey: 'secret', baseUrlOverride: null, optionsJson: null }],
    }),
    {
      ok: false,
      error: {
        code: 'PROVIDER_NOT_CONFIGURED',
        message: 'This provider is not configured for the current user.',
      },
    },
  );

  assert.deepEqual(
    __testables.validateProviderCatalogSyncRequest({
      code: 'platou',
      baseUrl: null,
      userConfigs: [{ enabled: true, apiKey: 'secret', baseUrlOverride: null, optionsJson: null }],
    }),
    {
      ok: false,
      error: {
        code: 'BASE_URL_REQUIRED',
        message: 'This provider requires a base URL to be configured.',
      },
    },
  );
});

test('validateProviderCatalogSyncRequest returns config and override base url when request is valid', () => {
  const config = { enabled: true, apiKey: 'secret', baseUrlOverride: 'https://override.example.com', optionsJson: { synced: true } };
  const result = __testables.validateProviderCatalogSyncRequest({
    code: 'ark',
    baseUrl: 'https://ark.example.com',
    userConfigs: [config],
  });

  assert.deepEqual(result, {
    ok: true,
    data: {
      config,
      baseUrl: 'https://override.example.com',
    },
  });
});

test('buildCatalogSyncMessage formats ark and platou summaries with the expected kinds', () => {
  assert.equal(
    __testables.buildCatalogSyncMessage({
      providerCode: 'ark',
      totalCount: 12,
      byKind: {
        TEXT: 4,
        IMAGE: 3,
        VIDEO: 4,
        AUDIO: 1,
      },
    }),
    '已同步 12 个模型（文本 4 / 图片 3 / 视频 4 / 音频 1）。',
  );

  assert.equal(
    __testables.buildCatalogSyncMessage({
      providerCode: 'platou',
      totalCount: 9,
      byKind: {
        TEXT: 2,
        IMAGE: 3,
        VIDEO: 4,
      },
    }),
    '已同步 9 个模型（文本 2 / 图片 3 / 视频 4）。',
  );
});
