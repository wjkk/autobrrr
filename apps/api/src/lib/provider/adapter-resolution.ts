import type { Run } from '@prisma/client';

import { arkAdapter } from './adapters/ark.js';
import { mockProxyAdapter } from './adapters/mock-proxy.js';
import { officialAdapter } from './adapters/official.js';
import { platouAdapter } from './adapters/platou.js';
import { getProviderCode, getProviderType } from './adapters/shared.js';
import type { ProviderAdapter } from './adapters/types.js';

export function resolveProviderAdapter(run: Run): ProviderAdapter {
  const providerCode = getProviderCode(run);
  if (providerCode === 'ark') {
    return arkAdapter;
  }
  if (providerCode === 'platou') {
    return platouAdapter;
  }

  return getProviderType(run) === 'proxy' ? mockProxyAdapter : officialAdapter;
}
