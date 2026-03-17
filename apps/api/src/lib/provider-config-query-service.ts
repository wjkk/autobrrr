import { prisma } from './prisma.js';
import { mapProviderConfig, mapProviderEndpoints } from './provider-config-presenter.js';
import { mergeProviderConfigOptions, parseProviderConfigOptions } from './provider-config-options.js';
import type { ProviderConfigServiceResult } from './provider-config-service-types.js';

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
  payload: {
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

  const requestedSlugs = [
    ...Object.values(args.payload.defaults ?? {}).filter((value): value is string => !!value),
    ...(args.payload.enabledModels?.textEndpointSlugs ?? []),
    ...(args.payload.enabledModels?.imageEndpointSlugs ?? []),
    ...(args.payload.enabledModels?.videoEndpointSlugs ?? []),
    ...(args.payload.enabledModels?.audioEndpointSlugs ?? []),
  ];
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

  if (args.payload.defaults && args.payload.enabledModels) {
    const mismatchedDefault =
      (args.payload.defaults.textEndpointSlug && args.payload.enabledModels.textEndpointSlugs.length > 0 && !args.payload.enabledModels.textEndpointSlugs.includes(args.payload.defaults.textEndpointSlug))
      || (args.payload.defaults.imageEndpointSlug && args.payload.enabledModels.imageEndpointSlugs.length > 0 && !args.payload.enabledModels.imageEndpointSlugs.includes(args.payload.defaults.imageEndpointSlug))
      || (args.payload.defaults.videoEndpointSlug && args.payload.enabledModels.videoEndpointSlugs.length > 0 && !args.payload.enabledModels.videoEndpointSlugs.includes(args.payload.defaults.videoEndpointSlug))
      || (args.payload.defaults.audioEndpointSlug && args.payload.enabledModels.audioEndpointSlugs.length > 0 && !args.payload.enabledModels.audioEndpointSlugs.includes(args.payload.defaults.audioEndpointSlug));
    if (mismatchedDefault) {
      return {
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Default endpoint must be included in enabled model selections.',
        },
      };
    }
  }

  const currentOptions = parseProviderConfigOptions(provider.userConfigs[0]?.optionsJson);
  const nextOptions =
    args.payload.defaults !== undefined || args.payload.enabledModels !== undefined
      ? mergeProviderConfigOptions(currentOptions.raw, {
          defaults: {
            textEndpointSlug: args.payload.defaults?.textEndpointSlug || null,
            imageEndpointSlug: args.payload.defaults?.imageEndpointSlug || null,
            videoEndpointSlug: args.payload.defaults?.videoEndpointSlug || null,
            audioEndpointSlug: args.payload.defaults?.audioEndpointSlug || null,
          },
          enabledModels: {
            textEndpointSlugs: args.payload.enabledModels?.textEndpointSlugs ?? currentOptions.enabledModels.textEndpointSlugs,
            imageEndpointSlugs: args.payload.enabledModels?.imageEndpointSlugs ?? currentOptions.enabledModels.imageEndpointSlugs,
            videoEndpointSlugs: args.payload.enabledModels?.videoEndpointSlugs ?? currentOptions.enabledModels.videoEndpointSlugs,
            audioEndpointSlugs: args.payload.enabledModels?.audioEndpointSlugs ?? currentOptions.enabledModels.audioEndpointSlugs,
          },
        })
      : undefined;

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
