import { prisma } from './prisma.js';
import { mapProviderConfig, mapProviderEndpoints } from './provider-config-presenter.js';
import { mergeProviderConfigOptions, parseProviderConfigOptions } from './provider-config-options.js';
import type { ProviderConfigServiceResult } from './provider-config-service-types.js';

type ProviderConfigUpdatePayload = {
  apiKey?: string | null;
  baseUrlOverride?: string | null;
  enabled?: boolean;
  defaults?: {
    textEndpointSlug?: string | null;
    imageEndpointSlug?: string | null;
    videoEndpointSlug?: string | null;
    audioEndpointSlug?: string | null;
  };
  enabledModels?: {
    textEndpointSlugs: string[];
    imageEndpointSlugs: string[];
    videoEndpointSlugs: string[];
    audioEndpointSlugs: string[];
  };
};

function collectRequestedEndpointSlugs(payload: ProviderConfigUpdatePayload) {
  return [
    ...Object.values(payload.defaults ?? {}).filter((value): value is string => !!value),
    ...(payload.enabledModels?.textEndpointSlugs ?? []),
    ...(payload.enabledModels?.imageEndpointSlugs ?? []),
    ...(payload.enabledModels?.videoEndpointSlugs ?? []),
    ...(payload.enabledModels?.audioEndpointSlugs ?? []),
  ];
}

function hasMismatchedDefaultSelection(payload: ProviderConfigUpdatePayload) {
  if (!payload.defaults || !payload.enabledModels) {
    return false;
  }

  return Boolean(
    (payload.defaults.textEndpointSlug
      && payload.enabledModels.textEndpointSlugs.length > 0
      && !payload.enabledModels.textEndpointSlugs.includes(payload.defaults.textEndpointSlug))
    || (payload.defaults.imageEndpointSlug
      && payload.enabledModels.imageEndpointSlugs.length > 0
      && !payload.enabledModels.imageEndpointSlugs.includes(payload.defaults.imageEndpointSlug))
    || (payload.defaults.videoEndpointSlug
      && payload.enabledModels.videoEndpointSlugs.length > 0
      && !payload.enabledModels.videoEndpointSlugs.includes(payload.defaults.videoEndpointSlug))
    || (payload.defaults.audioEndpointSlug
      && payload.enabledModels.audioEndpointSlugs.length > 0
      && !payload.enabledModels.audioEndpointSlugs.includes(payload.defaults.audioEndpointSlug)),
  );
}

function resolveNextProviderConfigOptions(currentOptionsJson: unknown, payload: ProviderConfigUpdatePayload) {
  const currentOptions = parseProviderConfigOptions(currentOptionsJson);
  if (payload.defaults === undefined && payload.enabledModels === undefined) {
    return undefined;
  }

  return mergeProviderConfigOptions(currentOptions.raw, {
    defaults: {
      textEndpointSlug: payload.defaults?.textEndpointSlug || null,
      imageEndpointSlug: payload.defaults?.imageEndpointSlug || null,
      videoEndpointSlug: payload.defaults?.videoEndpointSlug || null,
      audioEndpointSlug: payload.defaults?.audioEndpointSlug || null,
    },
    enabledModels: {
      textEndpointSlugs: payload.enabledModels?.textEndpointSlugs ?? currentOptions.enabledModels.textEndpointSlugs,
      imageEndpointSlugs: payload.enabledModels?.imageEndpointSlugs ?? currentOptions.enabledModels.imageEndpointSlugs,
      videoEndpointSlugs: payload.enabledModels?.videoEndpointSlugs ?? currentOptions.enabledModels.videoEndpointSlugs,
      audioEndpointSlugs: payload.enabledModels?.audioEndpointSlugs ?? currentOptions.enabledModels.audioEndpointSlugs,
    },
  });
}

