import { randomUUID } from 'node:crypto';

import type { Run } from '@prisma/client';

import {
  queryVideoGenerationTask,
  submitImageGeneration,
  submitTextGeneration,
  submitVideoGeneration,
} from './provider-gateway.js';
import { resolveRunProviderRuntimeConfig } from './provider-runtime-config.js';
import type {
  ImageGenerationRunInput,
  PlannerDocUpdateRunInput,
  RunInputPayload,
  StoryboardGenerationRunInput,
  VideoGenerationRunInput,
} from './run-input.js';
import { parseRunInput } from './run-input.js';
import type { TransportHookMetadata } from './transport-hooks.js';

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
      providerOutput?: Record<string, unknown>;
    }
  | {
      type: 'failed';
      providerStatus?: string;
      errorCode: string;
      errorMessage: string;
      providerOutput?: Record<string, unknown>;
    };

interface ProviderAdapter {
  submit(run: Run): Promise<ProviderAdapterUpdate>;
  poll(run: Run): Promise<ProviderAdapterUpdate>;
  handleCallback(run: Run, payload: ProviderCallbackPayload): Promise<ProviderAdapterUpdate>;
}

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

type ProviderBackedRunInput =
  | ImageGenerationRunInput
  | VideoGenerationRunInput
  | PlannerDocUpdateRunInput
  | StoryboardGenerationRunInput;

function isProviderBackedRunInput(input: RunInputPayload): input is ProviderBackedRunInput {
  return 'modelProvider' in input && 'modelEndpoint' in input;
}

function getProviderBackedRunInput(run: Run): ProviderBackedRunInput {
  const input = parseRunInput(run);
  if (!isProviderBackedRunInput(input)) {
    throw new Error(`Run ${run.id} with type ${run.runType} does not support provider-backed execution.`);
  }
  return input;
}

function getProviderType(run: Run) {
  const input = getProviderBackedRunInput(run);
  const providerType = input.modelProvider.providerType;
  return typeof providerType === 'string' ? providerType.toLowerCase() : 'official';
}

function getProviderCode(run: Run) {
  const input = getProviderBackedRunInput(run);
  return readString(input.modelProvider.code);
}

function getEndpointModelKey(run: Run) {
  const input = getProviderBackedRunInput(run);
  return readString(input.modelEndpoint.remoteModelKey);
}

function getPrompt(run: Run) {
  const input = getProviderBackedRunInput(run);
  return readString(input.prompt) ?? '';
}

function getModelKind(run: Run) {
  if (run.runType === 'IMAGE_GENERATION') {
    return 'image';
  }
  if (run.runType === 'VIDEO_GENERATION') {
    return 'video';
  }
  if (run.runType === 'PLANNER_DOC_UPDATE' || run.runType === 'STORYBOARD_GENERATION') {
    return 'text';
  }
  return 'unknown';
}

function secondsFromNow(seconds: number) {
  return new Date(Date.now() + seconds * 1000);
}

function buildRunTransportMetadata(args: {
  run: Run;
  ownerUserId: string | null;
  traceId: string;
}) {
  return {
    traceId: args.traceId,
    runId: args.run.id,
    userId: args.ownerUserId ?? undefined,
    projectId: args.run.projectId ?? undefined,
    episodeId: args.run.episodeId ?? undefined,
    resourceType: args.run.resourceType ?? undefined,
    resourceId: args.run.resourceId ?? undefined,
    modelFamilyId: args.run.modelFamilyId ?? undefined,
    modelProviderId: args.run.modelProviderId ?? undefined,
    modelEndpointId: args.run.modelEndpointId ?? undefined,
  } satisfies TransportHookMetadata;
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

function findStringDeep(value: unknown, keys: string[]): string | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const direct = readString(record[key]);
    if (direct) {
      return direct;
    }
  }

  for (const nested of Object.values(record)) {
    const found = findStringDeep(nested, keys);
    if (found) {
      return found;
    }
  }

  return null;
}

