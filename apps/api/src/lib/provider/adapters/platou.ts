import { randomUUID } from 'node:crypto';

import {
  queryVideoGenerationTask,
  submitImageGeneration,
  submitTextGeneration,
  submitVideoGeneration,
} from '../../provider-gateway.js';
import { resolveRunProviderRuntimeConfig } from '../../provider-runtime-config.js';
import type { ProviderAdapter } from './types.js';
import {
  buildProviderNotConfiguredFailure,
  buildRunTransportMetadata,
  getEndpointModelKey,
  getModelKind,
  getPrompt,
  inferPlatouVideoState,
  inferPlatouVideoTaskId,
  readAdapterOptions,
  readString,
  secondsFromNow,
} from './shared-export.js';
import { mockProxyAdapter } from './mock-proxy.js';

export const platouAdapter: ProviderAdapter = {
  async submit(run) {
    const runtimeConfig = await resolveRunProviderRuntimeConfig(run);
    const hookMetadata = buildRunTransportMetadata({
      run,
      ownerUserId: runtimeConfig.ownerUserId,
      traceId: `run:${run.id}:submit`,
    });
    if (!runtimeConfig.enabled || !runtimeConfig.apiKey || !runtimeConfig.baseUrl) {
      return buildProviderNotConfiguredFailure('Platou');
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

    const options = readAdapterOptions(run);

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
      return buildProviderNotConfiguredFailure('Platou');
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
  async handleCallback(run, payload) {
    return mockProxyAdapter.handleCallback(run, payload);
  },
};
