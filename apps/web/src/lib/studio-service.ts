import type { ContinueProjectCard, MockStudioScenarioId, ProjectContentMode, StudioFixture } from '@aiv/domain';
import { createRuntimeStudioFixture, getMockStudioProject, getMockStudioScenario, listMockStudioProjects } from '@aiv/mock-data';

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
const DEFAULT_DATA_SOURCE_MODE = 'hybrid' as const;
type StudioDataSourceMode = 'api' | 'hybrid' | 'mock';

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

function resolveDataSourceMode(): StudioDataSourceMode {
  const raw = process.env.AIV_STUDIO_DATA_SOURCE?.trim().toLowerCase();
  if (raw === 'api' || raw === 'hybrid' || raw === 'mock') {
    return raw;
  }

  return DEFAULT_DATA_SOURCE_MODE;
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

interface RequestWithFallbackOptions<T> {
  path: string;
  fallback: () => T;
  allowNotFound?: boolean;
}

export interface CreateStudioProjectInput {
  prompt: string;
  contentMode: ProjectContentMode;
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

function logMockFallback(path: string, reason: string) {
  console.warn(`[studio-service] falling back to mock data for ${path}: ${reason}`);
}

async function requestStudioWithFallback<T>({ path, fallback, allowNotFound }: RequestWithFallbackOptions<T>): Promise<T> {
  const dataSourceMode = resolveDataSourceMode();
  if (dataSourceMode === 'mock') {
    return fallback();
  }

  try {
    const result = await requestStudio<T>(path, { allowNotFound });
    if (result === null && dataSourceMode === 'hybrid') {
      const mockResult = fallback();
      logMockFallback(path, 'api returned null');
      return mockResult;
    }

    if (result === null) {
      return result as T;
    }

    return result;
  } catch (error) {
    if (dataSourceMode === 'hybrid') {
      const reason = error instanceof Error ? error.message : 'unknown API failure';
      logMockFallback(path, reason);
      return fallback();
    }

    throw error;
  }
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

export async function fetchExploreStudio(): Promise<StudioFixture> {
  return requestStudioWithFallback<StudioFixture>({
    path: '/api/studio/explore',
    fallback: () => getMockStudioScenario('partial_failed'),
  });
}

export async function fetchStudioProject(projectId: string): Promise<StudioFixture | null> {
  return requestStudioWithFallback<StudioFixture | null>({
    path: `/api/studio/projects/${encodeURIComponent(projectId)}`,
    allowNotFound: true,
    fallback: () => getMockStudioProject(projectId),
  });
}

export async function fetchStudioScenario(scenarioId: MockStudioScenarioId): Promise<StudioFixture> {
  return requestStudioWithFallback<StudioFixture>({
    path: `/api/studio/scenarios/${encodeURIComponent(scenarioId)}`,
    fallback: () => getMockStudioScenario(scenarioId),
  });
}

export async function fetchContinueProjects(): Promise<ContinueProjectCard[]> {
  return requestStudioWithFallback<ContinueProjectCard[]>({
    path: '/api/studio/projects',
    fallback: () => listMockStudioProjects(),
  });
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
  };

  if (typeof window !== 'undefined') {
    return createStudioProjectViaLocalRoute(payload);
  }

  const studio = createRuntimeStudioFixture(payload);
  return {
    projectId: studio.project.id,
    redirectUrl: `/projects/${studio.project.id}/planner`,
    project: {
      id: studio.project.id,
      title: studio.project.title,
      contentMode: studio.project.contentMode,
      status: studio.project.status,
    },
  };
}
