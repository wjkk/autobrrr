import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { requireUser } from '../lib/auth.js';
import {
  activatePlannerOutlineVersion,
  confirmPlannerOutlineVersion,
} from '../lib/planner/orchestration/outline-version-service.js';

const paramsSchema = z.object({
  projectId: z.string().min(1),
  versionId: z.string().min(1),
});

const payloadSchema = z.object({
  episodeId: z.string().min(1),
});

function sendInvalidArgument(reply: { code: (statusCode: number) => { send: (payload: unknown) => unknown } }, message: string, details?: unknown) {
  return reply.code(400).send({
    ok: false,
    error: {
      code: 'INVALID_ARGUMENT',
      message,
      details,
    },
  });
}

function sendOutlineVersionError(reply: { code: (statusCode: number) => { send: (payload: unknown) => unknown } }, error: string) {
  if (error === 'NOT_FOUND') {
    return reply.code(404).send({
      ok: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Episode not found.',
      },
    });
  }

  if (error === 'PLANNER_SESSION_REQUIRED') {
    return reply.code(409).send({
      ok: false,
      error: {
        code: 'PLANNER_SESSION_REQUIRED',
        message: 'No active planner session found.',
      },
    });
  }

  if (error === 'PLANNER_OUTLINE_LOCKED') {
    return reply.code(409).send({
      ok: false,
      error: {
        code: 'PLANNER_OUTLINE_LOCKED',
        message: 'Outline versions can no longer be switched after refinement has started.',
      },
    });
  }

  if (error === 'PLANNER_OUTLINE_ALREADY_CONFIRMED') {
    return reply.code(409).send({
      ok: false,
      error: {
        code: 'PLANNER_OUTLINE_ALREADY_CONFIRMED',
        message: 'Outline has already advanced into refinement.',
      },
    });
  }

  return reply.code(404).send({
    ok: false,
    error: {
      code: 'PLANNER_OUTLINE_NOT_FOUND',
      message: 'Planner outline version not found.',
    },
  });
}

export async function registerPlannerOutlineVersionRoutes(app: FastifyInstance) {
  app.post('/api/projects/:projectId/planner/outline-versions/:versionId/activate', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = paramsSchema.safeParse(request.params);
    const payload = payloadSchema.safeParse(request.body);
    if (!params.success || !payload.success) {
      return sendInvalidArgument(
        reply,
        'Invalid planner outline activation payload.',
        payload.success ? undefined : payload.error.flatten(),
      );
    }

    const result = await activatePlannerOutlineVersion({
      projectId: params.data.projectId,
      episodeId: payload.data.episodeId,
      userId: user.id,
      versionId: params.data.versionId,
    });

    if (!result.ok) {
      return sendOutlineVersionError(reply, result.error);
    }

    return reply.send({
      ok: true,
      data: result.data,
    });
  });

  app.post('/api/projects/:projectId/planner/outline-versions/:versionId/confirm', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = paramsSchema.safeParse(request.params);
    const payload = payloadSchema.safeParse(request.body);
    if (!params.success || !payload.success) {
      return sendInvalidArgument(
        reply,
        'Invalid planner outline confirmation payload.',
        payload.success ? undefined : payload.error.flatten(),
      );
    }

    const result = await confirmPlannerOutlineVersion({
      projectId: params.data.projectId,
      episodeId: payload.data.episodeId,
      userId: user.id,
      versionId: params.data.versionId,
    });

    if (!result.ok) {
      return sendOutlineVersionError(reply, result.error);
    }

    return reply.send({
      ok: true,
      data: result.data,
    });
  });
}
