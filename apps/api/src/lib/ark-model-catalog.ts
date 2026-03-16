import { Prisma } from '@prisma/client';
import type { ModelKind } from '@prisma/client';

import { prisma } from './prisma.js';

const DEFAULT_ARK_MODELS: Partial<Record<'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO', string>> = {
  TEXT: 'doubao-seed-1-8-251228',
  IMAGE: 'seedream-2.0',
  VIDEO: 'seedance-2.0',
};

const DEFAULT_PARAMS_BY_KIND: Partial<Record<'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO', Record<string, unknown>>> = {
  TEXT: {},
  IMAGE: {
    aspectRatio: '9:16',
  },
  VIDEO: {
    durationSeconds: 4,
    aspectRatio: '9:16',
  },
  AUDIO: {},
};

const FAMILY_DEFINITIONS: Record<
  'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO',
  {
    slug: string;
    name: string;
    capabilityJson: Record<string, unknown>;
  }
> = {
  TEXT: {
    slug: 'ark-text-catalog',
    name: 'ARK Text Catalog',
    capabilityJson: {
      provider: 'ark',
      modalities: ['text'],
    },
  },
  IMAGE: {
    slug: 'ark-image-catalog',
    name: 'ARK Image Catalog',
    capabilityJson: {
      provider: 'ark',
      modalities: ['image'],
      aspectRatios: ['1:1', '9:16', '16:9'],
    },
  },
  VIDEO: {
    slug: 'ark-video-catalog',
    name: 'ARK Video Catalog',
    capabilityJson: {
      provider: 'ark',
      modalities: ['video'],
      aspectRatios: ['1:1', '9:16', '16:9'],
    },
  },
  AUDIO: {
    slug: 'ark-audio-catalog',
    name: 'ARK Audio Catalog',
    capabilityJson: {
      provider: 'ark',
      modalities: ['audio'],
    },
  },
};

