import { env } from './env.js';

interface AicsoRequestOptions {
  path: string;
  body?: Record<string, unknown>;
  method?: 'GET' | 'POST';
}

function resolveToken() {
  const token = env.AICSO_API_TOKEN?.trim();
  return token ? token : null;
}

function resolveUrl(path: string) {
  return `${env.AICSO_API_BASE_URL.replace(/\/$/, '')}${path}`;
}

async function requestAicso<T>({ path, body, method = 'POST' }: AicsoRequestOptions): Promise<T> {
  const token = resolveToken();
  if (!token) {
    throw new Error('AICSO_API_TOKEN is not configured.');
  }

  const response = await fetch(resolveUrl(path), {
    method,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = (await response.json()) as T & { error?: { message?: string } };
  if (!response.ok) {
    throw new Error(payload.error?.message ?? `AICSO request failed: ${path}`);
  }

  return payload;
}

export function isAicsoConfigured() {
  return !!resolveToken();
}

export async function submitAicsoImageGeneration(args: { model: string; prompt: string }) {
  return requestAicso<Record<string, unknown>>({
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

export async function submitAicsoTextGeneration(args: { model: string; prompt: string }) {
  return requestAicso<Record<string, unknown>>({
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
    },
  });
}

export async function submitAicsoVideoGeneration(args: { model: string; prompt: string }) {
  return requestAicso<Record<string, unknown>>({
    path: '/v1/video/create',
    body: {
      model: args.model,
      prompt: args.prompt,
      enableFallback: true,
      watermark: false,
    },
  });
}

export async function queryAicsoVideoGeneration(id: string) {
  return requestAicso<Record<string, unknown>>({
    path: `/v1/video/query?id=${encodeURIComponent(id)}`,
    method: 'GET',
  });
}
