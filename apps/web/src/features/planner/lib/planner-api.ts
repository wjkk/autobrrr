import type {
  ApiPlannerAssetOption,
  ApiPlannerDebugApplySource,
  ApiPlannerEntityRecommendation,
  ApiPlannerEntityRecommendationResult,
  ApiPlannerFinalizeResult,
  ApiPlannerRun,
  ApiPlannerShotPromptPreview,
  ApiPlannerWorkspace,
  PlannerRerunScope,
  PlannerStructuredDoc,
} from '@aiv/domain';
import type { PlannerPageData } from './planner-page-data';

export type {
  ApiPlannerAssetOption,
  ApiPlannerDebugApplySource,
  ApiPlannerEntityRecommendation,
  ApiPlannerEntityRecommendationResult,
  ApiPlannerFinalizeResult,
  ApiPlannerRun,
  ApiPlannerShotPromptPreview,
  ApiPlannerWorkspace,
  PlannerRerunScope,
} from '@aiv/domain';

export interface PlannerRuntimeApiContext {
  projectId: string;
  episodeId: string;
}

export interface PlannerPageBootstrap {
  studio: PlannerPageData | null;
  error?: {
    code: string;
    message: string;
    status?: number;
  } | null;
  runtimeApi?: PlannerRuntimeApiContext;
  initialGeneratedText?: string | null;
  initialStructuredDoc?: PlannerStructuredDoc | null;
  initialPlannerReady?: boolean;
  initialWorkspace?: ApiPlannerWorkspace | null;
}

interface ApiEnvelopeSuccess<T> {
  ok: true;
  data: T;
}

interface ApiEnvelopeFailure {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

type ApiEnvelope<T> = ApiEnvelopeSuccess<T> | ApiEnvelopeFailure;

export class PlannerApiError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(args: {
    message: string;
    code: string;
    status: number;
    details?: unknown;
  }) {
    super(args.message);
    this.name = 'PlannerApiError';
    this.code = args.code;
    this.status = args.status;
    this.details = args.details;
  }
}

export function isPlannerApiError(error: unknown): error is PlannerApiError {
  return error instanceof PlannerApiError;
}

async function plannerJsonRequest<T>(path: string, init?: RequestInit, fallbackMessage?: string) {
  const response = await fetch(path, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
  });

  let payload: ApiEnvelope<T> | null = null;
  try {
    payload = (await response.json()) as ApiEnvelope<T>;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload || !payload.ok) {
    const errorPayload = payload as ApiEnvelopeFailure | null;
    throw new PlannerApiError({
      message: errorPayload?.error?.message ?? fallbackMessage ?? `请求失败：${path}`,
      code: errorPayload?.error?.code ?? 'REQUEST_FAILED',
      status: response.status,
      details: errorPayload?.error?.details,
    });
  }

  return payload.data;
}

export async function fetchPlannerShotPromptPreview(args: {
  projectId: string;
  episodeId: string;
  modelSlug: string;
  signal?: AbortSignal;
}) {
  const search = new URLSearchParams({
    episodeId: args.episodeId,
    modelSlug: args.modelSlug,
  });
  return plannerJsonRequest<ApiPlannerShotPromptPreview>(
    `/api/planner/projects/${encodeURIComponent(args.projectId)}/shot-prompts?${search.toString()}`,
    {
      method: 'GET',
      signal: args.signal,
    },
    '获取分镜提示词预览失败。',
  );
}

export async function fetchPlannerWorkspace(args: {
  projectId: string;
  episodeId: string;
  signal?: AbortSignal;
}) {
  const search = new URLSearchParams({
    episodeId: args.episodeId,
  });
  return plannerJsonRequest<ApiPlannerWorkspace>(
    `/api/planner/projects/${encodeURIComponent(args.projectId)}/workspace?${search.toString()}`,
    {
      method: 'GET',
      signal: args.signal,
    },
    '获取策划工作区失败。',
  );
}

