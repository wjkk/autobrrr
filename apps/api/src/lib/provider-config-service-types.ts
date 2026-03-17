export type ProviderConfigServiceErrorCode =
  | 'NOT_FOUND'
  | 'INVALID_ARGUMENT'
  | 'SYNC_NOT_SUPPORTED'
  | 'PROVIDER_NOT_CONFIGURED'
  | 'BASE_URL_REQUIRED'
  | 'MODEL_SYNC_FAILED'
  | 'ENDPOINT_NOT_FOUND'
  | 'PROVIDER_TEST_FAILED'
  | 'PROVIDER_MODEL_NOT_OPEN';

export type ProviderConfigServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ProviderConfigServiceErrorCode; message: string; details?: unknown; data?: unknown } };
