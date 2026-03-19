import { readNumber, readObject, readString, readStringArray } from './json-helpers.js';

export interface ProviderCatalogSyncState {
  status: string | null;
  message: string | null;
  syncedAt: string | null;
  modelCount: number | null;
}

export interface ProviderConfigOptionsState {
  defaults: {
    textEndpointSlug: string | null;
    imageEndpointSlug: string | null;
    videoEndpointSlug: string | null;
    audioEndpointSlug: string | null;
  };
  enabledModels: {
    textEndpointSlugs: string[];
    imageEndpointSlugs: string[];
    videoEndpointSlugs: string[];
    audioEndpointSlugs: string[];
  };
  catalogSync: ProviderCatalogSyncState;
  raw: Record<string, unknown>;
}

export function parseProviderConfigOptions(value: unknown): ProviderConfigOptionsState {
  const raw = readObject(value);

  return {
    defaults: {
      textEndpointSlug: readString(raw.textEndpointSlug),
      imageEndpointSlug: readString(raw.imageEndpointSlug),
      videoEndpointSlug: readString(raw.videoEndpointSlug),
      audioEndpointSlug: readString(raw.audioEndpointSlug),
    },
    enabledModels: {
      textEndpointSlugs: readStringArray(raw.textEndpointSlugs),
      imageEndpointSlugs: readStringArray(raw.imageEndpointSlugs),
      videoEndpointSlugs: readStringArray(raw.videoEndpointSlugs),
      audioEndpointSlugs: readStringArray(raw.audioEndpointSlugs),
    },
    catalogSync: {
      status: readString(raw.catalogSyncStatus),
      message: readString(raw.catalogSyncMessage),
      syncedAt: readString(raw.catalogSyncedAt),
      modelCount: readNumber(raw.catalogModelCount),
    },
    raw,
  };
}

export function mergeProviderConfigOptions(
  currentValue: unknown,
  patch: Partial<{
    defaults: Partial<ProviderConfigOptionsState['defaults']>;
    enabledModels: Partial<ProviderConfigOptionsState['enabledModels']>;
    catalogSync: Partial<ProviderCatalogSyncState>;
  }>,
) {
  const current = parseProviderConfigOptions(currentValue);

  return {
    ...current.raw,
    textEndpointSlug: patch.defaults?.textEndpointSlug ?? current.defaults.textEndpointSlug,
    imageEndpointSlug: patch.defaults?.imageEndpointSlug ?? current.defaults.imageEndpointSlug,
    videoEndpointSlug: patch.defaults?.videoEndpointSlug ?? current.defaults.videoEndpointSlug,
    audioEndpointSlug: patch.defaults?.audioEndpointSlug ?? current.defaults.audioEndpointSlug,
    textEndpointSlugs: patch.enabledModels?.textEndpointSlugs ?? current.enabledModels.textEndpointSlugs,
    imageEndpointSlugs: patch.enabledModels?.imageEndpointSlugs ?? current.enabledModels.imageEndpointSlugs,
    videoEndpointSlugs: patch.enabledModels?.videoEndpointSlugs ?? current.enabledModels.videoEndpointSlugs,
    audioEndpointSlugs: patch.enabledModels?.audioEndpointSlugs ?? current.enabledModels.audioEndpointSlugs,
    catalogSyncStatus: patch.catalogSync?.status ?? current.catalogSync.status,
    catalogSyncMessage: patch.catalogSync?.message ?? current.catalogSync.message,
    catalogSyncedAt: patch.catalogSync?.syncedAt ?? current.catalogSync.syncedAt,
    catalogModelCount: patch.catalogSync?.modelCount ?? current.catalogSync.modelCount,
  };
}
