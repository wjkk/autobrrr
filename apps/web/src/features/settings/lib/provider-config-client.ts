import type { DraftState, SettingsProviderTestKind } from '../components/provider-config-page-helpers';
import type { ProviderConfigItem, SettingsAuthUser } from './provider-config-api';

interface ProviderConfigApiEnvelope {
  ok: boolean;
  data?: ProviderConfigItem;
  error?: {
    message?: string;
  };
}

interface SettingsAuthEnvelope {
  ok: boolean;
  data?: SettingsAuthUser;
  error?: {
    message?: string;
  };
}

export function buildProviderConfigUpdateRequestBody(draft: DraftState) {
  return {
    apiKey: draft.apiKey.trim() ? draft.apiKey.trim() : undefined,
    baseUrlOverride: draft.baseUrlOverride.trim() ? draft.baseUrlOverride.trim() : null,
    enabled: draft.enabled,
    defaults: {
      textEndpointSlug: draft.defaults.textEndpointSlug || null,
      imageEndpointSlug: draft.defaults.imageEndpointSlug || null,
      videoEndpointSlug: draft.defaults.videoEndpointSlug || null,
      audioEndpointSlug: draft.defaults.audioEndpointSlug || null,
    },
    enabledModels: {
      textEndpointSlugs: draft.enabledModels.textEndpointSlugs,
      imageEndpointSlugs: draft.enabledModels.imageEndpointSlugs,
      videoEndpointSlugs: draft.enabledModels.videoEndpointSlugs,
      audioEndpointSlugs: draft.enabledModels.audioEndpointSlugs,
    },
  };
}

export function parseProviderConfigMutationResponse(
  responseOk: boolean,
  payload: ProviderConfigApiEnvelope,
  fallbackMessage: string,
) {
  if (!responseOk || !payload.ok) {
    const error = new Error(payload.error?.message ?? fallbackMessage) as Error & { providerConfig?: ProviderConfigItem };
    if (payload.data) {
      error.providerConfig = payload.data;
    }
    throw error;
  }

  if (!payload.data) {
    throw new Error('返回为空。');
  }

  return payload.data;
}

export function parseSettingsAuthResponse(
  responseOk: boolean,
  payload: SettingsAuthEnvelope,
  fallbackMessage: string,
) {
  if (!responseOk || !payload.ok || !payload.data) {
    throw new Error(payload.error?.message ?? fallbackMessage);
  }

  return payload.data;
}

export async function updateProviderConfig(providerCode: string, draft: DraftState): Promise<ProviderConfigItem> {
  const response = await fetch(`/api/provider-configs/${encodeURIComponent(providerCode)}`, {
    method: 'PUT',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildProviderConfigUpdateRequestBody(draft)),
  });

  const payload = (await response.json()) as ProviderConfigApiEnvelope;
  return parseProviderConfigMutationResponse(response.ok, payload, '保存配置失败。');
}

export async function testProviderConfig(providerCode: string, testKind: SettingsProviderTestKind): Promise<ProviderConfigItem> {
  const response = await fetch(`/api/provider-configs/${encodeURIComponent(providerCode)}/test`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ testKind }),
  });

  const payload = (await response.json()) as ProviderConfigApiEnvelope;
  return parseProviderConfigMutationResponse(response.ok, payload, '连通性测试失败。');
}

export async function syncProviderModels(providerCode: string): Promise<ProviderConfigItem> {
  const response = await fetch(`/api/provider-configs/${encodeURIComponent(providerCode)}/sync-models`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
    },
  });

  const payload = (await response.json()) as ProviderConfigApiEnvelope;
  return parseProviderConfigMutationResponse(response.ok, payload, '模型目录同步失败。');
}

export async function fetchSettingsAuthUserClient(): Promise<SettingsAuthUser> {
  const response = await fetch('/api/auth/me', { headers: { Accept: 'application/json' } });
  const payload = (await response.json()) as SettingsAuthEnvelope;
  return parseSettingsAuthResponse(response.ok, payload, '获取当前用户失败。');
}
