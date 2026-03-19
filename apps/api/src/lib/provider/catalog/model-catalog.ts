import { extractArkCatalogModels, listArkModels, syncArkModelCatalog } from '../../ark-model-catalog.js';
import { extractPlatouCatalogModels, syncPlatouModelCatalog } from '../../platou-model-catalog.js';
import { listPlatouModels } from '../../platou-client.js';

export type ProviderCatalogCode = 'ark' | 'platou';

export async function listProviderCatalogModels(args: {
  providerCode: ProviderCatalogCode;
  baseUrl: string;
  apiKey: string;
}) {
  if (args.providerCode === 'ark') {
    return listArkModels({
      baseUrl: args.baseUrl,
      apiKey: args.apiKey,
    });
  }

  return listPlatouModels({
    baseUrl: args.baseUrl,
    apiKey: args.apiKey,
  });
}

export function extractProviderCatalogModels(providerCode: ProviderCatalogCode, payload: unknown) {
  return providerCode === 'ark'
    ? extractArkCatalogModels(payload)
    : extractPlatouCatalogModels(payload);
}

export async function syncProviderModelCatalog(args: {
  providerCode: ProviderCatalogCode;
  providerId: string;
  discoveredModels: ReturnType<typeof extractArkCatalogModels> | ReturnType<typeof extractPlatouCatalogModels>;
}) {
  if (args.providerCode === 'ark') {
    return syncArkModelCatalog({
      providerId: args.providerId,
      discoveredModels: args.discoveredModels as ReturnType<typeof extractArkCatalogModels>,
    });
  }

  return syncPlatouModelCatalog({
    providerId: args.providerId,
    discoveredModels: args.discoveredModels as ReturnType<typeof extractPlatouCatalogModels>,
  });
}
