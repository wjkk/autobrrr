import type { FastifyInstance } from 'fastify';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';

import { requireUser } from '../lib/auth.js';
import { resolveModelSelection } from '../lib/model-registry.js';
import { prisma } from '../lib/prisma.js';
import { listUserEnabledModelEndpoints } from '../lib/user-model-defaults.js';

const listFamiliesQuerySchema = z.object({
  modelKind: z.enum(['image', 'video', 'text', 'audio', 'lipsync']).optional(),
});

const listEndpointsQuerySchema = z.object({
  familySlug: z.string().trim().min(1).optional(),
  modelKind: z.enum(['image', 'video', 'text', 'audio', 'lipsync']).optional(),
  scope: z.enum(['all', 'userEnabled']).optional().default('all'),
});

const resolveSchema = z.object({
  modelKind: z.enum(['image', 'video', 'text', 'audio', 'lipsync']),
  familySlug: z.string().trim().min(1).optional(),
  endpointSlug: z.string().trim().min(1).optional(),
  strategy: z.enum(['preferOfficial', 'preferLowestCost', 'preferFastest', 'default']).optional().default('default'),
});

export async function registerModelRegistryRoutes(app: FastifyInstance) {
  app.get('/api/model-families', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const query = listFamiliesQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid model family query.',
        },
      });
    }

    const families = await prisma.modelFamily.findMany({
      where: query.data.modelKind ? { modelKind: query.data.modelKind.toUpperCase() as 'IMAGE' | 'VIDEO' | 'TEXT' | 'AUDIO' | 'LIPSYNC' } : undefined,
      orderBy: [{ modelKind: 'asc' }, { slug: 'asc' }],
    });

    return reply.send({
      ok: true,
      data: families.map((family) => ({
        id: family.id,
        slug: family.slug,
        name: family.name,
        modelKind: family.modelKind.toLowerCase(),
        capability: family.capabilityJson,
      })),
    });
  });

  app.get('/api/model-endpoints', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const query = listEndpointsQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid model endpoint query.',
        },
      });
    }

    let endpoints: Array<Prisma.ModelEndpointGetPayload<{ include: { family: true; provider: true } }>> = [];
    let userDefaultEndpointSlug: string | null = null;

    if (query.data.scope === 'userEnabled' && query.data.modelKind && ['image', 'video', 'text'].includes(query.data.modelKind)) {
      const result = await listUserEnabledModelEndpoints(
        user.id,
        query.data.modelKind.toUpperCase() as 'IMAGE' | 'VIDEO' | 'TEXT',
      );
      userDefaultEndpointSlug = result.defaultEndpointSlug;
      endpoints = query.data.familySlug
        ? result.endpoints.filter((endpoint) => endpoint.family.slug === query.data.familySlug)
        : result.endpoints;
    } else {
      endpoints = await prisma.modelEndpoint.findMany({
        where: {
          ...(query.data.familySlug ? { family: { slug: query.data.familySlug } } : {}),
          ...(query.data.modelKind ? { family: { ...(query.data.familySlug ? { slug: query.data.familySlug } : {}), modelKind: query.data.modelKind.toUpperCase() as 'IMAGE' | 'VIDEO' | 'TEXT' | 'AUDIO' | 'LIPSYNC' } } : {}),
        },
        include: {
          family: true,
          provider: true,
        },
        orderBy: [{ family: { slug: 'asc' } }, { priority: 'asc' }, { createdAt: 'asc' }],
      });
    }

    return reply.send({
      ok: true,
      data: endpoints.map((endpoint) => ({
        id: endpoint.id,
        slug: endpoint.slug,
        remoteModelKey: endpoint.remoteModelKey,
        label: endpoint.label,
        status: endpoint.status.toLowerCase(),
        priority: endpoint.priority,
        isDefault: endpoint.isDefault,
        isUserDefault: userDefaultEndpointSlug === endpoint.slug,
        family: {
          id: endpoint.family.id,
          slug: endpoint.family.slug,
          name: endpoint.family.name,
          modelKind: endpoint.family.modelKind.toLowerCase(),
        },
        provider: {
          id: endpoint.provider.id,
          code: endpoint.provider.code,
          name: endpoint.provider.name,
          providerType: endpoint.provider.providerType.toLowerCase(),
          enabled: endpoint.provider.enabled,
        },
        defaultParams: endpoint.defaultParamsJson,
      })),
    });
  });

  app.post('/api/model-resolution/resolve', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const payload = resolveSchema.safeParse(request.body);
    if (!payload.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid model resolution payload.',
          details: payload.error.flatten(),
        },
      });
    }

    const resolved = await resolveModelSelection({
      modelKind: payload.data.modelKind.toUpperCase() as 'IMAGE' | 'VIDEO' | 'TEXT' | 'AUDIO' | 'LIPSYNC',
      familySlug: payload.data.familySlug,
      endpointSlug: payload.data.endpointSlug,
      strategy: payload.data.strategy,
    });

    if (!resolved) {
      return reply.code(404).send({
        ok: false,
        error: {
          code: 'MODEL_NOT_FOUND',
          message: 'No active model endpoint matched the selection.',
        },
      });
    }

    return reply.send({
      ok: true,
      data: {
        family: {
          id: resolved.family.id,
          slug: resolved.family.slug,
          name: resolved.family.name,
          modelKind: resolved.family.modelKind.toLowerCase(),
        },
        provider: {
          id: resolved.provider.id,
          code: resolved.provider.code,
          name: resolved.provider.name,
          providerType: resolved.provider.providerType.toLowerCase(),
        },
        endpoint: {
          id: resolved.endpoint.id,
          slug: resolved.endpoint.slug,
          remoteModelKey: resolved.endpoint.remoteModelKey,
          label: resolved.endpoint.label,
          status: resolved.endpoint.status.toLowerCase(),
          isDefault: resolved.endpoint.isDefault,
          priority: resolved.endpoint.priority,
          defaultParams: resolved.endpoint.defaultParamsJson,
        },
      },
    });
  });
}
