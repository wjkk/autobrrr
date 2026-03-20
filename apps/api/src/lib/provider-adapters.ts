import { resolveProviderAdapter } from './provider/adapter-resolution.js';
import { mockProxyAdapter } from './provider/adapters/mock-proxy.js';
import { officialAdapter } from './provider/adapters/official.js';
import {
  buildProviderNotConfiguredFailure,
  getEndpointModelKey,
  getModelKind,
  getPrompt,
  getProviderCode,
  getProviderType,
  inferArkVideoState,
  inferArkVideoTaskId,
  inferPlatouVideoState,
  inferPlatouVideoTaskId,
  normalizeProviderStatus,
  readObject,
  readString,
} from './provider/adapters/shared-export.js';

export type { ProviderAdapter, ProviderAdapterUpdate, ProviderCallbackPayload } from './provider/adapters/types.js';
export { resolveProviderAdapter };

export const __testables = {
  readObject,
  readString,
  buildProviderNotConfiguredFailure,
  getProviderType,
  getProviderCode,
  getEndpointModelKey,
  getPrompt,
  getModelKind,
  normalizeProviderStatus,
  inferPlatouVideoState,
  inferPlatouVideoTaskId,
  inferArkVideoState,
  inferArkVideoTaskId,
  officialAdapter,
  mockProxyAdapter,
};
