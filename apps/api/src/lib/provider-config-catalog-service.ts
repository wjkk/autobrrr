import { extractArkCatalogModels, listArkModels, syncArkModelCatalog } from './ark-model-catalog.js';
import { fetchProviderConfigItem } from './provider-config-query-service.js';
import { mergeProviderConfigOptions } from './provider-config-options.js';
import { extractPlatouCatalogModels, syncPlatouModelCatalog } from './platou-model-catalog.js';
import { listPlatouModels } from './platou-client.js';
import { prisma } from './prisma.js';
import type { ProviderConfigServiceResult } from './provider-config-service-types.js';

type SyncableProviderRecord = {
  code: string;
  baseUrl: string | null;
  userConfigs: Array<{
    enabled: boolean;
    apiKey: string | null;
    baseUrlOverride: string | null;
    optionsJson: unknown;
  }>;
};

type ValidatedCatalogSyncRequest = {
  config: {
    enabled: true;
    apiKey: string;
    baseUrlOverride: string | null;
    optionsJson: unknown;
  };
  baseUrl: string;
};

function validateProviderCatalogSyncRequest(provider: SyncableProviderRecord | null) {
  if (!provider) {
    return {
      ok: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Provider not found.',
      },
    } as const;
  }

  if (provider.code !== 'platou' && provider.code !== 'ark') {
    return {
      ok: false,
      error: {
        code: 'SYNC_NOT_SUPPORTED',
        message: 'This provider does not support model catalog sync yet.',
      },
    } as const;
  }

  const config = provider.userConfigs[0] ?? null;
  if (!config?.enabled || !config.apiKey) {
    return {
      ok: false,
      error: {
        code: 'PROVIDER_NOT_CONFIGURED',
        message: 'This provider is not configured for the current user.',
      },
    } as const;
  }

  const baseUrl = config.baseUrlOverride ?? provider.baseUrl;
  if (!baseUrl) {
    return {
      ok: false,
      error: {
        code: 'BASE_URL_REQUIRED',
        message: 'This provider requires a base URL to be configured.',
      },
    } as const;
  }

  return {
    ok: true,
    data: {
      config: {
        enabled: true,
        apiKey: config.apiKey,
        baseUrlOverride: config.baseUrlOverride,
        optionsJson: config.optionsJson,
      },
      baseUrl,
    } satisfies ValidatedCatalogSyncRequest,
  } as const;
}

function buildCatalogSyncMessage(args: {
  providerCode: 'ark' | 'platou';
  totalCount: number;
  byKind: {
    TEXT: number;
    IMAGE: number;
    VIDEO: number;
    AUDIO?: number;
  };
}) {
  if (args.providerCode === 'ark') {
    return `已同步 ${args.totalCount} 个模型（文本 ${args.byKind.TEXT} / 图片 ${args.byKind.IMAGE} / 视频 ${args.byKind.VIDEO} / 音频 ${args.byKind.AUDIO ?? 0}）。`;
  }

  return `已同步 ${args.totalCount} 个模型（文本 ${args.byKind.TEXT} / 图片 ${args.byKind.IMAGE} / 视频 ${args.byKind.VIDEO}）。`;
}

export async function syncProviderModelsForUser(args: {
  providerCode: string;
  userId: string;
}): Promise<ProviderConfigServiceResult<Awaited<ReturnType<typeof fetchProviderConfigItem>>>> {
  const provider = await prisma.modelProvider.findUnique({
    where: { code: args.providerCode },
    include: {
      userConfigs: {
        where: { userId: args.userId },
        take: 1,
        select: {
          id: true,
          enabled: true,
          apiKey: true,
          baseUrlOverride: true,
          optionsJson: true,
        },
      },
    },
  });

  const precheck = validateProviderCatalogSyncRequest(provider);
  if (!precheck.ok) {
    return precheck;
  }
  const checkedProvider = provider!;
  const { config, baseUrl } = precheck.data;

  try {
    const payload = checkedProvider.code === 'ark'
      ? await listArkModels({
          baseUrl,
          apiKey: config.apiKey,
        })
      : await listPlatouModels({
          baseUrl,
          apiKey: config.apiKey,
        });

    let syncMessage = '';
    let totalCount = 0;

    if (checkedProvider.code === 'ark') {
      const discoveredModels = extractArkCatalogModels(payload);
      if (discoveredModels.length === 0) {
        throw new Error('Volcengine Ark model catalog returned no supported text/image/video/audio models.');
      }
      const syncResult = await syncArkModelCatalog({
        providerId: checkedProvider.id,
        discoveredModels,
      });
      totalCount = syncResult.totalCount;
      syncMessage = buildCatalogSyncMessage({
        providerCode: 'ark',
        totalCount: syncResult.totalCount,
        byKind: syncResult.byKind,
      });
    } else {
      const discoveredModels = extractPlatouCatalogModels(payload);
      if (discoveredModels.length === 0) {
        throw new Error('Platou model catalog returned no supported text/image/video models.');
      }
      const syncResult = await syncPlatouModelCatalog({
        providerId: checkedProvider.id,
        discoveredModels,
      });
      totalCount = syncResult.totalCount;
      syncMessage = buildCatalogSyncMessage({
        providerCode: 'platou',
        totalCount: syncResult.totalCount,
        byKind: syncResult.byKind,
      });
    }

    await prisma.userProviderConfig.update({
      where: {
        userId_providerId: {
          userId: args.userId,
          providerId: checkedProvider.id,
        },
      },
      data: {
        optionsJson: mergeProviderConfigOptions(config.optionsJson, {
          catalogSync: {
            status: 'passed',
            message: syncMessage,
            syncedAt: new Date().toISOString(),
            modelCount: totalCount,
          },
        }),
      },
    });

    return {
      ok: true,
      data: await fetchProviderConfigItem(checkedProvider.code, args.userId),
    };
  } catch (error) {
    await prisma.userProviderConfig.update({
      where: {
        userId_providerId: {
          userId: args.userId,
          providerId: checkedProvider.id,
        },
      },
      data: {
        optionsJson: mergeProviderConfigOptions(config.optionsJson, {
          catalogSync: {
            status: 'failed',
            message: error instanceof Error ? error.message : 'Model catalog sync failed.',
            syncedAt: new Date().toISOString(),
          },
        }),
      },
    });

    return {
      ok: false,
      error: {
        code: 'MODEL_SYNC_FAILED',
        message: error instanceof Error ? error.message : 'Model catalog sync failed.',
        data: await fetchProviderConfigItem(checkedProvider.code, args.userId),
      },
    };
  }
}

export const __testables = {
  validateProviderCatalogSyncRequest,
  buildCatalogSyncMessage,
};
