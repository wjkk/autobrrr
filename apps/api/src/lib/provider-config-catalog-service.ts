import { extractArkCatalogModels, listArkModels, syncArkModelCatalog } from './ark-model-catalog.js';
import { fetchProviderConfigItem } from './provider-config-query-service.js';
import { mergeProviderConfigOptions } from './provider-config-options.js';
import { extractPlatouCatalogModels, syncPlatouModelCatalog } from './platou-model-catalog.js';
import { listPlatouModels } from './platou-client.js';
import { prisma } from './prisma.js';
import type { ProviderConfigServiceResult } from './provider-config-service-types.js';

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

  if (!provider) {
    return {
      ok: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Provider not found.',
      },
    };
  }

  if (provider.code !== 'platou' && provider.code !== 'ark') {
    return {
      ok: false,
      error: {
        code: 'SYNC_NOT_SUPPORTED',
        message: 'This provider does not support model catalog sync yet.',
      },
    };
  }

  const config = provider.userConfigs[0] ?? null;
  if (!config?.enabled || !config.apiKey) {
    return {
      ok: false,
      error: {
        code: 'PROVIDER_NOT_CONFIGURED',
        message: 'This provider is not configured for the current user.',
      },
    };
  }

  const baseUrl = config.baseUrlOverride ?? provider.baseUrl;
  if (!baseUrl) {
    return {
      ok: false,
      error: {
        code: 'BASE_URL_REQUIRED',
        message: 'This provider requires a base URL to be configured.',
      },
    };
  }

  try {
    const payload = provider.code === 'ark'
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

    if (provider.code === 'ark') {
      const discoveredModels = extractArkCatalogModels(payload);
      if (discoveredModels.length === 0) {
        throw new Error('Volcengine Ark model catalog returned no supported text/image/video/audio models.');
      }
      const syncResult = await syncArkModelCatalog({
        providerId: provider.id,
        discoveredModels,
      });
      totalCount = syncResult.totalCount;
      syncMessage = `已同步 ${syncResult.totalCount} 个模型（文本 ${syncResult.byKind.TEXT} / 图片 ${syncResult.byKind.IMAGE} / 视频 ${syncResult.byKind.VIDEO} / 音频 ${syncResult.byKind.AUDIO}）。`;
    } else {
      const discoveredModels = extractPlatouCatalogModels(payload);
      if (discoveredModels.length === 0) {
        throw new Error('Platou model catalog returned no supported text/image/video models.');
      }
      const syncResult = await syncPlatouModelCatalog({
        providerId: provider.id,
        discoveredModels,
      });
      totalCount = syncResult.totalCount;
      syncMessage = `已同步 ${syncResult.totalCount} 个模型（文本 ${syncResult.byKind.TEXT} / 图片 ${syncResult.byKind.IMAGE} / 视频 ${syncResult.byKind.VIDEO}）。`;
    }

    await prisma.userProviderConfig.update({
      where: {
        userId_providerId: {
          userId: args.userId,
          providerId: provider.id,
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
      data: await fetchProviderConfigItem(provider.code, args.userId),
    };
  } catch (error) {
    await prisma.userProviderConfig.update({
      where: {
        userId_providerId: {
          userId: args.userId,
          providerId: provider.id,
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
        data: await fetchProviderConfigItem(provider.code, args.userId),
      },
    };
  }
}
