import { randomUUID } from 'node:crypto';

import type { ProviderAdapter } from './types.js';
import { normalizeProviderStatus, secondsFromNow } from './shared.js';

export const mockProxyAdapter: ProviderAdapter = {
  async submit(run) {
    return {
      type: 'submitted',
      providerJobId: run.providerJobId ?? `job_${randomUUID()}`,
      providerCallbackToken: run.providerCallbackToken ?? randomUUID(),
      providerStatus: 'submitted',
      nextPollAt: secondsFromNow(1),
    };
  },
  async poll(run) {
    const nextAttempt = run.pollAttemptCount + 1;
    if (nextAttempt < 2) {
      return {
        type: 'running',
        providerStatus: 'processing',
        nextPollAt: secondsFromNow(1),
      };
    }

    return {
      type: 'completed',
      providerStatus: 'succeeded',
    };
  },
  async handleCallback(_run, payload) {
    const providerStatus = normalizeProviderStatus(payload.providerStatus);
    if (providerStatus === 'succeeded') {
      return {
        type: 'completed',
        providerStatus,
        providerOutput: payload.output,
      };
    }

    if (providerStatus === 'failed') {
      return {
        type: 'failed',
        providerStatus,
        errorCode: payload.errorCode ?? 'PROVIDER_CALLBACK_FAILED',
        errorMessage: payload.errorMessage ?? 'Provider callback reported failure.',
        providerOutput: payload.output,
      };
    }

    return {
      type: 'running',
      providerStatus,
      nextPollAt: secondsFromNow(1),
      providerOutput: payload.output,
    };
  },
};
