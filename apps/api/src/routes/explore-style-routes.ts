import type { FastifyInstance } from 'fastify';

import { requireUser } from '../lib/auth.js';
import {
  createCatalogStyle,
  listCatalogStyles,
  updateCatalogStyle,
} from '../lib/explore-catalog-service.js';
import {
  itemParamsSchema,
  listStylesQuerySchema,
  stylePayloadSchema,
} from './explore-catalog-route-shared.js';

export async function registerExploreStyleRoutes(app: FastifyInstance) {
  app.get('/api/explore/styles', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const query = listStylesQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid style query.',
        },
      });
    }

    return reply.send({
      ok: true,
      data: await listCatalogStyles({
        userId: user.id,
        scope: query.data.scope,
      }),
    });
  });

  app.post('/api/explore/styles', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const payload = stylePayloadSchema.safeParse(request.body);
    if (!payload.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid style payload.',
          details: payload.error.flatten(),
        },
      });
    }

    return reply.code(201).send({
      ok: true,
      data: await createCatalogStyle(user.id, payload.data),
    });
  });

  app.patch('/api/explore/styles/:itemId', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = itemParamsSchema.safeParse(request.params);
    const payload = stylePayloadSchema.partial().safeParse(request.body);
    if (!params.success || !payload.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid style update payload.',
          details: payload.success ? undefined : payload.error.flatten(),
        },
      });
    }

    const updated = await updateCatalogStyle({
      userId: user.id,
      itemId: params.data.itemId,
      patch: payload.data,
    });
    if (!updated) {
      return reply.code(404).send({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Style not found.',
        },
      });
    }

    return reply.send({
      ok: true,
      data: updated,
    });
  });
}
