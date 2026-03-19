import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { requireUser } from '../lib/auth.js';
import { finalizePlannerRefinement } from '../lib/planner/orchestration/finalize-service.js';

const paramsSchema = z.object({
  projectId: z.string().min(1),
});

const payloadSchema = z.object({
  episodeId: z.string().min(1),
  targetVideoModelFamilySlug: z.string().trim().min(1).max(120).optional(),
});

export async function registerPlannerFinalizeRoutes(app: FastifyInstance) {
  app.post('/api/projects/:projectId/planner/finalize', async (request, reply) => {
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
          message: 'Invalid planner finalize payload.',
          details: payload.success ? undefined : payload.error.flatten(),
        },
      });
    }

    const result = await finalizePlannerRefinement({
      projectId: params.data.projectId,
      episodeId: payload.data.episodeId,
      userId: user.id,
      targetVideoModelFamilySlug: payload.data.targetVideoModelFamilySlug,
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

    if (!result.ok && result.error === 'PLANNER_REFINEMENT_REQUIRED') {
      return reply.code(409).send({
        ok: false,
        error: {
          code: 'PLANNER_REFINEMENT_REQUIRED',
          message: 'Finalize requires an active refinement version.',
        },
      });
    }

    if (!result.ok && result.error === 'PLANNER_REFINEMENT_NOT_READY') {
      return reply.code(409).send({
        ok: false,
        error: {
          code: 'PLANNER_REFINEMENT_NOT_READY',
          message: 'Only draft or ready refinement versions can be finalized.',
        },
      });
    }

    if (!result.ok && result.error === 'PLANNER_REFINEMENT_EMPTY') {
      return reply.code(409).send({
        ok: false,
        error: {
          code: 'PLANNER_REFINEMENT_EMPTY',
          message: 'Finalize requires at least one shot script.',
        },
      });
    }

    if (!result.ok && result.error === 'TARGET_VIDEO_MODEL_REQUIRED') {
      return reply.code(409).send({
        ok: false,
        error: {
          code: 'TARGET_VIDEO_MODEL_REQUIRED',
          message: 'Finalize requires a resolvable target video model.',
        },
      });
    }

    if (!result.ok) {
      return reply.code(result.error === 'CREATION_SHOT_CONFLICT' ? 409 : 500).send({
        ok: false,
        error: {
          code: result.error,
          message: result.message ?? 'Planner finalize failed.',
        },
      });
    }

    return reply.send({
      ok: true,
      data: {
        refinementVersionId: result.refinementVersionId,
        targetVideoModelFamilySlug: result.targetVideoModelFamilySlug,
        finalizedShotCount: result.finalizedShotCount,
        finalizedAt: result.finalizedAt,
      },
    });
  });
}
