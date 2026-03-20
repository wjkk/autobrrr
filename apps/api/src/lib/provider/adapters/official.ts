import type { ProviderAdapter } from './types.js';

export const officialAdapter: ProviderAdapter = {
  async submit() {
    return {
      type: 'completed',
      providerStatus: 'succeeded',
    };
  },
  async poll() {
    return {
      type: 'failed',
      providerStatus: 'failed',
      errorCode: 'PROVIDER_POLL_UNSUPPORTED',
      errorMessage: 'Official provider adapter does not support polling.',
    };
  },
  async handleCallback() {
    return {
      type: 'failed',
      providerStatus: 'failed',
      errorCode: 'PROVIDER_CALLBACK_UNSUPPORTED',
      errorMessage: 'Official provider adapter does not support callbacks.',
    };
  },
};