export async function fetchPlannerImageAssets(args: {
  projectId: string;
  episodeId: string;
  signal?: AbortSignal;
}) {
  const search = new URLSearchParams({
    episodeId: args.episodeId,
    mediaKind: 'image',
  });
  return plannerJsonRequest<ApiPlannerAssetOption[]>(
    `/api/planner/projects/${encodeURIComponent(args.projectId)}/assets?${search.toString()}`,
    {
      method: 'GET',
      signal: args.signal,
    },
    '获取策划素材失败。',
  );
}

export async function createPlannerRefinementDraft(args: {
  projectId: string;
  episodeId: string;
  refinementVersionId: string;
}) {
  return plannerJsonRequest<{
    refinementVersionId: string;
    sourceRefinementVersionId: string;
  }>(
    `/api/planner/projects/${encodeURIComponent(args.projectId)}/refinement-versions/${encodeURIComponent(args.refinementVersionId)}/create-draft`,
    {
      method: 'POST',
      body: JSON.stringify({
        episodeId: args.episodeId,
      }),
    },
    '创建策划草稿副本失败。',
  );
}

export async function confirmPlannerOutlineVersion(args: {
  projectId: string;
  episodeId: string;
  outlineVersionId: string;
}) {
  return plannerJsonRequest<{ outlineVersionId: string; confirmedAt: string }>(
    `/api/planner/projects/${encodeURIComponent(args.projectId)}/outline-versions/${encodeURIComponent(args.outlineVersionId)}/confirm`,
    {
      method: 'POST',
      body: JSON.stringify({
        episodeId: args.episodeId,
      }),
    },
    '确认大纲失败。',
  );
}

export async function activatePlannerVersion(args: {
  projectId: string;
  episodeId: string;
  versionId: string;
  stage: 'outline' | 'refinement';
}) {
  const actionPath = args.stage === 'refinement'
    ? `/api/planner/projects/${encodeURIComponent(args.projectId)}/refinement-versions/${encodeURIComponent(args.versionId)}/activate`
    : `/api/planner/projects/${encodeURIComponent(args.projectId)}/outline-versions/${encodeURIComponent(args.versionId)}/activate`;

  return plannerJsonRequest<{ activeVersionId: string; stage: string }>(
    actionPath,
    {
      method: 'POST',
      body: JSON.stringify({
        episodeId: args.episodeId,
      }),
    },
    '切换策划版本失败。',
  );
}

export async function savePlannerDocument(args: {
  projectId: string;
  episodeId: string;
  structuredDoc: PlannerStructuredDoc;
}) {
  return plannerJsonRequest<{ saved: true }>(
    `/api/planner/projects/${encodeURIComponent(args.projectId)}/document`,
    {
      method: 'PUT',
      body: JSON.stringify({
        episodeId: args.episodeId,
        structuredDoc: args.structuredDoc,
      }),
    },
    '保存策划文档失败。',
  );
}

export async function finalizePlannerRefinement(args: {
  projectId: string;
  episodeId: string;
  targetVideoModelFamilySlug?: string;
}) {
  return plannerJsonRequest<ApiPlannerFinalizeResult>(
    `/api/planner/projects/${encodeURIComponent(args.projectId)}/finalize`,
    {
      method: 'POST',
      body: JSON.stringify({
        episodeId: args.episodeId,
        ...(args.targetVideoModelFamilySlug ? { targetVideoModelFamilySlug: args.targetVideoModelFamilySlug } : {}),
      }),
    },
    '确认策划并交接到创作失败。',
  );
}

export async function submitPlannerPartialRerun(args: {
  projectId: string;
  episodeId: string;
  rerunScope: PlannerRerunScope;
  prompt?: string;
}) {
  return plannerJsonRequest<{ run: { id: string; status: string } }>(
    `/api/planner/projects/${encodeURIComponent(args.projectId)}/partial-rerun`,
    {
      method: 'POST',
      body: JSON.stringify({
        episodeId: args.episodeId,
        rerunScope: args.rerunScope,
        ...(args.prompt ? { prompt: args.prompt } : {}),
      }),
    },
    '提交局部重跑失败。',
  );
}

