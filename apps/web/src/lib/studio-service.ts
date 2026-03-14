import type { ContinueProjectCard, ProjectContentMode, StudioFixture } from '@aiv/domain';

interface ApiErrorPayload {
  code?: string;
  message?: string;
  details?: Record<string, unknown>;
}

type ApiEnvelope<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiErrorPayload };

const DEFAULT_STUDIO_API_BASE_URL = 'http://localhost:8787';
const DEFAULT_TIMEOUT_MS = 10_000;
class StudioServiceError extends Error {
  code: string;
  status?: number;

  constructor(message: string, code = 'STUDIO_API_ERROR', status?: number) {
    super(message);
    this.name = 'StudioServiceError';
    this.code = code;
    this.status = status;
  }
}

function resolveBaseUrl() {
  const rawBaseUrl = process.env.AIV_API_BASE_URL?.trim() || DEFAULT_STUDIO_API_BASE_URL;
  return rawBaseUrl.endsWith('/') ? rawBaseUrl.slice(0, -1) : rawBaseUrl;
}

function resolveTimeoutMs() {
  const raw = Number(process.env.AIV_API_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TIMEOUT_MS;
}

function isApiEnvelope<T>(value: unknown): value is ApiEnvelope<T> {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return 'ok' in value;
}

function resolveErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === 'object' && 'message' in payload) {
    const value = (payload as { message?: unknown }).message;
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }

  return fallback;
}

export interface CreateStudioProjectInput {
  prompt: string;
  contentMode: ProjectContentMode;
  creationConfig?: {
    selectedTab: '短剧漫剧' | '音乐MV' | '知识分享';
    selectedSubtype?: string;
    scriptSourceName?: string;
    scriptContent?: string;
    imageModelEndpointSlug?: string;
    subjectProfileSlug?: string;
    stylePresetSlug?: string;
    settings?: Record<string, unknown>;
  };
}

export interface CreateStudioProjectResult {
  projectId: string;
  redirectUrl: string;
  project: {
    id: string;
    title: string;
    contentMode: ProjectContentMode;
    status: string;
  };
}

async function requestStudio<T>(path: string, options?: { allowNotFound?: boolean }): Promise<T | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), resolveTimeoutMs());

  try {
    const response = await fetch(`${resolveBaseUrl()}${path}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
      signal: controller.signal,
    });

    if (response.status === 404 && options?.allowNotFound) {
      return null;
    }

    const rawBody = await response.text();
    const payload = rawBody
      ? (() => {
          try {
            return JSON.parse(rawBody) as unknown;
          } catch {
            throw new StudioServiceError(`Invalid JSON response from ${path}.`, 'STUDIO_API_INVALID_JSON', response.status);
          }
        })()
      : null;

    if (!response.ok) {
      if (isApiEnvelope<unknown>(payload) && !payload.ok) {
        throw new StudioServiceError(
          payload.error.message || `Studio API request failed: ${path}`,
          payload.error.code || 'STUDIO_API_REQUEST_FAILED',
          response.status,
        );
      }

      throw new StudioServiceError(
        resolveErrorMessage(payload, `Studio API request failed with status ${response.status}: ${path}`),
        'STUDIO_API_HTTP_ERROR',
        response.status,
      );
    }

    if (isApiEnvelope<T>(payload)) {
      if (!payload.ok) {
        throw new StudioServiceError(payload.error.message || `Studio API request failed: ${path}`, payload.error.code || 'STUDIO_API_REQUEST_FAILED', response.status);
      }

      return payload.data;
    }

    if (payload === null) {
      throw new StudioServiceError(`Empty response from ${path}.`, 'STUDIO_API_EMPTY_RESPONSE', response.status);
    }

    return payload as T;
  } catch (error) {
    if (error instanceof StudioServiceError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new StudioServiceError(`Studio API timeout: ${path}`, 'STUDIO_API_TIMEOUT');
    }

    throw new StudioServiceError(
      error instanceof Error ? error.message : `Unknown Studio API error: ${path}`,
      'STUDIO_API_NETWORK_ERROR',
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchStudioProject(projectId: string): Promise<StudioFixture | null> {
  return requestStudio<StudioFixture | null>(`/api/studio/projects/${encodeURIComponent(projectId)}`, {
    allowNotFound: true,
  });
}

export async function fetchContinueProjects(): Promise<ContinueProjectCard[]> {
  return (await requestStudio<ContinueProjectCard[]>('/api/studio/projects')) ?? [];
}

async function createStudioProjectViaLocalRoute(input: CreateStudioProjectInput): Promise<CreateStudioProjectResult> {
  const response = await fetch('/api/studio/projects', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  const payload = (await response.json()) as unknown;
  if (!response.ok) {
    throw new StudioServiceError(resolveErrorMessage(payload, '创建项目失败。'), 'STUDIO_CREATE_PROJECT_FAILED', response.status);
  }

  if (isApiEnvelope<CreateStudioProjectResult>(payload)) {
    if (!payload.ok) {
      throw new StudioServiceError(payload.error.message || '创建项目失败。', payload.error.code || 'STUDIO_CREATE_PROJECT_FAILED', response.status);
    }
    return payload.data;
  }

  return payload as CreateStudioProjectResult;
}

export async function createStudioProject(input: CreateStudioProjectInput): Promise<CreateStudioProjectResult> {
  const normalizedPrompt = input.prompt.trim();
  if (!normalizedPrompt) {
    throw new StudioServiceError('Prompt is required.', 'PROMPT_REQUIRED', 400);
  }

  const payload: CreateStudioProjectInput = {
    prompt: normalizedPrompt,
    contentMode: input.contentMode === 'series' ? 'series' : 'single',
    ...(input.creationConfig
      ? {
          creationConfig: {
            ...input.creationConfig,
          },
        }
      : {}),
  };

  if (typeof window !== 'undefined') {
    return createStudioProjectViaLocalRoute(payload);
  }

  throw new StudioServiceError('createStudioProject should be called from the client.', 'STUDIO_CREATE_PROJECT_CLIENT_ONLY');
}
