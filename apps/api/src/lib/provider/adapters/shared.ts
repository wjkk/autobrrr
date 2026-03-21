import type { Run } from '@prisma/client';

import { readObject, readString } from '../../json-helpers.js';
import { parseRunInput } from '../../run-input.js';
import type {
  ImageGenerationRunInput,
  PlannerDocUpdateRunInput,
  RunInputPayload,
  StoryboardGenerationRunInput,
  VideoGenerationRunInput,
} from '../../run-input.js';
import type { TransportHookMetadata } from '../../transport-hooks.js';
import type { ProviderAdapterUpdate } from './types.js';

type ProviderBackedRunInput =
  | ImageGenerationRunInput
  | VideoGenerationRunInput
  | PlannerDocUpdateRunInput
  | StoryboardGenerationRunInput;

export function isProviderBackedRunInput(input: RunInputPayload): input is ProviderBackedRunInput {
  return 'modelProvider' in input && 'modelEndpoint' in input;
}

export function getProviderBackedRunInput(run: Run): ProviderBackedRunInput {
  const input = parseRunInput(run);
  if (!isProviderBackedRunInput(input)) {
    throw new Error(`Run ${run.id} with type ${run.runType} does not support provider-backed execution.`);
  }
  return input;
}

export function getProviderType(run: Run) {
  const input = getProviderBackedRunInput(run);
  const providerType = input.modelProvider.providerType;
  return typeof providerType === 'string' ? providerType.toLowerCase() : 'official';
}

export function getProviderCode(run: Run) {
  const input = getProviderBackedRunInput(run);
  return readString(input.modelProvider.code);
}

export function getEndpointModelKey(run: Run) {
  const input = getProviderBackedRunInput(run);
  return readString(input.modelEndpoint.remoteModelKey);
}

export function getPrompt(run: Run) {
  const input = getProviderBackedRunInput(run);
  return readString(input.prompt) ?? '';
}

export function getModelKind(run: Run) {
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

export function secondsFromNow(seconds: number) {
  return new Date(Date.now() + seconds * 1000);
}

export function buildProviderNotConfiguredFailure(providerLabel: string): ProviderAdapterUpdate {
  return {
    type: 'failed',
    providerStatus: 'failed',
    errorCode: 'PROVIDER_NOT_CONFIGURED',
    errorMessage: `${providerLabel} provider is not configured for this account. Configure and enable a usable provider before running planner AI.`,
  };
}

export function buildRunTransportMetadata(args: {
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

export function normalizeProviderStatus(providerStatus: string) {
  const normalized = providerStatus.trim().toLowerCase();
  if (normalized === 'completed') {
    return 'succeeded';
  }
  if (normalized === 'error') {
    return 'failed';
  }
  return normalized;
}

export function findStringDeep(value: unknown, keys: string[]): string | null {
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

export function resolveProviderCompletionUrl(providerOutput: Record<string, unknown> | undefined) {
  if (!providerOutput) {
    return null;
  }

  return findStringDeep(providerOutput, ['completionUrl', 'downloadUrl', 'url', 'uri', 'video_url', 'image_url']);
}

export function withNormalizedCompletedOutput(providerOutput: Record<string, unknown> | undefined) {
  if (!providerOutput) {
    return undefined;
  }

  const completionUrl = resolveProviderCompletionUrl(providerOutput);
  if (!completionUrl) {
    return providerOutput;
  }

  return {
    ...providerOutput,
    completionUrl,
    downloadUrl: completionUrl,
  };
}

export function inferPlatouVideoState(payload: Record<string, unknown>) {
  return (findStringDeep(payload, ['status', 'state']) ?? 'processing').toLowerCase();
}

export function inferPlatouVideoTaskId(payload: Record<string, unknown>) {
  return findStringDeep(payload, ['task_id', 'id']);
}

export function inferArkVideoState(payload: Record<string, unknown>) {
  return (findStringDeep(payload, ['status', 'state', 'task_status']) ?? 'processing').toLowerCase();
}

export function inferArkVideoTaskId(payload: Record<string, unknown>) {
  return findStringDeep(payload, ['id', 'task_id']);
}

export function readAdapterOptions(run: Run) {
  const input = getProviderBackedRunInput(run);
  return readObject('options' in input ? input.options : null);
}

export {
  readObject,
  readString,
};
