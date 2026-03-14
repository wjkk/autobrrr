import 'server-only';

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

interface ApiErrorPayload {
  code?: string;
  message?: string;
  details?: unknown;
}

type ApiEnvelope<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiErrorPayload };

export class AivApiError extends Error {
  code: string;
  status?: number;

  constructor(message: string, code = 'AIV_API_ERROR', status?: number) {
    super(message);
    this.name = 'AivApiError';
    this.code = code;
    this.status = status;
  }
}

function resolveBaseUrl() {
  const rawBaseUrl = process.env.AIV_API_BASE_URL?.trim() || 'http://localhost:8787';
  return rawBaseUrl.endsWith('/') ? rawBaseUrl.slice(0, -1) : rawBaseUrl;
}

function buildApiUnavailableMessage(path: string) {
  return `AIV API is unavailable at ${resolveBaseUrl()} while requesting ${path}. Start \`pnpm dev:api\` or use the root \`pnpm dev\` script.`;
}

function toApiUnavailableError(path: string, error: unknown) {
  const message = error instanceof Error && error.message ? `${buildApiUnavailableMessage(path)} (${error.message})` : buildApiUnavailableMessage(path);
  return new AivApiError(message, 'AIV_API_UNAVAILABLE', 503);
}

function resolveErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === 'object' && 'message' in payload) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  return fallback;
}

function isApiEnvelope<T>(value: unknown): value is ApiEnvelope<T> {
  return !!value && typeof value === 'object' && 'ok' in value;
}

export async function getServerCookieHeader() {
  const cookieStore = await cookies();
  const values = cookieStore.getAll().map((item) => `${item.name}=${item.value}`);
  return values.join('; ');
}

export async function requestAivApi<T>(path: string, init?: RequestInit & { allowNotFound?: boolean; cookieHeader?: string | null }): Promise<T | null> {
  let response: Response;

  try {
    response = await fetch(`${resolveBaseUrl()}${path}`, {
      method: init?.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init?.headers ?? {}),
        ...(init?.cookieHeader ? { Cookie: init.cookieHeader } : {}),
      },
      body: init?.body,
      cache: 'no-store',
    });
  } catch (error) {
    throw toApiUnavailableError(path, error);
  }

  if (response.status === 404 && init?.allowNotFound) {
    return null;
  }

  const rawBody = await response.text();
  const payload = rawBody
    ? (() => {
        try {
          return JSON.parse(rawBody) as unknown;
        } catch {
          throw new AivApiError(`Invalid JSON response from ${path}.`, 'AIV_API_INVALID_JSON', response.status);
        }
      })()
    : null;

  if (!response.ok) {
    if (isApiEnvelope<unknown>(payload) && !payload.ok) {
      throw new AivApiError(payload.error.message || `AIV API request failed: ${path}`, payload.error.code || 'AIV_API_REQUEST_FAILED', response.status);
    }

    throw new AivApiError(resolveErrorMessage(payload, `AIV API request failed with status ${response.status}: ${path}`), 'AIV_API_HTTP_ERROR', response.status);
  }

  if (isApiEnvelope<T>(payload)) {
    if (!payload.ok) {
      throw new AivApiError(payload.error.message || `AIV API request failed: ${path}`, payload.error.code || 'AIV_API_REQUEST_FAILED', response.status);
    }
    return payload.data;
  }

  if (payload === null) {
    throw new AivApiError(`Empty response from ${path}.`, 'AIV_API_EMPTY_RESPONSE', response.status);
  }

  return payload as T;
}

export async function requestAivApiFromServer<T>(path: string, init?: RequestInit & { allowNotFound?: boolean }) {
  return requestAivApi<T>(path, {
    ...init,
    cookieHeader: await getServerCookieHeader(),
  });
}

export async function proxyAivApiRoute(request: Request, path: string) {
  const method = request.method.toUpperCase();
  const body = method === 'GET' || method === 'HEAD' ? undefined : await request.text();

  try {
    const response = await fetch(`${resolveBaseUrl()}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': request.headers.get('content-type') ?? 'application/json' } : {}),
        ...(request.headers.get('cookie') ? { Cookie: request.headers.get('cookie') as string } : {}),
      },
      body,
      cache: 'no-store',
    });

    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') ?? 'application/json',
        ...(response.headers.get('set-cookie') ? { 'set-cookie': response.headers.get('set-cookie') as string } : {}),
      },
    });
  } catch (error) {
    const apiError = toApiUnavailableError(path, error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: apiError.code,
          message: apiError.message,
        },
      },
      { status: apiError.status ?? 503 },
    );
  }
}
