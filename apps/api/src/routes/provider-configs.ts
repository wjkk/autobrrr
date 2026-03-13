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
  config?: {
    id: string;
    enabled: boolean;
    apiKey: string | null;
    baseUrlOverride: string | null;
    updatedAt: Date;
  } | null;
}) {
  return {
    provider: {
      id: args.provider.id,
      code: args.provider.code,
      name: args.provider.name,
      providerType: args.provider.providerType.toLowerCase(),
      baseUrl: args.provider.baseUrl,
      enabled: args.provider.enabled,
    },
    userConfig: args.config
      ? {
          id: args.config.id,
          configured: !!args.config.apiKey,
          hasApiKey: !!args.config.apiKey,
          enabled: args.config.enabled,
          baseUrlOverride: args.config.baseUrlOverride,
          updatedAt: args.config.updatedAt.toISOString(),
        }
      : {
          id: null,
          configured: false,
          hasApiKey: false,
          enabled: true,
          baseUrlOverride: null,
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
      },
      create: {
        userId: user.id,
        providerId: provider.id,
        apiKey: payload.data.apiKey || null,
        baseUrlOverride: payload.data.baseUrlOverride || null,
        enabled: payload.data.enabled ?? true,
      },
      select: {
        id: true,
        enabled: true,
        apiKey: true,
        baseUrlOverride: true,
        updatedAt: true,
      },
    });

    return reply.send({
      ok: true,
      data: mapProviderConfig({
        provider,
        config,
      }),
    });
  });
}
