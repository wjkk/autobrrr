import { emitTransportHook, type TransportHookMetadata } from './transport-hooks.js';

interface ArkRequestOptions {
  baseUrl: string;
  apiKey: string;
  path: string;
  body?: Record<string, unknown>;
  method?: 'GET' | 'POST';
  capability: 'text' | 'image' | 'video' | 'audio';
  metadata?: TransportHookMetadata;
}

export class ArkApiError extends Error {
  status: number;
  payload?: unknown;
  code?: string;

  constructor(message: string, status: number, payload?: unknown, code?: string) {
    super(message);
    this.name = 'ArkApiError';
    this.status = status;
    this.payload = payload;
    this.code = code;
  }
}

async function requestArk<T>({
  baseUrl,
  apiKey,
  path,
  body,
  method = 'POST',
  capability,
  metadata,
}: ArkRequestOptions): Promise<T> {
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

  const payload = (await response.json()) as T & { error?: { message?: string; code?: string } };
  if (!response.ok) {
    await emitTransportHook({
      providerCode: 'ark',
      capability,
      operation: path,
      request: {
        url,
        method,
        ...(body ? { body } : {}),
      },
      response: payload,
      error: {
        message: payload.error?.message ?? `ARK request failed: ${path}`,
      },
      latencyMs: Date.now() - startedAt,
      metadata,
    });
    throw new ArkApiError(
      payload.error?.message ?? `ARK request failed: ${path}`,
      response.status,
      payload,
      payload.error?.code,
    );
  }

  await emitTransportHook({
    providerCode: 'ark',
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

export async function submitArkTextResponse(args: {
  model: string;
  prompt: string;
  baseUrl: string;
  apiKey: string;
  hookMetadata?: TransportHookMetadata;
}) {
  return requestArk<Record<string, unknown>>({
    baseUrl: args.baseUrl,
    apiKey: args.apiKey,
    path: '/responses',
    capability: 'text',
    metadata: args.hookMetadata,
    body: {
      model: args.model,
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: args.prompt,
            },
          ],
        },
      ],
    },
  });
}

export async function submitArkImageGeneration(args: {
  model: string;
  prompt: string;
  baseUrl: string;
  apiKey: string;
  hookMetadata?: TransportHookMetadata;
}) {
  return requestArk<Record<string, unknown>>({
    baseUrl: args.baseUrl,
    apiKey: args.apiKey,
    path: '/images/generations',
    capability: 'image',
    metadata: args.hookMetadata,
    body: {
      model: args.model,
      prompt: args.prompt,
    },
  });
}

export async function submitArkVideoGeneration(args: {
  model: string;
  prompt: string;
  baseUrl: string;
  apiKey: string;
  images?: string[];
  duration?: number;
  aspectRatio?: string;
  hookMetadata?: TransportHookMetadata;
}) {
  return requestArk<Record<string, unknown>>({
    baseUrl: args.baseUrl,
    apiKey: args.apiKey,
    path: '/contents/generations/tasks',
    capability: 'video',
    metadata: args.hookMetadata,
    body: {
      model: args.model,
      content: [
        {
          type: 'text',
          text: args.prompt,
        },
        ...(args.images?.map((url) => ({
          type: 'image_url',
          image_url: {
            url,
          },
        })) ?? []),
      ],
      ...(typeof args.duration === 'number' && Number.isFinite(args.duration) ? { duration: Math.max(1, Math.floor(args.duration)) } : {}),
      ...(args.aspectRatio ? { ratio: args.aspectRatio } : {}),
    },
  });
}

export async function queryArkVideoGeneration(args: {
  baseUrl: string;
  apiKey: string;
  taskId: string;
  hookMetadata?: TransportHookMetadata;
}) {
  try {
    return await requestArk<Record<string, unknown>>({
      baseUrl: args.baseUrl,
      apiKey: args.apiKey,
      path: `/contents/generations/tasks/${encodeURIComponent(args.taskId)}`,
      method: 'GET',
      capability: 'video',
      metadata: args.hookMetadata,
    });
  } catch (error) {
    if (!(error instanceof ArkApiError) || error.status !== 404) {
      throw error;
    }

    const listPayload = await requestArk<{ items?: Array<Record<string, unknown>> }>({
      baseUrl: args.baseUrl,
      apiKey: args.apiKey,
      path: `/contents/generations/tasks?filter.task_ids=${encodeURIComponent(args.taskId)}`,
      method: 'GET',
      capability: 'video',
      metadata: args.hookMetadata,
    });

    const matched = Array.isArray(listPayload.items) ? listPayload.items[0] : null;
    if (matched) {
      return matched;
    }

    throw error;
  }
}
