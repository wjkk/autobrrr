import { z } from 'zod';

import { resolveModelSelection } from './model-registry.js';
import { submitPlatouImageGeneration } from './platou-client.js';
import { findStringDeep } from './planner-text-extraction.js';
import { resolveProviderRuntimeConfigForUser } from './provider-runtime-config.js';
import { resolveUserDefaultModelSelection } from './user-model-defaults.js';

export const catalogSubjectImageGenerationSchema = z.object({
  name: z.string().trim().min(1).max(120),
  subjectType: z.enum(['human', 'animal', 'creature', 'object']).default('human'),
  description: z.string().trim().min(1).max(4000),
  modelFamily: z.string().trim().max(120).optional(),
  modelEndpoint: z.string().trim().max(120).optional(),
});

export type CatalogSubjectImageGenerationInput = z.infer<typeof catalogSubjectImageGenerationSchema>;

export function buildCatalogSubjectPrompt(input: CatalogSubjectImageGenerationInput) {
  const subjectTypeLabel =
    input.subjectType === 'animal'
      ? '动物角色'
      : input.subjectType === 'creature'
        ? '幻想生物角色'
        : input.subjectType === 'object'
          ? '物体拟人角色'
          : '人物角色';

  return [
    `请生成一个适合作为主体库封面的 ${subjectTypeLabel} 形象图。`,
    `主体名称：${input.name}`,
    `主体描述：${input.description}`,
    '画面要求：单主体、干净背景、完整人物或主体清晰、适合 3:4 竖版封面。',
    '避免多主体、复杂背景、裁切头部、过度拥挤。',
  ].join('\n');
}

export async function generateCatalogSubjectImageForUser(args: {
  userId: string;
  input: CatalogSubjectImageGenerationInput;
}) {
  const userDefaultModel = !args.input.modelFamily && !args.input.modelEndpoint
    ? await resolveUserDefaultModelSelection(args.userId, 'IMAGE')
    : null;

  const resolvedModel = await resolveModelSelection({
    modelKind: 'IMAGE',
    familySlug: args.input.modelFamily ?? userDefaultModel?.familySlug,
    endpointSlug: args.input.modelEndpoint ?? userDefaultModel?.endpointSlug,
    strategy: 'default',
  });
  if (!resolvedModel) {
    throw new Error('No active image model endpoint matched the selection.');
  }

  const runtimeConfig = await resolveProviderRuntimeConfigForUser({
    userId: args.userId,
    providerId: resolvedModel.provider.id,
    fallbackCode: resolvedModel.provider.code,
    fallbackBaseUrl: resolvedModel.provider.baseUrl,
  });
  if (!runtimeConfig.enabled || !runtimeConfig.apiKey || !runtimeConfig.baseUrl) {
    throw new Error('当前用户还没有可用的图片模型配置，请先在接口配置中完成图片模型设置。');
  }

  const prompt = buildCatalogSubjectPrompt(args.input);
  let providerOutput: Record<string, unknown>;

  if (runtimeConfig.providerCode === 'platou') {
    providerOutput = await submitPlatouImageGeneration({
      model: resolvedModel.endpoint.remoteModelKey,
      prompt,
      baseUrl: runtimeConfig.baseUrl,
      apiKey: runtimeConfig.apiKey,
    });
  } else {
    throw new Error('当前 provider 暂不支持目录主体图直出，请切换到支持图片生成的 provider。');
  }

  const sourceUrl = findStringDeep(providerOutput, ['url', 'uri', 'downloadUrl', 'imageUrl']);
  if (!sourceUrl) {
    throw new Error('图片生成成功，但未解析到可用图片地址。');
  }

  return {
    imageUrl: sourceUrl,
    providerOutput,
    prompt,
    model: {
      family: resolvedModel.family.slug,
      endpoint: resolvedModel.endpoint.slug,
      provider: resolvedModel.provider.code,
    },
  };
}
