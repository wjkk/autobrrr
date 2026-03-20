import {
  extractArkCatalogModels,
  listArkCatalogModels,
  syncArkModelCatalog,
  type ArkCatalogModel,
} from './ark-parser.js';
import {
  extractPlatouCatalogModels,
  listPlatouCatalogModels,
  syncPlatouModelCatalog,
  type PlatouCatalogModel,
} from './platou-parser.js';

export type ProviderCatalogCode = 'ark' | 'platou';
export type ProviderCatalogModel = ArkCatalogModel | PlatouCatalogModel;

function isArkProviderCatalogCode(providerCode: ProviderCatalogCode): providerCode is 'ark' {
  return providerCode === 'ark';
}

export async function listProviderCatalogModels(args: {
  providerCode: ProviderCatalogCode;
  baseUrl: string;
  apiKey: string;
}) {
  return isArkProviderCatalogCode(args.providerCode)
    ? listArkCatalogModels({
        baseUrl: args.baseUrl,
        apiKey: args.apiKey,
      })
    : listPlatouCatalogModels({
        baseUrl: args.baseUrl,
        apiKey: args.apiKey,
      });
}

export function extractProviderCatalogModels(providerCode: ProviderCatalogCode, payload: unknown) {
  return isArkProviderCatalogCode(providerCode)
    ? extractArkCatalogModels(payload)
    : extractPlatouCatalogModels(payload);
}

export async function syncProviderModelCatalog(args: {
  providerCode: ProviderCatalogCode;
  providerId: string;
  discoveredModels: ProviderCatalogModel[];
}) {
  return isArkProviderCatalogCode(args.providerCode)
    ? syncArkModelCatalog({
        providerId: args.providerId,
        discoveredModels: args.discoveredModels as ArkCatalogModel[],
      })
    : syncPlatouModelCatalog({
        providerId: args.providerId,
        discoveredModels: args.discoveredModels as PlatouCatalogModel[],
      });
}
