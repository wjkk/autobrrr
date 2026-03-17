import { Prisma } from '@prisma/client';

import { prisma } from './prisma.js';
import type { TransportHook, TransportHookEvent, TransportHookMetadata } from './transport-hooks.js';

function truncateString(value: string, maxLength = 4000) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;
}

function normalizeJsonValue(value: unknown, depth = 0): Prisma.InputJsonValue | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (depth > 6) {
    return '[truncated-depth]';
  }

  if (typeof value === 'string') {
    return truncateString(value, 8000);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => normalizeJsonValue(item, depth + 1));
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).slice(0, 80);
    return Object.fromEntries(entries.map(([key, nested]) => [key, normalizeJsonValue(nested, depth + 1)]));
  }

  return String(value);
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function readProviderRequestId(response: unknown, metadata?: TransportHookMetadata) {
  const explicit = readString(metadata?.providerRequestId);
  if (explicit) {
    return explicit;
  }

  if (!response || typeof response !== 'object' || Array.isArray(response)) {
    return null;
  }

  const record = response as Record<string, unknown>;
  return (
    readString(record.request_id)
    ?? readString(record.requestId)
    ?? readString(record.trace_id)
    ?? readString(record.traceId)
    ?? null
  );
}

async function persistExternalApiCallLog(event: TransportHookEvent) {
  const metadata = event.metadata ?? {};
  const requestJson = normalizeJsonValue({
    body: event.request.body ?? null,
  });
  const responseJson = normalizeJsonValue(event.response);
  const metadataJson = normalizeJsonValue(metadata);

  await prisma.externalApiCallLog.create({
    data: {
      traceId: readString(metadata.traceId),
      runId: readString(metadata.runId),
      userId: readString(metadata.userId),
      projectId: readString(metadata.projectId),
      episodeId: readString(metadata.episodeId),
      resourceType: readString(metadata.resourceType),
      resourceId: readString(metadata.resourceId),
      modelFamilyId: readString(metadata.modelFamilyId),
      modelProviderId: readString(metadata.modelProviderId),
      modelEndpointId: readString(metadata.modelEndpointId),
      providerCode: event.providerCode,
      capability: event.capability,
      operation: event.operation,
      requestUrl: event.request.url,
      requestMethod: event.request.method,
      ...(requestJson !== null ? { requestJson } : {}),
      ...(responseJson !== null ? { responseJson } : {}),
      errorMessage: readString(event.error?.message),
      providerRequestId: readProviderRequestId(event.response, metadata),
      latencyMs: Math.max(0, Math.round(event.latencyMs)),
      ...(metadataJson !== null ? { metadataJson } : {}),
    },
  });
}

export function createExternalApiCallLogHook(): TransportHook {
  return async (event) => {
    await persistExternalApiCallLog(event);
  };
}

export const __testables = {
  truncateString,
  normalizeJsonValue,
  readProviderRequestId,
};
