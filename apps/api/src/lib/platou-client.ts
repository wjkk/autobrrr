import { emitTransportHook, type TransportHookMetadata } from './transport-hooks.js';

interface PlatouRequestOptions {
  baseUrl: string;
  apiKey: string;
  path: string;
  body?: Record<string, unknown>;
  method?: 'GET' | 'POST';
  capability: 'text' | 'image' | 'video' | 'audio';
  metadata?: TransportHookMetadata;
}

export class PlatouApiError extends Error {
  status: number;
  payload?: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = 'PlatouApiError';
    this.status = status;
    this.payload = payload;
  }
}

async function requestPlatou<T>({ baseUrl, apiKey, path, body, method = 'POST', capability, metadata }: PlatouRequestOptions): Promise<T> {
  const url = `${baseUrl.replace(/\/$/, '')}${path}`;
  const startedAt = Date.now();
  const response = await fetch(url, {
    method,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = (await response.json()) as T & { error?: { message?: string }; message?: string };
  if (!response.ok) {
    await emitTransportHook({
      providerCode: 'platou',
      capability,
      operation: path,
      request: {
        url,
        method,
        ...(body ? { body } : {}),
      },
      response: payload,
      error: {
        message: payload.error?.message ?? payload.message ?? `Platou request failed: ${path}`,
      },
      latencyMs: Date.now() - startedAt,
      metadata,
    });
    throw new PlatouApiError(payload.error?.message ?? payload.message ?? `Platou request failed: ${path}`, response.status, payload);
  }

  await emitTransportHook({
    providerCode: 'platou',
    capability,
    operation: path,
    request: {
      url,
      method,
      ...(body ? { body } : {}),
    },
    response: payload,
    latencyMs: Date.now() - startedAt,
    metadata,
  });

  return payload;
}

export async function submitPlatouChatCompletion(args: {
  baseUrl: string;
  apiKey: string;
  model: string;
  prompt: string;
  hookMetadata?: TransportHookMetadata;
}) {
  return requestPlatou<Record<string, unknown>>({
    baseUrl: args.baseUrl,
    apiKey: args.apiKey,
    path: '/v1/chat/completions',
    capability: 'text',
    metadata: args.hookMetadata,
    body: {
      model: args.model,
      messages: [{ role: 'user', content: args.prompt }],
    },
  });
}

export async function listPlatouModels(args: { baseUrl: string; apiKey: string }) {
  return requestPlatou<unknown>({
    baseUrl: args.baseUrl,
    apiKey: args.apiKey,
    path: '/v1/models',
    method: 'GET',
    capability: 'text',
  });
}

export async function submitPlatouImageGeneration(args: {
  baseUrl: string;
  apiKey: string;
  model: string;
  prompt: string;
  hookMetadata?: TransportHookMetadata;
}) {
  return requestPlatou<Record<string, unknown>>({
    baseUrl: args.baseUrl,
    apiKey: args.apiKey,
    path: '/v1/images/generations',
    capability: 'image',
    metadata: args.hookMetadata,
    body: {
      model: args.model,
      prompt: args.prompt,
    },
  });
}

export async function submitPlatouVideoGeneration(args: {
  baseUrl: string;
  apiKey: string;
  model: string;
  prompt: string;
  images?: string[];
  duration?: number;
  aspectRatio?: string;
  hookMetadata?: TransportHookMetadata;
}) {
  return requestPlatou<Record<string, unknown>>({
    baseUrl: args.baseUrl,
    apiKey: args.apiKey,
    path: '/v2/videos/generations',
    capability: 'video',
    metadata: args.hookMetadata,
    body: {
      model: args.model,
      prompt: args.prompt,
      ...(args.images?.length ? { images: args.images } : {}),
      ...(args.duration ? { duration: args.duration } : {}),
      ...(args.aspectRatio ? { aspect_ratio: args.aspectRatio } : {}),
    },
  });
}

export async function queryPlatouVideoGeneration(args: {
  baseUrl: string;
  apiKey: string;
  taskId: string;
  hookMetadata?: TransportHookMetadata;
}) {
  return requestPlatou<Record<string, unknown>>({
    baseUrl: args.baseUrl,
    apiKey: args.apiKey,
    path: `/v2/videos/generations/${encodeURIComponent(args.taskId)}`,
    method: 'GET',
    capability: 'video',
    metadata: args.hookMetadata,
  });
}