export async function submitPlannerGenerateDoc(args: {
  projectId: string;
  episodeId: string;
  prompt: string;
  modelFamily?: string;
  modelEndpoint?: string;
}) {
  return plannerJsonRequest<{ run: { id: string; status: string } }>(
    `/api/planner/projects/${encodeURIComponent(args.projectId)}/generate-doc`,
    {
      method: 'POST',
      body: JSON.stringify({
        episodeId: args.episodeId,
        prompt: args.prompt,
        ...(args.modelFamily ? { modelFamily: args.modelFamily } : {}),
        ...(args.modelEndpoint ? { modelEndpoint: args.modelEndpoint } : {}),
      }),
    },
    '提交策划生成任务失败。',
  );
}

export async function submitPlannerMediaGeneration(args: {
  path: string;
  episodeId: string;
  prompt: string;
  referenceAssetIds?: string[];
}) {
  return plannerJsonRequest<{ run: { id: string; status: string } }>(
    args.path,
    {
      method: 'POST',
      body: JSON.stringify({
        episodeId: args.episodeId,
        prompt: args.prompt,
        referenceAssetIds: args.referenceAssetIds ?? [],
      }),
    },
    '提交图片生成任务失败。',
  );
}

export async function fetchPlannerEntityRecommendations(args: {
  projectId: string;
  episodeId: string;
  entityKind: 'subject' | 'scene';
  entityId: string;
  signal?: AbortSignal;
}) {
  const search = new URLSearchParams({
    episodeId: args.episodeId,
  });
  const path = args.entityKind === 'subject'
    ? `/api/planner/projects/${encodeURIComponent(args.projectId)}/subjects/${encodeURIComponent(args.entityId)}/recommendations?${search.toString()}`
    : `/api/planner/projects/${encodeURIComponent(args.projectId)}/scenes/${encodeURIComponent(args.entityId)}/recommendations?${search.toString()}`;

  return plannerJsonRequest<ApiPlannerEntityRecommendationResult>(
    path,
    {
      method: 'GET',
      signal: args.signal,
    },
    '获取实体素材推荐失败。',
  );
}

export async function fetchPlannerRun(args: {
  runId: string;
}) {
  return plannerJsonRequest<{
    status: string;
    executionMode: 'live' | 'fallback' | null;
    output: {
      executionMode?: 'live' | 'fallback' | null;
      generatedText?: string;
      structuredDoc?: PlannerStructuredDoc | null;
    } | null;
    errorMessage: string | null;
  }>(
    `/api/planner/runs/${encodeURIComponent(args.runId)}`,
    {
      method: 'GET',
    },
    '获取策划任务状态失败。',
  );
}

export async function uploadPlannerImageAsset(args: {
  projectId: string;
  episodeId: string;
  file: File;
}) {
  const formData = new FormData();
  formData.set('episodeId', args.episodeId);
  formData.set('file', args.file);

  const response = await fetch(`/api/planner/projects/${encodeURIComponent(args.projectId)}/assets/upload`, {
    method: 'POST',
    body: formData,
  });

  let payload: ApiEnvelope<ApiPlannerAssetOption> | null = null;
  try {
    payload = (await response.json()) as ApiEnvelope<ApiPlannerAssetOption>;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload || !payload.ok) {
    const errorPayload = payload as ApiEnvelopeFailure | null;
    throw new PlannerApiError({
      message: errorPayload?.error?.message ?? '上传素材失败。',
      code: errorPayload?.error?.code ?? 'REQUEST_FAILED',
      status: response.status,
      details: errorPayload?.error?.details,
    });
  }

  return payload.data;
}

export async function patchPlannerEntity<T>(path: string, body: Record<string, unknown>) {
  return plannerJsonRequest<T>(path, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function putPlannerEntity<T>(path: string, body: Record<string, unknown>) {
  return plannerJsonRequest<T>(path, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function deletePlannerEntity<T>(path: string) {
  return plannerJsonRequest<T>(path, {
    method: 'DELETE',
  });
}

export const __testables = {
  plannerJsonRequest,
};
