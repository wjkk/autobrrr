import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { requireUser } from '../lib/auth.js';
import {
  activatePlannerRefinementVersion,
  createPlannerRefinementDraft,
} from '../lib/planner/orchestration/refinement-version-service.js';

const paramsSchema = z.object({
  projectId: z.string().min(1),
  versionId: z.string().min(1),
});

const payloadSchema = z.object({
  episodeId: z.string().min(1),
});

export async function registerPlannerRefinementVersionRoutes(app: FastifyInstance) {
  app.post('/api/projects/:projectId/planner/refinement-versions/:versionId/activate', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = paramsSchema.safeParse(request.params);
    const payload = payloadSchema.safeParse(request.body);
    if (!params.success || !payload.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid planner refinement activation payload.',
          details: payload.success ? undefined : payload.error.flatten(),
        },
      });
    }

    const result = await activatePlannerRefinementVersion({
      projectId: params.data.projectId,
      episodeId: payload.data.episodeId,
      userId: user.id,
      versionId: params.data.versionId,
    });

    if (!result.ok && result.error === 'NOT_FOUND') {
      return reply.code(404).send({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Episode not found.',
        },
      });
    }

    if (!result.ok && result.error === 'PLANNER_SESSION_REQUIRED') {
      return reply.code(409).send({
        ok: false,
        error: {
          code: 'PLANNER_SESSION_REQUIRED',
          message: 'No active planner session found.',
        },
      });
    }

    if (!result.ok) {
      return reply.code(404).send({
        ok: false,
        error: {
          code: 'PLANNER_REFINEMENT_NOT_FOUND',
          message: 'Planner refinement version not found.',
        },
      });
    }

    return reply.send({
      ok: true,
      data: {
        refinementVersionId: result.refinementVersionId,
      },
    });
  });

  app.post('/api/projects/:projectId/planner/refinement-versions/:versionId/create-draft', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = paramsSchema.safeParse(request.params);
    const payload = payloadSchema.safeParse(request.body);
    if (!params.success || !payload.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid planner refinement draft payload.',
          details: payload.success ? undefined : payload.error.flatten(),
        },
      });
    }

    const result = await createPlannerRefinementDraft({
      projectId: params.data.projectId,
      episodeId: payload.data.episodeId,
      userId: user.id,
      versionId: params.data.versionId,
    });

    if (!result.ok && result.error === 'NOT_FOUND') {
      return reply.code(404).send({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Episode not found.',
        },
      });
    }

    if (!result.ok && result.error === 'PLANNER_SESSION_REQUIRED') {
      return reply.code(409).send({
        ok: false,
        error: {
          code: 'PLANNER_SESSION_REQUIRED',
          message: 'No active planner session found.',
        },
      });
    }

    if (!result.ok && result.error === 'PLANNER_REFINEMENT_NOT_FOUND') {
      return reply.code(404).send({
        ok: false,
        error: {
          code: 'PLANNER_REFINEMENT_NOT_FOUND',
          message: 'Planner refinement version not found.',
        },
      });
    }

    if (!result.ok) {
      return reply.code(409).send({
        ok: false,
        error: {
          code: 'PLANNER_REFINEMENT_NOT_CONFIRMED',
          message: 'Only confirmed refinement versions can create a draft copy.',
        },
      });
    }

    return reply.send({
      ok: true,
      data: {
        refinementVersionId: result.refinementVersionId,
        sourceRefinementVersionId: result.sourceRefinementVersionId,
      },
    });
  });
}
