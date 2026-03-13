import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { requireUser } from '../lib/auth.js';
import { prisma } from '../lib/prisma.js';

const providerCodeParamsSchema = z.object({
  providerCode: z.string().trim().min(1),
});

const updateProviderConfigSchema = z.object({
  apiKey: z.string().trim().max(4096).nullable().optional(),
  baseUrlOverride: z.string().trim().url().nullable().optional(),
  enabled: z.boolean().optional(),
  defaults: z
    .object({
      textEndpointSlug: z.string().trim().min(1).nullable().optional(),
      imageEndpointSlug: z.string().trim().min(1).nullable().optional(),
      videoEndpointSlug: z.string().trim().min(1).nullable().optional(),
    })
    .optional(),
});

function mapProviderConfig(args: {
  provider: {
    id: string;
    code: string;
    name: string;
    providerType: string;
    baseUrl: string | null;
    enabled: boolean;
  };
  endpoints?: Array<{
    id: string;
    slug: string;
    label: string;
    modelKind: string;
    familySlug: string;
    isDefault: boolean;
  }>;
  config?: {
    id: string;
    enabled: boolean;
    apiKey: string | null;
    baseUrlOverride: string | null;
    optionsJson: unknown;
    updatedAt: Date;
  } | null;
}) {
  const options = args.config ? ((args.config.optionsJson && typeof args.config.optionsJson === 'object' && !Array.isArray(args.config.optionsJson) ? args.config.optionsJson : {}) as Record<string, unknown>) : {};
  return {
    provider: {
      id: args.provider.id,
      code: args.provider.code,
      name: args.provider.name,
      providerType: args.provider.providerType.toLowerCase(),
      baseUrl: args.provider.baseUrl,
      enabled: args.provider.enabled,
    },
    endpoints: (args.endpoints ?? []).map((endpoint) => ({
      id: endpoint.id,
      slug: endpoint.slug,
      label: endpoint.label,
      modelKind: endpoint.modelKind,
      familySlug: endpoint.familySlug,
      isDefault: endpoint.isDefault,
    })),
    userConfig: args.config
      ? {
          id: args.config.id,
          configured: !!args.config.apiKey,
          hasApiKey: !!args.config.apiKey,
          enabled: args.config.enabled,
          baseUrlOverride: args.config.baseUrlOverride,
          defaults: {
            textEndpointSlug: typeof options.textEndpointSlug === 'string' ? options.textEndpointSlug : null,
            imageEndpointSlug: typeof options.imageEndpointSlug === 'string' ? options.imageEndpointSlug : null,
            videoEndpointSlug: typeof options.videoEndpointSlug === 'string' ? options.videoEndpointSlug : null,
          },
          updatedAt: args.config.updatedAt.toISOString(),
        }
      : {
          id: null,
          configured: false,
          hasApiKey: false,
          enabled: true,
          baseUrlOverride: null,
          defaults: {
            textEndpointSlug: null,
            imageEndpointSlug: null,
            videoEndpointSlug: null,
          },
          updatedAt: null,
        },
  };
}

export async function registerProviderConfigRoutes(app: FastifyInstance) {
  app.get('/api/provider-configs', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const providers = await prisma.modelProvider.findMany({
      orderBy: [{ providerType: 'asc' }, { code: 'asc' }],
      include: {
        endpoints: {
          where: {
            status: 'ACTIVE',
          },
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
          where: { userId: user.id },
          take: 1,
        },
      },
    });

    return reply.send({
      ok: true,
      data: providers.map((provider) =>
        mapProviderConfig({
          provider,
          endpoints: provider.endpoints.map((endpoint) => ({
            id: endpoint.id,
            slug: endpoint.slug,
            label: endpoint.label,
            modelKind: endpoint.family.modelKind.toLowerCase(),
            familySlug: endpoint.family.slug,
            isDefault: endpoint.isDefault,
          })),
          config: provider.userConfigs[0] ?? null,
        }),
      ),
    });
  });

  app.put('/api/provider-configs/:providerCode', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = providerCodeParamsSchema.safeParse(request.params);
    const payload = updateProviderConfigSchema.safeParse(request.body);
    if (!params.success || !payload.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid provider config payload.',
          details: payload.success ? undefined : payload.error.flatten(),
        },
      });
    }

    const provider = await prisma.modelProvider.findUnique({
      where: { code: params.data.providerCode },
      select: {
        id: true,
        code: true,
        name: true,
        providerType: true,
        baseUrl: true,
        enabled: true,
      },
    });

    if (!provider) {
      return reply.code(404).send({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Provider not found.',
        },
      });
    }

    if (payload.data.defaults) {
      const requestedSlugs = Object.values(payload.data.defaults).filter((value): value is string => !!value);
      if (requestedSlugs.length > 0) {
        const endpoints = await prisma.modelEndpoint.findMany({
          where: {
            providerId: provider.id,
            slug: { in: requestedSlugs },
            status: 'ACTIVE',
          },
          select: { slug: true },
        });
        if (endpoints.length !== requestedSlugs.length) {
          return reply.code(400).send({
            ok: false,
            error: {
              code: 'INVALID_ARGUMENT',
              message: 'One or more default endpoint selections are invalid for this provider.',
            },
          });
        }
      }
    }

    const config = await prisma.userProviderConfig.upsert({
      where: {
        userId_providerId: {
          userId: user.id,
          providerId: provider.id,
        },
      },
      update: {
        ...(payload.data.apiKey !== undefined ? { apiKey: payload.data.apiKey || null } : {}),
        ...(payload.data.baseUrlOverride !== undefined ? { baseUrlOverride: payload.data.baseUrlOverride || null } : {}),
        ...(payload.data.enabled !== undefined ? { enabled: payload.data.enabled } : {}),
        ...(payload.data.defaults !== undefined
          ? {
              optionsJson: {
                textEndpointSlug: payload.data.defaults.textEndpointSlug || null,
                imageEndpointSlug: payload.data.defaults.imageEndpointSlug || null,
                videoEndpointSlug: payload.data.defaults.videoEndpointSlug || null,
              },
            }
          : {}),
      },
      create: {
        userId: user.id,
        providerId: provider.id,
        apiKey: payload.data.apiKey || null,
        baseUrlOverride: payload.data.baseUrlOverride || null,
        enabled: payload.data.enabled ?? true,
        optionsJson: payload.data.defaults
          ? {
              textEndpointSlug: payload.data.defaults.textEndpointSlug || null,
              imageEndpointSlug: payload.data.defaults.imageEndpointSlug || null,
              videoEndpointSlug: payload.data.defaults.videoEndpointSlug || null,
            }
          : undefined,
      },
      select: {
        id: true,
        enabled: true,
        apiKey: true,
        baseUrlOverride: true,
        optionsJson: true,
        updatedAt: true,
      },
    });

    const endpoints = await prisma.modelEndpoint.findMany({
      where: {
        providerId: provider.id,
        status: 'ACTIVE',
      },
      include: {
        family: {
          select: {
            slug: true,
            modelKind: true,
          },
        },
      },
      orderBy: [{ family: { modelKind: 'asc' } }, { priority: 'asc' }, { createdAt: 'asc' }],
    });

    return reply.send({
      ok: true,
      data: mapProviderConfig({
        provider,
        endpoints: endpoints.map((endpoint) => ({
          id: endpoint.id,
          slug: endpoint.slug,
          label: endpoint.label,
          modelKind: endpoint.family.modelKind.toLowerCase(),
          familySlug: endpoint.family.slug,
          isDefault: endpoint.isDefault,
        })),
        config,
      }),
    });
  });
}
