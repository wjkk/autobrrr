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
      providerOutput?: Record<string, unknown>;
    }
  | {
      type: 'running';
      providerStatus: string;
      nextPollAt: Date | null;
      providerOutput?: Record<string, unknown>;
    }
  | {
      type: 'completed';
      providerStatus: string;
      completionUrl?: string | null;
      providerOutput?: Record<string, unknown>;
    }
  | {
      type: 'failed';
      providerStatus?: string;
      errorCode: string;
      errorMessage: string;
      providerOutput?: Record<string, unknown>;
    };

export interface ProviderAdapter {
  submit(run: Run): Promise<ProviderAdapterUpdate>;
  poll(run: Run): Promise<ProviderAdapterUpdate>;
  handleCallback(run: Run, payload: ProviderCallbackPayload): Promise<ProviderAdapterUpdate>;
}
