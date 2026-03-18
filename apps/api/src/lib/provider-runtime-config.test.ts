import assert from 'node:assert/strict';
import test from 'node:test';

import type { Run } from '@prisma/client';

import { __testables } from './provider-runtime-config.js';

test('hasUsableProviderRuntimeConfig requires enabled provider, baseUrl and apiKey', () => {
  assert.equal(__testables.hasUsableProviderRuntimeConfig({
    providerCode: 'ark',
    baseUrl: 'https://ark.example.com',
    apiKey: 'secret',
    enabled: true,
    ownerUserId: 'user-1',
  }), true);

  assert.equal(__testables.hasUsableProviderRuntimeConfig({
    providerCode: 'ark',
    baseUrl: 'https://ark.example.com',
    apiKey: null,
    enabled: true,
    ownerUserId: 'user-1',
  }), false);
});

test('resolveProviderRuntimeConfigForUserWithDeps falls back when provider is missing', async () => {
  const result = await __testables.resolveProviderRuntimeConfigForUserWithDeps(
    {
      userId: 'user-1',
      providerId: 'provider-missing',
      fallbackCode: 'ark',
      fallbackBaseUrl: 'https://ark.example.com',
    },
    {
      findProvider: async () => null,
      findUserProviderConfig: async () => {
        throw new Error('should not query user config without provider');
      },
    },
  );

  assert.deepEqual(result, {
    providerCode: 'ark',
    baseUrl: 'https://ark.example.com',
    apiKey: null,
    enabled: true,
    ownerUserId: 'user-1',
  });
});

test('resolveProviderRuntimeConfigForUserWithDeps applies user override apiKey, baseUrl and enabled flag', async () => {
  const result = await __testables.resolveProviderRuntimeConfigForUserWithDeps(
    {
      userId: 'user-1',
      providerId: 'provider-1',
    },
    {
      findProvider: async () => ({
        id: 'provider-1',
        code: 'platou',
        baseUrl: 'https://platou.default',
        enabled: true,
      }),
      findUserProviderConfig: async () => ({
        apiKey: 'secret',
        baseUrlOverride: 'https://platou.override',
        enabled: false,
      }),
    },
  );

  assert.deepEqual(result, {
    providerCode: 'platou',
    baseUrl: 'https://platou.override',
    apiKey: 'secret',
    enabled: false,
    ownerUserId: 'user-1',
  });
});

test('resolveRunProviderRuntimeConfigWithDeps falls back to run input provider info when project or provider is missing', async () => {
  const run = {
    id: 'run-1',
    projectId: 'project-1',
    modelProviderId: 'provider-1',
    inputJson: {
      modelProvider: {
        code: 'ark',
        baseUrl: 'https://ark.input',
      },
    },
  } as Pick<Run, 'id' | 'projectId' | 'modelProviderId' | 'inputJson'> as Run;

  const missingProviderResult = await __testables.resolveRunProviderRuntimeConfigWithDeps(run, {
    findProject: async () => ({ createdById: 'user-1' }),
    findProvider: async () => null,
    resolveProviderRuntimeConfigForUser: async () => {
      throw new Error('should not resolve user runtime config without provider');
    },
  });

  assert.deepEqual(missingProviderResult, {
    providerCode: 'ark',
    baseUrl: 'https://ark.input',
    apiKey: null,
    enabled: true,
    ownerUserId: 'user-1',
  });
});

test('resolveRunProviderRuntimeConfigWithDeps delegates to owner-scoped provider config resolution', async () => {
  const run = {
    id: 'run-1',
    projectId: 'project-1',
    modelProviderId: 'provider-1',
    inputJson: {
      modelProvider: {
        code: 'ark',
        baseUrl: 'https://ark.input',
      },
    },
  } as Pick<Run, 'id' | 'projectId' | 'modelProviderId' | 'inputJson'> as Run;

  let delegatedArgs: unknown = null;
  const result = await __testables.resolveRunProviderRuntimeConfigWithDeps(run, {
    findProject: async () => ({ createdById: 'owner-1' }),
    findProvider: async () => ({ id: 'provider-1', code: 'ark', baseUrl: 'https://ark.default', enabled: true }),
    resolveProviderRuntimeConfigForUser: async (args) => {
      delegatedArgs = args;
      return {
        providerCode: 'ark',
        baseUrl: 'https://ark.override',
        apiKey: 'secret',
        enabled: true,
        ownerUserId: 'owner-1',
      };
    },
  });

  assert.deepEqual(delegatedArgs, {
    userId: 'owner-1',
    providerId: 'provider-1',
    fallbackCode: 'ark',
    fallbackBaseUrl: 'https://ark.input',
  });
  assert.deepEqual(result, {
    providerCode: 'ark',
    baseUrl: 'https://ark.override',
    apiKey: 'secret',
    enabled: true,
    ownerUserId: 'owner-1',
  });
});
