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

interface ParsedProviderModelSelection {
  providerId: string;
  defaultEndpointSlug: string | null;
  enabledSlugs: string[];
}

async function listUserProviderSelections(userId: string, modelKind: 'IMAGE' | 'VIDEO' | 'TEXT') {
  const configs = await prisma.userProviderConfig.findMany({
    where: {
      userId,
      enabled: true,
      apiKey: {
        not: null,
      },
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

  return configs.map<ParsedProviderModelSelection>((config) => {
    const options = readObject(config.optionsJson);
    return {
      providerId: config.providerId,
      defaultEndpointSlug: readString(options[key]),
      enabledSlugs: Array.isArray(options[enabledKey])
        ? (options[enabledKey] as unknown[]).filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        : [],
    };
  });
}

export async function resolveUserDefaultModelSelection(userId: string, modelKind: 'IMAGE' | 'VIDEO' | 'TEXT') {
  const selections = await listUserProviderSelections(userId, modelKind);

  for (const config of selections) {
    const endpointSlug = config.defaultEndpointSlug;
    const enabledSlugs = config.enabledSlugs;
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

export async function listUserEnabledModelEndpoints(userId: string, modelKind: 'IMAGE' | 'VIDEO' | 'TEXT') {
  const selections = await listUserProviderSelections(userId, modelKind);
  if (selections.length === 0) {
    return {
      endpoints: [],
      defaultEndpointSlug: null,
    };
  }

  const selectionByProviderId = new Map(selections.map((selection) => [selection.providerId, selection]));
  const endpoints = await prisma.modelEndpoint.findMany({
    where: {
      status: 'ACTIVE',
      providerId: {
        in: [...selectionByProviderId.keys()],
      },
      family: {
        modelKind: modelKind as ModelKind,
      },
      provider: {
        enabled: true,
      },
    },
    include: {
      family: true,
      provider: true,
    },
    orderBy: [{ isDefault: 'desc' }, { priority: 'asc' }, { createdAt: 'asc' }],
  });

  const filteredEndpoints = endpoints.filter((endpoint) => {
    const selection = selectionByProviderId.get(endpoint.providerId);
    if (!selection) {
      return false;
    }

    return selection.enabledSlugs.length === 0 || selection.enabledSlugs.includes(endpoint.slug);
  });

  const defaultEndpointSlug = filteredEndpoints.find((endpoint) => {
    const selection = selectionByProviderId.get(endpoint.providerId);
    return !!selection?.defaultEndpointSlug && selection.defaultEndpointSlug === endpoint.slug;
  })?.slug ?? null;

  return {
    endpoints: filteredEndpoints,
    defaultEndpointSlug,
  };
}
