import { readObject, readString } from '../../json-helpers.js';
import { listPlatouModels } from '../../platou-client.js';

import { syncDiscoveredModelCatalog, type SyncCatalogDiscoveredModel, slugifyCatalogModelId } from './sync-service.js';

const DEFAULT_PLATOU_MODELS: Record<'TEXT' | 'IMAGE' | 'VIDEO', string> = {
  TEXT: 'gemini-3.1-flash-lite-preview',
  IMAGE: 'gemini-3.1-flash-image-preview',
  VIDEO: 'veo3.1',
};

const DEFAULT_PARAMS_BY_KIND: Record<'TEXT' | 'IMAGE' | 'VIDEO', Record<string, unknown>> = {
  TEXT: {},
  IMAGE: {
    aspectRatio: '9:16',
  },
  VIDEO: {
    durationSeconds: 4,
    aspectRatio: '9:16',
    resolution: '1080p',
  },
};

const FAMILY_DEFINITIONS = {
  TEXT: {
    slug: 'platou-text-catalog',
    name: 'Platou Text Catalog',
    capabilityJson: {
      provider: 'platou',
      modalities: ['text'],
    },
  },
  IMAGE: {
    slug: 'platou-image-catalog',
    name: 'Platou Image Catalog',
    capabilityJson: {
      provider: 'platou',
      aspectRatios: ['1:1', '9:16', '16:9'],
    },
  },
  VIDEO: {
    slug: 'platou-video-catalog',
    name: 'Platou Video Catalog',
    capabilityJson: {
      provider: 'platou',
      durations: [4, 6, 8],
      aspectRatios: ['1:1', '9:16', '16:9'],
    },
  },
} as const;

export interface PlatouCatalogModel extends SyncCatalogDiscoveredModel {
  modelKind: 'TEXT' | 'IMAGE' | 'VIDEO';
}

function normalizeModelId(value: string) {
  return value.trim();
}

function humanizeModelId(modelId: string) {
  return modelId
    .replace(/[_/]+/g, '-')
    .replace(/([a-zA-Z])(\d)/g, '$1 $2')
    .split(/-+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function inferModelKindFromMetadata(record: Record<string, unknown>) {
  const possibleValues = [
    readString(record.type),
    readString(record.modality),
    readString(record.category),
    readString(record.object),
  ].filter((value): value is string => !!value);

  const capabilityValues = Array.isArray(record.capabilities)
    ? record.capabilities.filter((value): value is string => typeof value === 'string')
    : [];

  const tokens = [...possibleValues, ...capabilityValues].join(' ').toLowerCase();
  if (!tokens) {
    return null;
  }
  if (tokens.includes('video')) {
    return 'VIDEO';
  }
  if (tokens.includes('image')) {
    return 'IMAGE';
  }
  if (tokens.includes('chat') || tokens.includes('text') || tokens.includes('completion')) {
    return 'TEXT';
  }
  return null;
}

function inferModelKind(modelId: string, metadata: Record<string, unknown>) {
  const fromMetadata = inferModelKindFromMetadata(metadata);
  if (fromMetadata) {
    return fromMetadata;
  }

  const value = modelId.toLowerCase();

  const unsupportedKeywords = ['embedding', 'rerank', 'whisper', 'tts', 'speech', 'audio', 'music', 'asr', 'voice', 'bge', 'chirp'];
  if (unsupportedKeywords.some((keyword) => value.includes(keyword))) {
    return null;
  }

  const videoKeywords = ['veo', 'video', 'kling', 'wan', 'seedance', 'pixverse', 'pika', 'vidu', 'runway', 'luma', 'higgsfield', 'sora'];
  if (videoKeywords.some((keyword) => value.includes(keyword))) {
    return 'VIDEO';
  }

  const imageKeywords = ['image', 'imagine', 'banana', 'flux', 'recraft', 'dall', 'ideogram', 'qwen-image', 'jimeng', 'playground', 'stable-diffusion', 'sdxl', 'kolors', 'gpt-image', 'imagen', 'seedream'];
  if (imageKeywords.some((keyword) => value.includes(keyword))) {
    return 'IMAGE';
  }

  const textKeywords = ['gemini', 'deepseek', 'qwen', 'claude', 'gpt', 'o1', 'o3', 'o4', 'moonshot', 'kimi', 'glm', 'doubao', 'llama', 'mistral', 'grok', 'hunyuan', 'step', 'yi', 'ernie'];
  if (textKeywords.some((keyword) => value.includes(keyword))) {
    return 'TEXT';
  }

  return null;
}

export async function listPlatouCatalogModels(args: {
  baseUrl: string;
  apiKey: string;
}) {
  return listPlatouModels(args);
}

export function extractPlatouCatalogModels(payload: unknown) {
  const root = readObject(payload);
  const candidates = Array.isArray(root.data)
    ? root.data
    : Array.isArray(root.models)
      ? root.models
      : Array.isArray(root.items)
        ? root.items
        : Array.isArray(payload)
          ? payload
          : [];

  const models: PlatouCatalogModel[] = [];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    const record = typeof candidate === 'string' ? { id: candidate } : readObject(candidate);
    const modelId = readString(record.id) ?? readString(record.model) ?? readString(record.name);
    if (!modelId) {
      continue;
    }

    const normalizedId = normalizeModelId(modelId);
    if (seen.has(normalizedId)) {
      continue;
    }

    const modelKind = inferModelKind(normalizedId, record);
    if (!modelKind || (modelKind !== 'TEXT' && modelKind !== 'IMAGE' && modelKind !== 'VIDEO')) {
      continue;
    }

    models.push({
      id: normalizedId,
      modelKind,
      label: humanizeModelId(normalizedId),
    });
    seen.add(normalizedId);
  }

  return models.sort((left, right) => left.id.localeCompare(right.id));
}

export async function syncPlatouModelCatalog(args: {
  providerId: string;
  discoveredModels: PlatouCatalogModel[];
}) {
  return syncDiscoveredModelCatalog({
    providerId: args.providerId,
    discoveredModels: args.discoveredModels,
    familyDefinitions: FAMILY_DEFINITIONS,
    defaultModels: DEFAULT_PLATOU_MODELS,
    defaultParamsByKind: DEFAULT_PARAMS_BY_KIND,
    endpointSlugPrefix: 'platou',
  });
}

export const __testables = {
  normalizeModelId,
  humanizeModelId,
  slugifyModelId: slugifyCatalogModelId,
  inferModelKindFromMetadata,
  inferModelKind,
};
