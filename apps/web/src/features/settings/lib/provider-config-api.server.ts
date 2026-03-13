import 'server-only';

import { requestAivApiFromServer } from '@/lib/aiv-api';

import type { ProviderConfigItem } from './provider-config-api';

export async function fetchProviderConfigs(): Promise<ProviderConfigItem[]> {
  try {
    const result = await requestAivApiFromServer<ProviderConfigItem[]>('/api/provider-configs');
    return result ?? [];
  } catch {
    return [];
  }
}
