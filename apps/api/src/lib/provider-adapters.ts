import { randomUUID } from 'node:crypto';

import type { Run } from '@prisma/client';

export interface ProviderCallbackPayload {
  providerJobId?: string;
  providerStatus: string;
  output?: Record<string, unknown>;
  errorCode?: string;
  errorMessage?: string;
}

export type ProviderAdapterUpdate =
  | {
      type: 'submitted';
      providerJobId: string;
      providerStatus: string;
      providerCallbackToken?: string;
      nextPollAt: Date | null;
    }
  | {
      type: 'running';
      providerStatus: string;
      nextPollAt: Date | null;
    }
  | {
      type: 'completed';
      providerStatus: string;
    }
  | {
      type: 'failed';
      providerStatus?: string;
      errorCode: string;
      errorMessage: string;
    };

interface ProviderAdapter {
  submit(run: Run): Promise<ProviderAdapterUpdate>;
  poll(run: Run): Promise<ProviderAdapterUpdate>;
  handleCallback(run: Run, payload: ProviderCallbackPayload): Promise<ProviderAdapterUpdate>;
}

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function getProviderType(run: Run) {
  const input = readObject(run.inputJson);
  const modelProvider = readObject(input.modelProvider);
  const providerType = modelProvider.providerType;
  return typeof providerType === 'string' ? providerType.toLowerCase() : 'official';
}

function secondsFromNow(seconds: number) {
  return new Date(Date.now() + seconds * 1000);
}

function normalizeProviderStatus(providerStatus: string) {
  const normalized = providerStatus.trim().toLowerCase();
  if (normalized === 'completed') {
    return 'succeeded';
  }
  if (normalized === 'error') {
    return 'failed';
  }
  return normalized;
}

const officialAdapter: ProviderAdapter = {
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

const proxyAdapter: ProviderAdapter = {
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
      };
    }

    if (providerStatus === 'failed') {
      return {
        type: 'failed',
        providerStatus,
        errorCode: payload.errorCode ?? 'PROVIDER_CALLBACK_FAILED',
        errorMessage: payload.errorMessage ?? 'Provider callback reported failure.',
      };
    }

    return {
      type: 'running',
      providerStatus,
      nextPollAt: secondsFromNow(1),
    };
  },
};

export function resolveProviderAdapter(run: Run): ProviderAdapter {
  return getProviderType(run) === 'proxy' ? proxyAdapter : officialAdapter;
}
