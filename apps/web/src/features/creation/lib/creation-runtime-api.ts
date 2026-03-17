import type { Shot } from '@aiv/domain';

import type { GenerationDraft } from './ui-state';

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

export interface VideoFrameOptions {
  firstFrameUrl?: string;
  lastFrameUrl?: string;
}

export interface ApiModelEndpoint {
  id: string;
  slug: string;
  label: string;
  family: {
    id: string;
    slug: string;
    name: string;
    modelKind: 'image' | 'video' | 'text' | 'audio' | 'lipsync';
  };
  provider: {
    id: string;
    code: string;
    name: string;
    providerType: string;
    enabled: boolean;
  };
}

export interface RuntimeModelOption {
  id: string;
  title: string;
  description: string;
  modelKind: 'image' | 'video';
}

export async function requestCreationApi<T>(path: string, init?: RequestInit) {
  const response = await fetch(path, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
  });

  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || !payload.ok) {
    const errorPayload = payload as ApiEnvelopeFailure;
    throw new Error(errorPayload.error?.message ?? `Request failed: ${path}`);
  }

  return payload.data;
}

export function buildRuntimeModelOptions(
  endpoints: ApiModelEndpoint[],
  kind: 'image' | 'video',
): RuntimeModelOption[] {
  return endpoints.map((item) => ({
    id: item.slug,
    title: item.label,
    description: `${item.provider.name} · ${item.family.name}`,
    modelKind: kind,
  }));
}

export function resolveRuntimeModelDisplayName(
  catalog: {
    image: ApiModelEndpoint[];
    video: ApiModelEndpoint[];
  },
  modelId: string,
) {
  const found = [...catalog.image, ...catalog.video].find((item) => item.slug === modelId);
  return found?.label ?? modelId;
}

export function buildVideoRunPayload(params: {
  draft: GenerationDraft;
  shot: Shot | null | undefined;
  runtimeModelCatalog: {
    video: ApiModelEndpoint[];
  };
  frameOptions?: VideoFrameOptions;
}) {
  const { draft, shot, runtimeModelCatalog, frameOptions } = params;

  return {
    durationSeconds: draft.durationMode === '6s' ? 6 : 4,
    aspectRatio: shot?.canvasTransform.ratio ?? '9:16',
    resolution: draft.resolution === '1080P' ? '1080p' : '720p',
    ...(runtimeModelCatalog.video.some((item) => item.slug === draft.model) ? { modelEndpoint: draft.model } : {}),
    ...(frameOptions?.firstFrameUrl ? { firstFrameUrl: frameOptions.firstFrameUrl } : {}),
    ...(frameOptions?.lastFrameUrl ? { lastFrameUrl: frameOptions.lastFrameUrl } : {}),
  };
}
