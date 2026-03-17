import { Prisma } from '@prisma/client';
import type { ModelKind } from '@prisma/client';

import { prisma } from './prisma.js';

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

const FAMILY_DEFINITIONS: Record<
  'TEXT' | 'IMAGE' | 'VIDEO',
  {
    slug: string;
    name: string;
    capabilityJson: Record<string, unknown>;
  }
> = {
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
};

export interface PlatouCatalogModel {
  id: string;
  modelKind: 'TEXT' | 'IMAGE' | 'VIDEO';
  label: string;
}

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
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

function slugifyModelId(modelId: string) {
  return modelId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function inferModelKindFromMetadata(record: Record<string, unknown>): ModelKind | null {
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

async function ensureFamily(modelKind: 'TEXT' | 'IMAGE' | 'VIDEO') {
  const definition = FAMILY_DEFINITIONS[modelKind];
  return prisma.modelFamily.upsert({
    where: { slug: definition.slug },
    update: {
      name: definition.name,
      modelKind,
      capabilityJson: definition.capabilityJson as Prisma.InputJsonValue,
    },
    create: {
      slug: definition.slug,
      name: definition.name,
      modelKind,
      capabilityJson: definition.capabilityJson as Prisma.InputJsonValue,
    },
  });
}

function buildPriority(model: PlatouCatalogModel, index: number) {
  if (model.id === DEFAULT_PLATOU_MODELS[model.modelKind]) {
    return 5;
  }
  return 100 + index;
}

export async function syncPlatouModelCatalog(args: {
  providerId: string;
  discoveredModels: PlatouCatalogModel[];
}) {
  const [textFamily, imageFamily, videoFamily, existingEndpoints] = await Promise.all([
    ensureFamily('TEXT'),
    ensureFamily('IMAGE'),
    ensureFamily('VIDEO'),
    prisma.modelEndpoint.findMany({
      where: {
        providerId: args.providerId,
      },
      select: {
        id: true,
        slug: true,
        remoteModelKey: true,
        familyId: true,
      },
    }),
  ]);

  const familyByKind = {
    TEXT: textFamily.id,
    IMAGE: imageFamily.id,
    VIDEO: videoFamily.id,
  } as const;

  const existingByRemoteModel = new Map(existingEndpoints.map((endpoint) => [endpoint.remoteModelKey, endpoint]));
  const usedSlugs = new Set(existingEndpoints.map((endpoint) => endpoint.slug));
  const discoveredRemoteModelKeys = new Set(args.discoveredModels.map((model) => model.id));

  await Promise.all(
    args.discoveredModels.map(async (model, index) => {
      const existing = existingByRemoteModel.get(model.id);
      let slug = existing?.slug ?? `platou-${slugifyModelId(model.id)}`;
      let suffix = 2;
      while (!existing && usedSlugs.has(slug)) {
        slug = `platou-${slugifyModelId(model.id)}-${suffix}`;
        suffix += 1;
      }
      usedSlugs.add(slug);

      await prisma.modelEndpoint.upsert({
        where: { slug },
        update: {
          familyId: familyByKind[model.modelKind],
          providerId: args.providerId,
          remoteModelKey: model.id,
          label: model.label,
          status: 'ACTIVE',
          priority: buildPriority(model, index),
          isDefault: model.id === DEFAULT_PLATOU_MODELS[model.modelKind],
          defaultParamsJson: DEFAULT_PARAMS_BY_KIND[model.modelKind] as Prisma.InputJsonValue,
        },
        create: {
          slug,
          familyId: familyByKind[model.modelKind],
          providerId: args.providerId,
          remoteModelKey: model.id,
          label: model.label,
          status: 'ACTIVE',
          priority: buildPriority(model, index),
          isDefault: model.id === DEFAULT_PLATOU_MODELS[model.modelKind],
          defaultParamsJson: DEFAULT_PARAMS_BY_KIND[model.modelKind] as Prisma.InputJsonValue,
        },
      });
    }),
  );

  await prisma.modelEndpoint.updateMany({
    where: {
      providerId: args.providerId,
      familyId: {
        in: [textFamily.id, imageFamily.id, videoFamily.id],
      },
      remoteModelKey: {
        notIn: [...discoveredRemoteModelKeys],
      },
    },
    data: {
      status: 'DISABLED',
    },
  });

  return {
    totalCount: args.discoveredModels.length,
    byKind: args.discoveredModels.reduce(
      (accumulator, model) => ({
        ...accumulator,
        [model.modelKind]: accumulator[model.modelKind] + 1,
      }),
      { TEXT: 0, IMAGE: 0, VIDEO: 0 },
    ),
  };
}

export const __testables = {
  normalizeModelId,
  humanizeModelId,
  slugifyModelId,
  inferModelKindFromMetadata,
  inferModelKind,
};
