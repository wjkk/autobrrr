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
  inferArkVideoState,
  inferArkVideoTaskId,
  readAdapterOptions,
  resolveProviderCompletionUrl,
  readString,
  secondsFromNow,
  withNormalizedCompletedOutput,
} from './shared-export.js';

export const arkAdapter: ProviderAdapter = {
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
      return buildProviderNotConfiguredFailure('ARK');
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
      const rawResponse = await submitTextGeneration({
        providerCode: runtimeConfig.providerCode ?? 'ark',
        model,
        prompt,
        apiKey: runtimeConfig.apiKey,
        baseUrl: runtimeConfig.baseUrl,
        hookMetadata,
      });
      const response = withNormalizedCompletedOutput(rawResponse) ?? rawResponse;
      return {
        type: 'completed',
        providerStatus: 'succeeded',
        completionUrl: resolveProviderCompletionUrl(response),
        providerOutput: {
          ...response,
          modelUsed: model,
        },
      };
    }

    if (getModelKind(run) === 'image') {
      const rawResponse = await submitImageGeneration({
        providerCode: runtimeConfig.providerCode ?? 'ark',
        baseUrl: runtimeConfig.baseUrl,
        apiKey: runtimeConfig.apiKey,
        model,
        prompt,
        hookMetadata,
      });
      const response = withNormalizedCompletedOutput(rawResponse) ?? rawResponse;
      return {
        type: 'completed',
        providerStatus: 'succeeded',
        completionUrl: resolveProviderCompletionUrl(response),
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

    const options = readAdapterOptions(run);
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
      return buildProviderNotConfiguredFailure('ARK');
    }
    if (!run.providerJobId) {
      return {
        type: 'failed',
        providerStatus: 'failed',
        errorCode: 'PROVIDER_JOB_ID_REQUIRED',
        errorMessage: 'ARK video polling requires providerJobId.',
      };
    }

    const rawResponse = await queryVideoGenerationTask({
      providerCode: runtimeConfig.providerCode ?? 'ark',
      baseUrl: runtimeConfig.baseUrl,
      apiKey: runtimeConfig.apiKey,
      taskId: run.providerJobId,
      hookMetadata,
    });
    const response = withNormalizedCompletedOutput(rawResponse) ?? rawResponse;
    const state = inferArkVideoState(response);

    if (state === 'completed' || state === 'succeeded' || state === 'success') {
      return {
        type: 'completed',
        providerStatus: 'succeeded',
        completionUrl: resolveProviderCompletionUrl(response),
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
