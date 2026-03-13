import 'server-only';

import { requestAivApiFromServer } from '@/lib/aiv-api';

import type { ProviderConfigItem, SettingsAuthUser } from './provider-config-api';

export async function fetchProviderConfigs(): Promise<ProviderConfigItem[]> {
  try {
    const result = await requestAivApiFromServer<ProviderConfigItem[]>('/api/provider-configs');
    return result ?? [];
  } catch {
    return [];
  }
}

export async function fetchSettingsAuthUser(): Promise<SettingsAuthUser | null> {
  try {
    const result = await requestAivApiFromServer<SettingsAuthUser>('/api/auth/me');
    return result ?? null;
  } catch {
    return null;
  }
}