function inferPlatouVideoState(payload: Record<string, unknown>) {
  return (findStringDeep(payload, ['status', 'state']) ?? 'processing').toLowerCase();
}

function inferPlatouVideoTaskId(payload: Record<string, unknown>) {
  return findStringDeep(payload, ['task_id', 'id']);
}

function inferArkVideoState(payload: Record<string, unknown>) {
  return (findStringDeep(payload, ['status', 'state', 'task_status']) ?? 'processing').toLowerCase();
}

function inferArkVideoTaskId(payload: Record<string, unknown>) {
  return findStringDeep(payload, ['id', 'task_id']);
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

const mockProxyAdapter: ProviderAdapter = {
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

const arkAdapter: ProviderAdapter = {
  async submit(run) {
    const runtimeConfig = await resolveRunProviderRuntimeConfig(run);
    const hookMetadata = buildRunTransportMetadata({
      run,
      ownerUserId: runtimeConfig.ownerUserId,
      traceId: `run:${run.id}:submit`,
    });
    const prompt = getPrompt(run);
    if (!prompt) {
      return {
        type: 'failed',
        providerStatus: 'failed',
        errorCode: 'PROVIDER_PROMPT_REQUIRED',
        errorMessage: 'Run prompt is required for provider submission.',
      };
    }

    if (!runtimeConfig.enabled || !runtimeConfig.apiKey || !runtimeConfig.baseUrl) {
      return {
        type: 'completed',
        providerStatus: 'succeeded',
        providerOutput: {
          mocked: true,
          provider: 'ark',
          modelUsed: getEndpointModelKey(run),
        },
      };
    }

    const model = getEndpointModelKey(run);
    if (!model) {
      return {
        type: 'failed',
        providerStatus: 'failed',
        errorCode: 'PROVIDER_MODEL_REQUIRED',
        errorMessage: 'Run model key is required for ARK submission.',
      };
    }
    if (getModelKind(run) === 'text') {
      const response = await submitTextGeneration({
        providerCode: runtimeConfig.providerCode ?? 'ark',
        model,
        prompt,
        apiKey: runtimeConfig.apiKey,
        baseUrl: runtimeConfig.baseUrl,
        hookMetadata,
      });
      return {
        type: 'completed',
        providerStatus: 'succeeded',
        providerOutput: {
          ...response,
          modelUsed: model,
        },
      };
    }

    if (getModelKind(run) === 'image') {
      const response = await submitImageGeneration({
        providerCode: runtimeConfig.providerCode ?? 'ark',
        baseUrl: runtimeConfig.baseUrl,
        apiKey: runtimeConfig.apiKey,
        model,
        prompt,
        hookMetadata,
      });
      return {
        type: 'completed',
        providerStatus: 'succeeded',
        providerOutput: {
          ...response,
          modelUsed: model,
        },
      };
    }

    if (getModelKind(run) !== 'video') {
      return {
        type: 'failed',
        providerStatus: 'failed',
        errorCode: 'PROVIDER_RUN_KIND_UNSUPPORTED',
        errorMessage: 'ARK provider currently supports text, image, and video runs only.',
      };
    }

    const input = getProviderBackedRunInput(run);
    const options = readObject('options' in input ? input.options : null);
    const images = [
      readString(options.firstFrameUrl),
      readString(options.lastFrameUrl),
    ].filter((value): value is string => !!value);

    const response = await submitVideoGeneration({
      providerCode: runtimeConfig.providerCode ?? 'ark',
      baseUrl: runtimeConfig.baseUrl,
      apiKey: runtimeConfig.apiKey,
      model,
      prompt,
      images,
      duration: typeof options.durationSeconds === 'number' ? options.durationSeconds : undefined,
      aspectRatio: readString(options.aspectRatio) ?? undefined,
      hookMetadata,
    });
    const providerJobId = inferArkVideoTaskId(response);
    if (!providerJobId) {
      return {
        type: 'failed',
        providerStatus: 'failed',
        errorCode: 'PROVIDER_JOB_ID_MISSING',
        errorMessage: 'ARK video submission did not return a task id.',
        providerOutput: response,
      };
    }

    return {
      type: 'submitted',
      providerJobId,
      providerCallbackToken: run.providerCallbackToken ?? randomUUID(),
      providerStatus: 'submitted',
      nextPollAt: secondsFromNow(6),
      providerOutput: response,
    };
  },
  async poll(run) {
    if (getModelKind(run) !== 'video') {
      return {
        type: 'failed',
        providerStatus: 'failed',
        errorCode: 'PROVIDER_POLL_UNSUPPORTED',
        errorMessage: 'ARK provider does not support polling for non-video runs.',
      };
    }

    const runtimeConfig = await resolveRunProviderRuntimeConfig(run);
    const hookMetadata = buildRunTransportMetadata({
      run,
      ownerUserId: runtimeConfig.ownerUserId,
      traceId: `run:${run.id}:poll`,
    });
    if (!runtimeConfig.enabled || !runtimeConfig.apiKey || !runtimeConfig.baseUrl) {
      return mockProxyAdapter.poll(run);
    }
    if (!run.providerJobId) {
      return {
        type: 'failed',
        providerStatus: 'failed',
        errorCode: 'PROVIDER_JOB_ID_REQUIRED',
        errorMessage: 'ARK video polling requires providerJobId.',
      };
    }

    const response = await queryVideoGenerationTask({
      providerCode: runtimeConfig.providerCode ?? 'ark',
      baseUrl: runtimeConfig.baseUrl,
      apiKey: runtimeConfig.apiKey,
      taskId: run.providerJobId,
      hookMetadata,
    });
    const state = inferArkVideoState(response);

    if (state === 'completed' || state === 'succeeded' || state === 'success') {
      return {
        type: 'completed',
        providerStatus: 'succeeded',
        providerOutput: response,
      };
    }

    if (state === 'failed' || state === 'error' || state === 'canceled' || state === 'cancelled' || state === 'expired') {
      return {
        type: 'failed',
        providerStatus: 'failed',
        errorCode: 'PROVIDER_TASK_FAILED',
        errorMessage: 'ARK video task failed.',
        providerOutput: response,
      };
    }

    return {
      type: 'running',
      providerStatus: state,
      nextPollAt: secondsFromNow(6),
      providerOutput: response,
    };
  },
  async handleCallback() {
    return {
      type: 'failed',
      providerStatus: 'failed',
      errorCode: 'PROVIDER_CALLBACK_UNSUPPORTED',
      errorMessage: 'ARK provider does not support callbacks.',
    };
  },
};

const platouAdapter: ProviderAdapter = {
  async submit(run) {
    const runtimeConfig = await resolveRunProviderRuntimeConfig(run);
    const hookMetadata = buildRunTransportMetadata({
      run,
      ownerUserId: runtimeConfig.ownerUserId,
      traceId: `run:${run.id}:submit`,
    });
    if (!runtimeConfig.enabled || !runtimeConfig.apiKey || !runtimeConfig.baseUrl) {
      return mockProxyAdapter.submit(run);
    }

    const model = getEndpointModelKey(run) ?? null;
    const prompt = getPrompt(run);
    if (!prompt) {
      return {
        type: 'failed',
        providerStatus: 'failed',
        errorCode: 'PROVIDER_PROMPT_REQUIRED',
        errorMessage: 'Run prompt is required for provider submission.',
      };
    }
    if (!model) {
      return {
        type: 'failed',
        providerStatus: 'failed',
        errorCode: 'PROVIDER_MODEL_REQUIRED',
        errorMessage: 'Run model key is required for Platou submission.',
      };
    }

    const input = getProviderBackedRunInput(run);
    const options = readObject('options' in input ? input.options : null);

    if (getModelKind(run) === 'text') {
      const response = await submitTextGeneration({
        providerCode: runtimeConfig.providerCode ?? 'platou',
        baseUrl: runtimeConfig.baseUrl,
        apiKey: runtimeConfig.apiKey,
        model,
        prompt,
        hookMetadata,
      });
      return {
        type: 'completed',
        providerStatus: 'succeeded',
        providerOutput: response,
      };
    }

    if (getModelKind(run) === 'image') {
      const response = await submitImageGeneration({
        providerCode: runtimeConfig.providerCode ?? 'platou',
        baseUrl: runtimeConfig.baseUrl,
        apiKey: runtimeConfig.apiKey,
        model,
        prompt,
        hookMetadata,
      });
      return {
        type: 'completed',
        providerStatus: 'succeeded',
        providerOutput: response,
      };
    }

    const images = [
      readString(options.firstFrameUrl),
      readString(options.lastFrameUrl),
    ].filter((value): value is string => !!value);

    const response = await submitVideoGeneration({
      providerCode: runtimeConfig.providerCode ?? 'platou',
      baseUrl: runtimeConfig.baseUrl,
      apiKey: runtimeConfig.apiKey,
      model,
      prompt,
      images,
      duration: typeof options.durationSeconds === 'number' ? options.durationSeconds : undefined,
      aspectRatio: readString(options.aspectRatio) ?? undefined,
      hookMetadata,
    });

    const providerJobId = inferPlatouVideoTaskId(response);
    if (!providerJobId) {
      return {
        type: 'failed',
        providerStatus: 'failed',
        errorCode: 'PROVIDER_JOB_ID_MISSING',
        errorMessage: 'Platou video submission did not return a task id.',
        providerOutput: response,
      };
    }

    return {
      type: 'submitted',
      providerJobId,
      providerCallbackToken: run.providerCallbackToken ?? randomUUID(),
      providerStatus: 'submitted',
      nextPollAt: secondsFromNow(6),
      providerOutput: response,
    };
  },
  async poll(run) {
    const runtimeConfig = await resolveRunProviderRuntimeConfig(run);
    const hookMetadata = buildRunTransportMetadata({
      run,
      ownerUserId: runtimeConfig.ownerUserId,
      traceId: `run:${run.id}:poll`,
    });
    if (!runtimeConfig.enabled || !runtimeConfig.apiKey || !runtimeConfig.baseUrl) {
      return mockProxyAdapter.poll(run);
    }
    if (!run.providerJobId) {
      return {
        type: 'failed',
        providerStatus: 'failed',
        errorCode: 'PROVIDER_JOB_ID_REQUIRED',
        errorMessage: 'Platou video polling requires providerJobId.',
      };
    }

    const response = await queryVideoGenerationTask({
      providerCode: runtimeConfig.providerCode ?? 'platou',
      baseUrl: runtimeConfig.baseUrl,
      apiKey: runtimeConfig.apiKey,
      taskId: run.providerJobId,
      hookMetadata,
    });
    const state = inferPlatouVideoState(response);

    if (state === 'completed' || state === 'succeeded' || state === 'success') {
      return {
        type: 'completed',
        providerStatus: 'succeeded',
        providerOutput: response,
      };
    }

    if (state === 'failed' || state === 'error' || state === 'canceled') {
      return {
        type: 'failed',
        providerStatus: 'failed',
        errorCode: 'PROVIDER_TASK_FAILED',
        errorMessage: 'Platou video task failed.',
        providerOutput: response,
      };
    }

    return {
      type: 'running',
      providerStatus: state,
      nextPollAt: secondsFromNow(6),
      providerOutput: response,
    };
  },
  async handleCallback(_run, payload) {
    return mockProxyAdapter.handleCallback(_run, payload);
  },
};

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

export const __testables = {
  readObject,
  readString,
  getProviderType,
  getProviderCode,
  getEndpointModelKey,
  getPrompt,
  getModelKind,
  normalizeProviderStatus,
  findStringDeep,
  inferPlatouVideoState,
  inferPlatouVideoTaskId,
  inferArkVideoState,
  inferArkVideoTaskId,
  officialAdapter,
  mockProxyAdapter,
};
