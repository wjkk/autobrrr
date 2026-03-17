import 'server-only';

import { requestAivApiFromServer } from '@/lib/aiv-api';
import { fetchServerListOrEmpty, fetchServerValueOrNull } from '@/lib/server-fetch-fallback';

import type { ProviderConfigItem, SettingsAuthUser } from './provider-config-api';

export async function fetchProviderConfigs(): Promise<ProviderConfigItem[]> {
  return fetchServerListOrEmpty(() => requestAivApiFromServer<ProviderConfigItem[]>('/api/provider-configs'));
}

export async function fetchSettingsAuthUser(): Promise<SettingsAuthUser | null> {
  return fetchServerValueOrNull(() => requestAivApiFromServer<SettingsAuthUser>('/api/auth/me'));
}
