import type { Run } from '@prisma/client';

import { prisma } from './prisma.js';

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export interface ProviderRuntimeConfig {
  providerCode: string | null;
  baseUrl: string | null;
  apiKey: string | null;
  enabled: boolean;
}

export async function resolveRunProviderRuntimeConfig(run: Run): Promise<ProviderRuntimeConfig> {
  const input = readObject(run.inputJson);
  const modelProvider = readObject(input.modelProvider);
  const inputProviderCode = readString(modelProvider.code);
  const inputBaseUrl = readString(modelProvider.baseUrl);

  if (!run.projectId || !run.modelProviderId) {
    return {
      providerCode: inputProviderCode,
      baseUrl: inputBaseUrl,
      apiKey: null,
      enabled: true,
    };
  }

  const [project, provider] = await Promise.all([
    prisma.project.findUnique({
      where: { id: run.projectId },
      select: { createdById: true },
    }),
    prisma.modelProvider.findUnique({
      where: { id: run.modelProviderId },
      select: {
        id: true,
        code: true,
        baseUrl: true,
        enabled: true,
      },
    }),
  ]);

  if (!project || !provider) {
    return {
      providerCode: inputProviderCode,
      baseUrl: inputBaseUrl,
      apiKey: null,
      enabled: true,
    };
  }

  const userConfig = await prisma.userProviderConfig.findUnique({
    where: {
      userId_providerId: {
        userId: project.createdById,
        providerId: provider.id,
      },
    },
    select: {
      apiKey: true,
      baseUrlOverride: true,
      enabled: true,
    },
  });

  return {
    providerCode: provider.code,
    baseUrl: userConfig?.baseUrlOverride ?? provider.baseUrl,
    apiKey: userConfig?.apiKey ?? null,
    enabled: userConfig?.enabled ?? provider.enabled,
  };
}