export async function fetchProviderConfigItem(providerCode: string, userId: string) {
  const provider = await prisma.modelProvider.findUnique({
    where: { code: providerCode },
    include: {
      endpoints: {
        where: { status: 'ACTIVE' },
        include: {
          family: {
            select: {
              slug: true,
              modelKind: true,
            },
          },
        },
        orderBy: [{ family: { modelKind: 'asc' } }, { priority: 'asc' }, { createdAt: 'asc' }],
      },
      userConfigs: {
        where: { userId },
        take: 1,
        select: {
          id: true,
          enabled: true,
          apiKey: true,
          baseUrlOverride: true,
          optionsJson: true,
          lastTestStatus: true,
          lastTestMessage: true,
          lastTestAt: true,
          lastTestEndpointSlug: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!provider) {
    return null;
  }

  return mapProviderConfig({
    provider,
    endpoints: mapProviderEndpoints(provider.endpoints),
    config: provider.userConfigs[0] ?? null,
  });
}

export async function listProviderConfigItems(userId: string) {
  const providers = await prisma.modelProvider.findMany({
    orderBy: [{ providerType: 'asc' }, { code: 'asc' }],
    include: {
      endpoints: {
        where: { status: 'ACTIVE' },
        include: {
          family: {
            select: {
              slug: true,
              modelKind: true,
            },
          },
        },
        orderBy: [{ family: { modelKind: 'asc' } }, { priority: 'asc' }, { createdAt: 'asc' }],
      },
      userConfigs: {
        where: { userId },
        take: 1,
        select: {
          id: true,
          enabled: true,
          apiKey: true,
          baseUrlOverride: true,
          optionsJson: true,
          lastTestStatus: true,
          lastTestMessage: true,
          lastTestAt: true,
          lastTestEndpointSlug: true,
          updatedAt: true,
        },
      },
    },
  });

  return providers.map((provider) =>
    mapProviderConfig({
      provider,
      endpoints: mapProviderEndpoints(provider.endpoints),
      config: provider.userConfigs[0] ?? null,
    }),
  );
}

export async function updateProviderConfigForUser(args: {
  providerCode: string;
  userId: string;
  payload: ProviderConfigUpdatePayload;
}): Promise<ProviderConfigServiceResult<Awaited<ReturnType<typeof fetchProviderConfigItem>>>> {
  const provider = await prisma.modelProvider.findUnique({
    where: { code: args.providerCode },
    include: {
      userConfigs: {
        where: { userId: args.userId },
        take: 1,
        select: {
          optionsJson: true,
        },
      },
    },
  });

  if (!provider) {
    return {
      ok: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Provider not found.',
      },
    };
  }

  const requestedSlugs = collectRequestedEndpointSlugs(args.payload);
  if (requestedSlugs.length > 0) {
    const uniqueRequestedSlugs = [...new Set(requestedSlugs)];
    const endpoints = await prisma.modelEndpoint.findMany({
      where: {
        providerId: provider.id,
        slug: { in: uniqueRequestedSlugs },
        status: 'ACTIVE',
      },
      select: { slug: true },
    });
    if (endpoints.length !== uniqueRequestedSlugs.length) {
      return {
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'One or more endpoint selections are invalid for this provider.',
        },
      };
    }
  }

  if (hasMismatchedDefaultSelection(args.payload)) {
    return {
      ok: false,
      error: {
        code: 'INVALID_ARGUMENT',
        message: 'Default endpoint must be included in enabled model selections.',
      },
    };
  }

  const nextOptions = resolveNextProviderConfigOptions(provider.userConfigs[0]?.optionsJson, args.payload);

  await prisma.userProviderConfig.upsert({
    where: {
      userId_providerId: {
        userId: args.userId,
        providerId: provider.id,
      },
    },
    update: {
      ...(args.payload.apiKey !== undefined ? { apiKey: args.payload.apiKey || null } : {}),
      ...(args.payload.baseUrlOverride !== undefined ? { baseUrlOverride: args.payload.baseUrlOverride || null } : {}),
      ...(args.payload.enabled !== undefined ? { enabled: args.payload.enabled } : {}),
      ...(nextOptions !== undefined ? { optionsJson: nextOptions } : {}),
    },
    create: {
      userId: args.userId,
      providerId: provider.id,
      apiKey: args.payload.apiKey || null,
      baseUrlOverride: args.payload.baseUrlOverride || null,
      enabled: args.payload.enabled ?? true,
      optionsJson: nextOptions,
    },
  });

  return {
    ok: true,
    data: await fetchProviderConfigItem(provider.code, args.userId),
  };
}

export const __testables = {
  collectRequestedEndpointSlugs,
  hasMismatchedDefaultSelection,
  resolveNextProviderConfigOptions,
};
