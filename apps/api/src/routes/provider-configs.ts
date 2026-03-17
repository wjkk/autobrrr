import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { requireUser } from '../lib/auth.js';
import {
  listProviderConfigItems,
  syncProviderModelsForUser,
  testProviderConfigForUser,
  updateProviderConfigForUser,
} from '../lib/provider-config-service.js';

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
      audioEndpointSlug: z.string().trim().min(1).nullable().optional(),
    })
    .optional(),
  enabledModels: z
    .object({
      textEndpointSlugs: z.array(z.string().trim().min(1)).optional().default([]),
      imageEndpointSlugs: z.array(z.string().trim().min(1)).optional().default([]),
      videoEndpointSlugs: z.array(z.string().trim().min(1)).optional().default([]),
      audioEndpointSlugs: z.array(z.string().trim().min(1)).optional().default([]),
    })
    .optional(),
});

const testProviderConfigSchema = z.object({
  testKind: z.enum(['text', 'image', 'video', 'audio']).optional(),
});

function mapServiceErrorToStatus(code: string) {
  switch (code) {
    case 'NOT_FOUND':
      return 404;
    case 'PROVIDER_NOT_CONFIGURED':
    case 'BASE_URL_REQUIRED':
    case 'ENDPOINT_NOT_FOUND':
    case 'SYNC_NOT_SUPPORTED':
    case 'MODEL_SYNC_FAILED':
    case 'PROVIDER_TEST_FAILED':
    case 'PROVIDER_MODEL_NOT_OPEN':
      return 400;
    default:
      return 400;
  }
}

export async function registerProviderConfigRoutes(app: FastifyInstance) {
  app.get('/api/provider-configs', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    return reply.send({
      ok: true,
      data: await listProviderConfigItems(user.id),
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

    const result = await updateProviderConfigForUser({
      providerCode: params.data.providerCode,
      userId: user.id,
      payload: payload.data,
    });
    if (!result.ok) {
      return reply.code(mapServiceErrorToStatus(result.error.code)).send({
        ok: false,
        error: {
          code: result.error.code,
          message: result.error.message,
          ...(result.error.details ? { details: result.error.details } : {}),
        },
        ...(result.error.data !== undefined ? { data: result.error.data } : {}),
      });
    }

    return reply.send({
      ok: true,
      data: result.data,
    });
  });

  app.post('/api/provider-configs/:providerCode/sync-models', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = providerCodeParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid provider sync request.',
        },
      });
    }

    const result = await syncProviderModelsForUser({
      providerCode: params.data.providerCode,
      userId: user.id,
    });
    if (!result.ok) {
      return reply.code(mapServiceErrorToStatus(result.error.code)).send({
        ok: false,
        error: {
          code: result.error.code,
          message: result.error.message,
        },
        ...(result.error.data !== undefined ? { data: result.error.data } : {}),
      });
    }

    return reply.send({
      ok: true,
      data: result.data,
    });
  });

  app.post('/api/provider-configs/:providerCode/test', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = providerCodeParamsSchema.safeParse(request.params);
    const payload = testProviderConfigSchema.safeParse(request.body ?? {});
    if (!params.success || !payload.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid provider test request.',
        },
      });
    }

    const result = await testProviderConfigForUser({
      providerCode: params.data.providerCode,
      userId: user.id,
      testKind: payload.data.testKind,
    });
    if (!result.ok) {
      return reply.code(mapServiceErrorToStatus(result.error.code)).send({
        ok: false,
        error: {
          code: result.error.code,
          message: result.error.message,
        },
        ...(result.error.data !== undefined ? { data: result.error.data } : {}),
      });
    }

    return reply.send({
      ok: true,
      data: result.data,
    });
  });
}
