import { env } from './env.js';

interface AicsoRequestOptions {
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

export interface AicsoTextSubmissionResult {
  modelUsed: string;
  attemptedModels: string[];
  response: Record<string, unknown>;
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
    throw new AicsoApiError(payload.error?.message ?? `AICSO request failed: ${path}`, response.status, payload);
  }

  return payload;
}

function isGeminiModel(model: string) {
  return model.startsWith('gemini-');
}

function shouldRetryWithFallback(error: unknown) {
  if (!(error instanceof AicsoApiError)) {
    return false;
  }

  if (error.status === 503) {
    return true;
  }

  return /no available channels?/i.test(error.message);
}

export function isAicsoConfigured() {
  return !!resolveToken();
}

export function resolveAicsoTextFallbackModels() {
  return (env.AICSO_TEXT_FALLBACK_MODELS ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
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

export async function submitAicsoGeminiTextGeneration(args: { model: string; prompt: string }) {
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

export async function submitAicsoChatTextGeneration(args: { model: string; prompt: string }) {
  return requestAicso<Record<string, unknown>>({
    path: '/v1/chat/completions',
    body: {
      model: args.model,
      messages: [
        {
          role: 'user',
          content: args.prompt,
        },
      ],
    },
  });
}

export async function submitAicsoTextGenerationWithFallback(args: { primaryModel: string; fallbackModels: string[]; prompt: string }): Promise<AicsoTextSubmissionResult> {
  const attemptedModels: string[] = [];
  const models = [args.primaryModel, ...args.fallbackModels.filter((item) => item !== args.primaryModel)];
  let lastError: unknown;

  for (const model of models) {
    attemptedModels.push(model);

    try {
      const response = isGeminiModel(model)
        ? await submitAicsoGeminiTextGeneration({ model, prompt: args.prompt })
        : await submitAicsoChatTextGeneration({ model, prompt: args.prompt });

      return {
        modelUsed: model,
        attemptedModels,
        response,
      };
    } catch (error) {
      lastError = error;
      if (!shouldRetryWithFallback(error) || attemptedModels.length === models.length) {
        throw error;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('AICSO text fallback failed.');
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
