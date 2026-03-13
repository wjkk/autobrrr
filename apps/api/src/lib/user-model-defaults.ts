import type { ModelKind } from '@prisma/client';

import { prisma } from './prisma.js';

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function defaultKeyForModelKind(modelKind: 'IMAGE' | 'VIDEO' | 'TEXT') {
  if (modelKind === 'IMAGE') {
    return 'imageEndpointSlug';
  }
  if (modelKind === 'VIDEO') {
    return 'videoEndpointSlug';
  }
  return 'textEndpointSlug';
}

function enabledKeyForModelKind(modelKind: 'IMAGE' | 'VIDEO' | 'TEXT') {
  if (modelKind === 'IMAGE') {
    return 'imageEndpointSlugs';
  }
  if (modelKind === 'VIDEO') {
    return 'videoEndpointSlugs';
  }
  return 'textEndpointSlugs';
}

export async function resolveUserDefaultModelSelection(userId: string, modelKind: 'IMAGE' | 'VIDEO' | 'TEXT') {
  const configs = await prisma.userProviderConfig.findMany({
    where: {
      userId,
      enabled: true,
      provider: {
        enabled: true,
      },
    },
    include: {
      provider: true,
    },
    orderBy: { updatedAt: 'desc' },
  });

  const key = defaultKeyForModelKind(modelKind);
  const enabledKey = enabledKeyForModelKind(modelKind);

  for (const config of configs) {
    const options = readObject(config.optionsJson);
    const endpointSlug = readString(options[key]);
    const enabledSlugs = Array.isArray(options[enabledKey])
      ? (options[enabledKey] as unknown[]).filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      : [];
    if (!endpointSlug) {
      continue;
    }
    if (enabledSlugs.length > 0 && !enabledSlugs.includes(endpointSlug)) {
      continue;
    }

    const endpoint = await prisma.modelEndpoint.findFirst({
      where: {
        slug: endpointSlug,
        providerId: config.providerId,
        status: 'ACTIVE',
        family: {
          modelKind: modelKind as ModelKind,
        },
      },
      include: {
        family: true,
      },
    });

    if (!endpoint) {
      continue;
    }

    return {
      familySlug: endpoint.family.slug,
      endpointSlug: endpoint.slug,
    };
  }

  return null;
}