export interface ArkCatalogModel {
  id: string;
  modelKind: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO';
  label: string;
}

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function slugifyModelId(modelId: string) {
  return modelId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
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

function inferArkModelKindFromMetadata(record: Record<string, unknown>): ModelKind | null {
  const candidateValues = [
    readString(record.type),
    readString(record.modality),
    readString(record.category),
    readString(record.object),
    readString(record.endpoint_type),
  ].filter((value): value is string => !!value);

  const capabilityValues = Array.isArray(record.capabilities)
    ? record.capabilities.filter((value): value is string => typeof value === 'string')
    : [];

  const tokenString = [...candidateValues, ...capabilityValues].join(' ').toLowerCase();
  if (!tokenString) {
    return null;
  }
  if (tokenString.includes('audio') || tokenString.includes('speech') || tokenString.includes('tts') || tokenString.includes('voice')) {
    return 'AUDIO';
  }
  if (tokenString.includes('video')) {
    return 'VIDEO';
  }
  if (tokenString.includes('image')) {
    return 'IMAGE';
  }
  if (tokenString.includes('chat') || tokenString.includes('text') || tokenString.includes('completion')) {
    return 'TEXT';
  }
  return null;
}

function inferArkModelKind(modelId: string, metadata: Record<string, unknown>) {
  const fromMetadata = inferArkModelKindFromMetadata(metadata);
  if (fromMetadata) {
    return fromMetadata;
  }

  const value = modelId.toLowerCase();
  if (['audio', 'speech', 'tts', 'voice', 'music'].some((keyword) => value.includes(keyword))) {
    return 'AUDIO';
  }
  if (['seedance', 'video', 'wan', 'kling', 'veo', 'pika', 'vidu', 'sora'].some((keyword) => value.includes(keyword))) {
    return 'VIDEO';
  }
  if (['seedream', 'image', 'flux', 'sdxl', 'kolors', 'jimeng'].some((keyword) => value.includes(keyword))) {
    return 'IMAGE';
  }
  if (['doubao', 'deepseek', 'qwen', 'glm', 'text', 'chat'].some((keyword) => value.includes(keyword))) {
    return 'TEXT';
  }
  return null;
}

export async function listArkModels(args: {
  baseUrl: string;
  apiKey: string;
}) {
  const url = `${args.baseUrl.replace(/\/$/, '')}/models`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${args.apiKey}`,
    },
  });

  const payload = await response.json();
  if (!response.ok) {
    const message =
      readString(readObject(payload).error && readObject(readObject(payload).error).message)
      ?? readString(readObject(payload).message)
      ?? 'ARK model catalog sync failed.';
    throw new Error(message);
  }

  return payload;
}

export function extractArkCatalogModels(payload: unknown) {
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

  const models: ArkCatalogModel[] = [];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    const record = typeof candidate === 'string' ? { id: candidate } : readObject(candidate);
    const modelId = readString(record.id) ?? readString(record.model) ?? readString(record.name);
    if (!modelId || seen.has(modelId)) {
      continue;
    }

    const modelKind = inferArkModelKind(modelId, record);
    if (!modelKind || (modelKind !== 'TEXT' && modelKind !== 'IMAGE' && modelKind !== 'VIDEO' && modelKind !== 'AUDIO')) {
      continue;
    }

    models.push({
      id: modelId,
      modelKind,
      label: humanizeModelId(modelId),
    });
    seen.add(modelId);
  }

  return models.sort((left, right) => left.id.localeCompare(right.id));
}

async function ensureFamily(modelKind: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO') {
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

function buildPriority(model: ArkCatalogModel, index: number) {
  if (model.id === DEFAULT_ARK_MODELS[model.modelKind]) {
    return 5;
  }
  return 100 + index;
}

export async function syncArkModelCatalog(args: {
  providerId: string;
  discoveredModels: ArkCatalogModel[];
}) {
  const [textFamily, imageFamily, videoFamily, audioFamily, existingEndpoints] = await Promise.all([
    ensureFamily('TEXT'),
    ensureFamily('IMAGE'),
    ensureFamily('VIDEO'),
    ensureFamily('AUDIO'),
    prisma.modelEndpoint.findMany({
      where: {
        providerId: args.providerId,
      },
      select: {
        id: true,
        slug: true,
        remoteModelKey: true,
      },
    }),
  ]);

  const familyByKind = {
    TEXT: textFamily.id,
    IMAGE: imageFamily.id,
    VIDEO: videoFamily.id,
    AUDIO: audioFamily.id,
  } as const;

  const existingByRemoteModel = new Map(existingEndpoints.map((endpoint) => [endpoint.remoteModelKey, endpoint]));
  const usedSlugs = new Set(existingEndpoints.map((endpoint) => endpoint.slug));
  const discoveredRemoteModelKeys = new Set(args.discoveredModels.map((model) => model.id));

  await Promise.all(
    args.discoveredModels.map(async (model, index) => {
      const existing = existingByRemoteModel.get(model.id);
      let slug = existing?.slug ?? `ark-${slugifyModelId(model.id)}`;
      let suffix = 2;
      while (!existing && usedSlugs.has(slug)) {
        slug = `ark-${slugifyModelId(model.id)}-${suffix}`;
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
          isDefault: model.id === DEFAULT_ARK_MODELS[model.modelKind],
          defaultParamsJson: (DEFAULT_PARAMS_BY_KIND[model.modelKind] ?? {}) as Prisma.InputJsonValue,
        },
        create: {
          slug,
          familyId: familyByKind[model.modelKind],
          providerId: args.providerId,
          remoteModelKey: model.id,
          label: model.label,
          status: 'ACTIVE',
          priority: buildPriority(model, index),
          isDefault: model.id === DEFAULT_ARK_MODELS[model.modelKind],
          defaultParamsJson: (DEFAULT_PARAMS_BY_KIND[model.modelKind] ?? {}) as Prisma.InputJsonValue,
        },
      });
    }),
  );

  await prisma.modelEndpoint.updateMany({
    where: {
      providerId: args.providerId,
      familyId: {
        in: [textFamily.id, imageFamily.id, videoFamily.id, audioFamily.id],
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
      { TEXT: 0, IMAGE: 0, VIDEO: 0, AUDIO: 0 },
    ),
  };
}
