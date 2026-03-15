import 'server-only';

import { requestAivApiFromServer } from '@/lib/aiv-api';

export interface AdminModelEndpointItem {
  id: string;
  slug: string;
  remoteModelKey: string;
  label: string;
  status: string;
  priority: number;
  isDefault: boolean;
  family: {
    id: string;
    slug: string;
    name: string;
    modelKind: string;
  };
  provider: {
    id: string;
    code: string;
    name: string;
    providerType: string;
    enabled: boolean;
  };
  defaultParams: Record<string, unknown> | null;
}

export async function fetchAdminModelEndpoints() {
  try {
    return (await requestAivApiFromServer<AdminModelEndpointItem[]>('/api/model-endpoints?scope=all')) ?? [];
  } catch {
    return [];
  }
}
