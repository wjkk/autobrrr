import type { FastifyInstance } from 'fastify';

import { requireUser } from '../lib/auth.js';
import {
  deletePlannerShot,
  updatePlannerShot,
} from '../lib/planner/refinement/entity-service.js';
import {
  scopedPayloadSchema,
  sendInvalidArgument,
  sendPlannerRefinementEntityError,
  shotParamsSchema,
  shotPayloadSchema,
} from './planner-refinement-entity-route-shared.js';

export async function registerPlannerRefinementShotRoutes(app: FastifyInstance) {
  app.patch('/api/projects/:projectId/planner/shot-scripts/:shotScriptId', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = shotParamsSchema.safeParse(request.params);
    const payload = shotPayloadSchema.safeParse(request.body);
    if (!params.success || !payload.success) {
      return sendInvalidArgument(
        reply,
        'Invalid planner shot payload.',
        payload.success ? undefined : payload.error.flatten(),
      );
    }

    const result = await updatePlannerShot({
      projectId: params.data.projectId,
      shotScriptId: params.data.shotScriptId,
      episodeId: payload.data.episodeId,
      userId: user.id,
      patch: {
        title: payload.data.title,
        visualDescription: payload.data.visualDescription,
        composition: payload.data.composition,
        cameraMotion: payload.data.cameraMotion,
        voiceRole: payload.data.voiceRole,
        dialogue: payload.data.dialogue,
      },
    });

    if (!result.ok) {
      return sendPlannerRefinementEntityError({
        reply,
        error: result.error,
      });
    }

    return reply.send({
      ok: true,
      data: result.data,
    });
  });

  app.delete('/api/projects/:projectId/planner/shot-scripts/:shotScriptId', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = shotParamsSchema.safeParse(request.params);
    const payload = scopedPayloadSchema.safeParse(request.query);
    if (!params.success || !payload.success) {
      return sendInvalidArgument(
        reply,
        'Invalid planner shot delete payload.',
        payload.success ? undefined : payload.error.flatten(),
      );
    }

    const result = await deletePlannerShot({
      projectId: params.data.projectId,
      shotScriptId: params.data.shotScriptId,
      episodeId: payload.data.episodeId,
      userId: user.id,
    });

    if (!result.ok) {
      return sendPlannerRefinementEntityError({
        reply,
        error: result.error,
      });
    }

    return reply.send({
      ok: true,
      data: result.data,
    });
  });
}
