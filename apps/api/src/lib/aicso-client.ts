interface AicsoRequestOptions {
  baseUrl: string;
  apiKey: string;
  path: string;
  body?: Record<string, unknown>;
  method?: 'GET' | 'POST';
}

export class AicsoApiError extends Error {
  status: number;
  payload?: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = 'AicsoApiError';
    this.status = status;
    this.payload = payload;
  }
}

async function requestAicso<T>({ baseUrl, apiKey, path, body, method = 'POST' }: AicsoRequestOptions): Promise<T> {
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = (await response.json()) as T & { error?: { message?: string } };
  if (!response.ok) {
    throw new AicsoApiError(payload.error?.message ?? `AICSO request failed: ${path}`, response.status, payload);
  }

  return payload;
}

export async function submitAicsoImageGeneration(args: { model: string; prompt: string; baseUrl: string; apiKey: string }) {
  return requestAicso<Record<string, unknown>>({
    baseUrl: args.baseUrl,
    apiKey: args.apiKey,
    path: `/v1beta/models/${encodeURIComponent(args.model)}:generateContent`,
    body: {
      contents: [
        {
          parts: [
            {
              text: args.prompt,
            },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    },
  });
}

export async function submitAicsoVideoGeneration(args: { model: string; prompt: string; baseUrl: string; apiKey: string }) {
  return requestAicso<Record<string, unknown>>({
    baseUrl: args.baseUrl,
    apiKey: args.apiKey,
    path: '/v1/video/create',
    body: {
      model: args.model,
      prompt: args.prompt,
      enableFallback: true,
      watermark: false,
    },
  });
}

export async function queryAicsoVideoGeneration(args: { id: string; baseUrl: string; apiKey: string }) {
  return requestAicso<Record<string, unknown>>({
    baseUrl: args.baseUrl,
    apiKey: args.apiKey,
    path: `/v1/video/query?id=${encodeURIComponent(args.id)}`,
    method: 'GET',
  });
}
