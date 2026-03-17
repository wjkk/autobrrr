import type { ModelKind } from '@prisma/client';

import { prisma } from './prisma.js';

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function defaultKeyForModelKind(modelKind: 'IMAGE' | 'VIDEO' | 'TEXT' | 'AUDIO') {
  if (modelKind === 'IMAGE') {
    return 'imageEndpointSlug';
  }
  if (modelKind === 'VIDEO') {
    return 'videoEndpointSlug';
  }
  if (modelKind === 'AUDIO') {
    return 'audioEndpointSlug';
  }
  return 'textEndpointSlug';
}

function enabledKeyForModelKind(modelKind: 'IMAGE' | 'VIDEO' | 'TEXT' | 'AUDIO') {
  if (modelKind === 'IMAGE') {
    return 'imageEndpointSlugs';
  }
  if (modelKind === 'VIDEO') {
    return 'videoEndpointSlugs';
  }
  if (modelKind === 'AUDIO') {
    return 'audioEndpointSlugs';
  }
  return 'textEndpointSlugs';
}

interface ParsedProviderModelSelection {
  providerId: string;
  defaultEndpointSlug: string | null;
  enabledSlugs: string[];
}

interface ModelEndpointCandidate {
  slug: string;
  providerId: string;
}

async function listUserProviderSelections(userId: string, modelKind: 'IMAGE' | 'VIDEO' | 'TEXT' | 'AUDIO') {
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

export function resolveDefaultEndpointSlugFromSelections(
  selections: ParsedProviderModelSelection[],
  endpoints: Array<ModelEndpointCandidate>,
) {
  for (const selection of selections) {
    const endpointSlug = selection.defaultEndpointSlug;
    if (!endpointSlug) {
      continue;
    }
    if (selection.enabledSlugs.length > 0 && !selection.enabledSlugs.includes(endpointSlug)) {
      continue;
    }

    const matched = endpoints.find((endpoint) => endpoint.slug === endpointSlug && endpoint.providerId === selection.providerId);
    if (!matched) {
      continue;
    }

    return matched.slug;
  }

  return null;
}

export function filterUserEnabledEndpoints<T extends ModelEndpointCandidate>(
  endpoints: T[],
  selections: ParsedProviderModelSelection[],
) {
  const selectionByProviderId = new Map(selections.map((selection) => [selection.providerId, selection]));
  return endpoints.filter((endpoint) => {
    const selection = selectionByProviderId.get(endpoint.providerId);
    if (!selection) {
      return false;
    }

    return selection.enabledSlugs.length === 0 || selection.enabledSlugs.includes(endpoint.slug);
  });
}

export async function resolveUserDefaultModelSelection(userId: string, modelKind: 'IMAGE' | 'VIDEO' | 'TEXT' | 'AUDIO') {
  const selections = await listUserProviderSelections(userId, modelKind);

  const requestedEndpointSlugs = selections
    .map((selection) => selection.defaultEndpointSlug)
    .filter((value): value is string => typeof value === 'string' && value.length > 0);
  const candidateEndpoints = requestedEndpointSlugs.length
    ? await prisma.modelEndpoint.findMany({
        where: {
          slug: {
            in: requestedEndpointSlugs,
          },
          status: 'ACTIVE',
          family: {
            modelKind: modelKind as ModelKind,
          },
        },
        include: {
          family: true,
        },
      })
    : [];

  const resolvedSlug = resolveDefaultEndpointSlugFromSelections(
    selections,
    candidateEndpoints.map((endpoint) => ({
      slug: endpoint.slug,
      providerId: endpoint.providerId,
    })),
  );
  if (!resolvedSlug) {
    return null;
  }

  const endpoint = candidateEndpoints.find((candidate) => candidate.slug === resolvedSlug);
  if (!endpoint) {
    return null;
  }

  return {
    familySlug: endpoint.family.slug,
    endpointSlug: endpoint.slug,
  };
}

export async function listUserEnabledModelEndpoints(userId: string, modelKind: 'IMAGE' | 'VIDEO' | 'TEXT' | 'AUDIO') {
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

  const filteredEndpoints = filterUserEnabledEndpoints(endpoints, selections);
  const defaultEndpointSlug = resolveDefaultEndpointSlugFromSelections(
    selections,
    filteredEndpoints.map((endpoint) => ({
      slug: endpoint.slug,
      providerId: endpoint.providerId,
    })),
  );

  return {
    endpoints: filteredEndpoints,
    defaultEndpointSlug,
  };
}
