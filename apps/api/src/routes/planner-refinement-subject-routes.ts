import type { FastifyInstance } from 'fastify';

import { requireUser } from '../lib/auth.js';
import {
  getPlannerSubjectRecommendations,
  updatePlannerSubject,
  updatePlannerSubjectAssets,
} from '../lib/planner/refinement/entity-service.js';
import {
  assetBindingPayloadSchema,
  scopedPayloadSchema,
  sendInvalidArgument,
  sendPlannerRefinementEntityError,
  subjectParamsSchema,
  subjectPayloadSchema,
} from './planner-refinement-entity-route-shared.js';

export async function registerPlannerRefinementSubjectRoutes(app: FastifyInstance) {
  app.patch('/api/projects/:projectId/planner/subjects/:subjectId', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = subjectParamsSchema.safeParse(request.params);
    const payload = subjectPayloadSchema.safeParse(request.body);
    if (!params.success || !payload.success) {
      return sendInvalidArgument(
        reply,
        'Invalid planner subject payload.',
        payload.success ? undefined : payload.error.flatten(),
      );
    }

    const result = await updatePlannerSubject({
      projectId: params.data.projectId,
      subjectId: params.data.subjectId,
      episodeId: payload.data.episodeId,
      userId: user.id,
      patch: {
        name: payload.data.name,
        role: payload.data.role,
        appearance: payload.data.appearance,
        personality: payload.data.personality,
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

  app.put('/api/projects/:projectId/planner/subjects/:subjectId/assets', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = subjectParamsSchema.safeParse(request.params);
    const payload = assetBindingPayloadSchema.safeParse(request.body);
    if (!params.success || !payload.success) {
      return sendInvalidArgument(
        reply,
        'Invalid planner subject asset payload.',
        payload.success ? undefined : payload.error.flatten(),
      );
    }

    const result = await updatePlannerSubjectAssets({
      projectId: params.data.projectId,
      subjectId: params.data.subjectId,
      episodeId: payload.data.episodeId,
      userId: user.id,
      referenceAssetIds: payload.data.referenceAssetIds,
      generatedAssetIds: payload.data.generatedAssetIds,
    });

    if (!result.ok) {
      return sendPlannerRefinementEntityError({
        reply,
        error: result.error,
        assetLabel: 'subject',
      });
    }

    return reply.send({
      ok: true,
      data: result.data,
    });
  });

  app.get('/api/projects/:projectId/planner/subjects/:subjectId/recommendations', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = subjectParamsSchema.safeParse(request.params);
    const payload = scopedPayloadSchema.safeParse(request.query);
    if (!params.success || !payload.success) {
      return sendInvalidArgument(
        reply,
        'Invalid planner subject recommendation request.',
        payload.success ? undefined : payload.error.flatten(),
      );
    }

    const result = await getPlannerSubjectRecommendations({
      projectId: params.data.projectId,
      subjectId: params.data.subjectId,
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
