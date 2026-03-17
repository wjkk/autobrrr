import test from 'node:test';
import assert from 'node:assert/strict';

import { buildCatalogSubjectPrompt, __testables } from './catalog-subject-image.js';

test('buildCatalogSubjectPrompt adapts subject type labels and layout constraints', () => {
  const animalPrompt = buildCatalogSubjectPrompt({
    name: '雪球',
    subjectType: 'animal',
    description: '一只白色长毛猫，眼神警觉。',
  });
  const objectPrompt = buildCatalogSubjectPrompt({
    name: '旧相机',
    subjectType: 'object',
    description: '带有拟人情绪的复古相机。',
  });

  assert.match(animalPrompt, /动物角色/);
  assert.match(animalPrompt, /主体名称：雪球/);
  assert.match(animalPrompt, /3:4 竖版封面/);
  assert.match(objectPrompt, /物体拟人角色/);
});

test('generateCatalogSubjectImageForUserWithDeps prefers explicit selection and rejects missing runtime config', async () => {
  await assert.rejects(
    () =>
      __testables.generateCatalogSubjectImageForUserWithDeps({
        userId: 'user-1',
        input: {
          name: '雪球',
          subjectType: 'animal',
          description: '一只白色长毛猫。',
          modelFamily: 'seedream-3.0',
          modelEndpoint: 'ark-image-endpoint',
        },
      }, {
        resolveUserDefaultModelSelection: async () => {
          throw new Error('should not use user default');
        },
        resolveModelSelection: async () => ({
          family: { id: 'family-1', slug: 'seedream-3.0' },
          endpoint: { id: 'endpoint-1', slug: 'ark-image-endpoint', remoteModelKey: 'seedream-3.0' },
          provider: { id: 'provider-1', code: 'ark', baseUrl: 'https://example.com' },
        } as never),
        resolveProviderRuntimeConfigForUser: async () => ({
          providerCode: 'ark',
          baseUrl: null,
          apiKey: null,
          enabled: true,
          ownerUserId: 'user-1',
        }),
        submitImageGeneration: async () => {
          throw new Error('should not submit');
        },
      }),
    /还没有可用的图片模型配置/i,
  );
});

test('generateCatalogSubjectImageForUserWithDeps falls back to user default model and returns parsed url', async () => {
  let submittedPrompt = '';
  const result = await __testables.generateCatalogSubjectImageForUserWithDeps({
    userId: 'user-1',
    input: {
      name: '雪球',
      subjectType: 'animal',
      description: '一只白色长毛猫，眼神警觉。',
    },
  }, {
    resolveUserDefaultModelSelection: async () => ({
      familySlug: 'seedream-3.0',
      endpointSlug: 'ark-image-endpoint',
    }),
    resolveModelSelection: async () => ({
      family: { id: 'family-1', slug: 'seedream-3.0' },
      endpoint: { id: 'endpoint-1', slug: 'ark-image-endpoint', remoteModelKey: 'seedream-v3' },
      provider: { id: 'provider-1', code: 'ark', baseUrl: 'https://ark.example.com' },
    } as never),
    resolveProviderRuntimeConfigForUser: async () => ({
      providerCode: 'ark',
      baseUrl: 'https://ark.example.com',
      apiKey: 'secret',
      enabled: true,
      ownerUserId: 'user-1',
    }),
    submitImageGeneration: async ({ prompt }: { prompt: string }) => {
      submittedPrompt = prompt;
      return {
        data: {
          first: {
            imageUrl: 'https://cdn.example.com/generated/cat.png',
          },
        },
      };
    },
  });

  assert.match(submittedPrompt, /动物角色/);
  assert.equal(result.imageUrl, 'https://cdn.example.com/generated/cat.png');
  assert.deepEqual(result.model, {
    family: 'seedream-3.0',
    endpoint: 'ark-image-endpoint',
    provider: 'ark',
  });
});

test('generateCatalogSubjectImageForUserWithDeps fails when provider output has no usable url', async () => {
  await assert.rejects(
    () =>
      __testables.generateCatalogSubjectImageForUserWithDeps({
        userId: 'user-1',
        input: {
          name: '雪球',
          subjectType: 'animal',
          description: '一只白色长毛猫。',
        },
      }, {
        resolveUserDefaultModelSelection: async () => ({
          familySlug: 'seedream-3.0',
          endpointSlug: 'ark-image-endpoint',
        }),
        resolveModelSelection: async () => ({
          family: { id: 'family-1', slug: 'seedream-3.0' },
          endpoint: { id: 'endpoint-1', slug: 'ark-image-endpoint', remoteModelKey: 'seedream-v3' },
          provider: { id: 'provider-1', code: 'ark', baseUrl: 'https://ark.example.com' },
        } as never),
        resolveProviderRuntimeConfigForUser: async () => ({
          providerCode: 'ark',
          baseUrl: 'https://ark.example.com',
          apiKey: 'secret',
          enabled: true,
          ownerUserId: 'user-1',
        }),
        submitImageGeneration: async () => ({ data: { first: { id: 'missing-url' } } }),
      }),
    /未解析到可用图片地址/i,
  );
});
