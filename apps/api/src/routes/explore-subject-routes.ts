import type { FastifyInstance } from 'fastify';

import { requireUser } from '../lib/auth.js';
import { catalogSubjectImageGenerationSchema, generateCatalogSubjectImageForUser } from '../lib/catalog-subject-image.js';
import {
  createCatalogSubject,
  listCatalogSubjects,
  updateCatalogSubject,
} from '../lib/explore-catalog-service.js';
import {
  itemParamsSchema,
  listSubjectsQuerySchema,
  subjectPayloadSchema,
} from './explore-catalog-route-shared.js';

export async function registerExploreSubjectRoutes(app: FastifyInstance) {
  app.get('/api/explore/subjects', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const query = listSubjectsQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid subject query.',
        },
      });
    }

    return reply.send({
      ok: true,
      data: await listCatalogSubjects({
        userId: user.id,
        scope: query.data.scope,
        genderTag: query.data.genderTag,
      }),
    });
  });

  app.post('/api/explore/subjects', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const payload = subjectPayloadSchema.safeParse(request.body);
    if (!payload.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid subject payload.',
          details: payload.error.flatten(),
        },
      });
    }

    return reply.code(201).send({
      ok: true,
      data: await createCatalogSubject(user.id, payload.data),
    });
  });

  app.post('/api/explore/subjects/generate-image', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const payload = catalogSubjectImageGenerationSchema.safeParse(request.body);
    if (!payload.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid catalog subject image generation payload.',
          details: payload.error.flatten(),
        },
      });
    }

    try {
      const result = await generateCatalogSubjectImageForUser({
        userId: user.id,
        input: payload.data,
      });

      return reply.send({
        ok: true,
        data: result,
      });
    } catch (error) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'CATALOG_SUBJECT_IMAGE_GENERATION_FAILED',
          message: error instanceof Error ? error.message : 'Catalog subject image generation failed.',
        },
      });
    }
  });

  app.patch('/api/explore/subjects/:itemId', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = itemParamsSchema.safeParse(request.params);
    const payload = subjectPayloadSchema.partial().safeParse(request.body);
    if (!params.success || !payload.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid subject update payload.',
          details: payload.success ? undefined : payload.error.flatten(),
        },
      });
    }

    const updated = await updateCatalogSubject({
      userId: user.id,
      itemId: params.data.itemId,
      patch: payload.data,
    });
    if (!updated) {
      return reply.code(404).send({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Subject not found.',
        },
      });
    }

    return reply.send({
      ok: true,
      data: updated,
    });
  });
}
