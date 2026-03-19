import type { FastifyInstance } from 'fastify';

import { requireUser } from '../lib/auth.js';
import {
  getPlannerSceneRecommendations,
  updatePlannerScene,
  updatePlannerSceneAssets,
} from '../lib/planner/refinement/entity-service.js';
import {
  assetBindingPayloadSchema,
  sceneParamsSchema,
  scenePayloadSchema,
  scopedPayloadSchema,
  sendInvalidArgument,
  sendPlannerRefinementEntityError,
} from './planner-refinement-entity-route-shared.js';

export async function registerPlannerRefinementSceneRoutes(app: FastifyInstance) {
  app.patch('/api/projects/:projectId/planner/scenes/:sceneId', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = sceneParamsSchema.safeParse(request.params);
    const payload = scenePayloadSchema.safeParse(request.body);
    if (!params.success || !payload.success) {
      return sendInvalidArgument(
        reply,
        'Invalid planner scene payload.',
        payload.success ? undefined : payload.error.flatten(),
      );
    }

    const result = await updatePlannerScene({
      projectId: params.data.projectId,
      sceneId: params.data.sceneId,
      episodeId: payload.data.episodeId,
      userId: user.id,
      patch: {
        name: payload.data.name,
        time: payload.data.time,
        description: payload.data.description,
        prompt: payload.data.prompt,
        negativePrompt: payload.data.negativePrompt,
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

  app.put('/api/projects/:projectId/planner/scenes/:sceneId/assets', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = sceneParamsSchema.safeParse(request.params);
    const payload = assetBindingPayloadSchema.safeParse(request.body);
    if (!params.success || !payload.success) {
      return sendInvalidArgument(
        reply,
        'Invalid planner scene asset payload.',
        payload.success ? undefined : payload.error.flatten(),
      );
    }

    const result = await updatePlannerSceneAssets({
      projectId: params.data.projectId,
      sceneId: params.data.sceneId,
      episodeId: payload.data.episodeId,
      userId: user.id,
      referenceAssetIds: payload.data.referenceAssetIds,
      generatedAssetIds: payload.data.generatedAssetIds,
    });

    if (!result.ok) {
      return sendPlannerRefinementEntityError({
        reply,
        error: result.error,
        assetLabel: 'scene',
      });
    }

    return reply.send({
      ok: true,
      data: result.data,
    });
  });

  app.get('/api/projects/:projectId/planner/scenes/:sceneId/recommendations', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = sceneParamsSchema.safeParse(request.params);
    const payload = scopedPayloadSchema.safeParse(request.query);
    if (!params.success || !payload.success) {
      return sendInvalidArgument(
        reply,
        'Invalid planner scene recommendation request.',
        payload.success ? undefined : payload.error.flatten(),
      );
    }

    const result = await getPlannerSceneRecommendations({
      projectId: params.data.projectId,
      sceneId: params.data.sceneId,
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
