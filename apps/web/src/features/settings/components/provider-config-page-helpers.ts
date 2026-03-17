import type { ProviderConfigItem } from '../lib/provider-config-api';

export const CONFIGURABLE_PROVIDER_CODES = new Set(['ark', 'platou']);

export type SettingsProviderTestKind = 'text' | 'image' | 'video';
export type ModelKind = 'text' | 'image' | 'video' | 'audio';

export interface DraftState {
  apiKey: string;
  baseUrlOverride: string;
  enabled: boolean;
  testKind: SettingsProviderTestKind;
  enabledModels: {
    textEndpointSlugs: string[];
    imageEndpointSlugs: string[];
    videoEndpointSlugs: string[];
    audioEndpointSlugs: string[];
  };
  defaults: {
    textEndpointSlug: string;
    imageEndpointSlug: string;
    videoEndpointSlug: string;
    audioEndpointSlug: string;
  };
}

export interface ModelEndpointOption {
  id: string;
  slug: string;
  label: string;
  modelKind: string;
}

export function makeDraft(config: ProviderConfigItem): DraftState {
  return {
    apiKey: '',
    baseUrlOverride: config.userConfig.baseUrlOverride ?? config.provider.baseUrl ?? '',
    enabled: config.userConfig.enabled,
    testKind: config.endpoints.some((endpoint) => endpoint.modelKind === 'text')
      ? 'text'
      : config.endpoints.some((endpoint) => endpoint.modelKind === 'image')
        ? 'image'
        : 'video',
    enabledModels: {
      textEndpointSlugs: config.userConfig.enabledModels.textEndpointSlugs,
      imageEndpointSlugs: config.userConfig.enabledModels.imageEndpointSlugs,
      videoEndpointSlugs: config.userConfig.enabledModels.videoEndpointSlugs,
      audioEndpointSlugs: config.userConfig.enabledModels.audioEndpointSlugs,
    },
    defaults: {
      textEndpointSlug: config.userConfig.defaults.textEndpointSlug ?? '',
      imageEndpointSlug: config.userConfig.defaults.imageEndpointSlug ?? '',
      videoEndpointSlug: config.userConfig.defaults.videoEndpointSlug ?? '',
      audioEndpointSlug: config.userConfig.defaults.audioEndpointSlug ?? '',
    },
  };
}

export function modelKindLabel(modelKind: ModelKind) {
  if (modelKind === 'text') {
    return '文本';
  }
  if (modelKind === 'image') {
    return '图片';
  }
  if (modelKind === 'video') {
    return '视频';
  }
  return '音频';
}

export function getEnabledModelSlugs(draft: DraftState, modelKind: ModelKind) {
  if (modelKind === 'text') {
    return draft.enabledModels.textEndpointSlugs;
  }
  if (modelKind === 'image') {
    return draft.enabledModels.imageEndpointSlugs;
  }
  if (modelKind === 'audio') {
    return draft.enabledModels.audioEndpointSlugs;
  }
  return draft.enabledModels.videoEndpointSlugs;
}

export function getDefaultModelSlug(draft: DraftState, modelKind: ModelKind) {
  if (modelKind === 'text') {
    return draft.defaults.textEndpointSlug;
  }
  if (modelKind === 'image') {
    return draft.defaults.imageEndpointSlug;
  }
  if (modelKind === 'audio') {
    return draft.defaults.audioEndpointSlug;
  }
  return draft.defaults.videoEndpointSlug;
}

export function setEnabledModelSlugs(draft: DraftState, modelKind: ModelKind, nextSlugs: string[]): DraftState['enabledModels'] {
  if (modelKind === 'text') {
    return {
      ...draft.enabledModels,
      textEndpointSlugs: nextSlugs,
    };
  }
  if (modelKind === 'image') {
    return {
      ...draft.enabledModels,
      imageEndpointSlugs: nextSlugs,
    };
  }
  if (modelKind === 'audio') {
    return {
      ...draft.enabledModels,
      audioEndpointSlugs: nextSlugs,
    };
  }
  return {
    ...draft.enabledModels,
    videoEndpointSlugs: nextSlugs,
  };
}

export function shouldAutoSyncConfig(config: ProviderConfigItem, syncingCode: string | null, autoSyncedCodes: Set<string>) {
  if (!CONFIGURABLE_PROVIDER_CODES.has(config.provider.code)) {
    return false;
  }
  if (!config.userConfig.configured || !config.userConfig.enabled) {
    return false;
  }
  if (config.userConfig.catalogSync.syncedAt) {
    return false;
  }
  if (autoSyncedCodes.has(config.provider.code)) {
    return false;
  }
  if (syncingCode === config.provider.code) {
    return false;
  }
  return true;
}
