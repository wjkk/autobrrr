import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { mapRun } from '../lib/api-mappers.js';
import { conflict, notFound, parseOrThrow } from '../lib/app-error.js';
import { requireUser } from '../lib/auth.js';
import { queuePlannerGenerateDocRun } from '../lib/planner/orchestration/run-service.js';

const paramsSchema = z.object({
  projectId: z.string().min(1),
});

const payloadSchema = z.object({
  episodeId: z.string().min(1),
  prompt: z.string().trim().min(1).max(10000).optional(),
  subtype: z.string().trim().min(1).max(64).optional(),
  modelFamily: z.string().trim().max(120).optional(),
  modelEndpoint: z.string().trim().max(120).optional(),
  targetVideoModelFamilySlug: z.string().trim().max(120).optional(),
  idempotencyKey: z.string().trim().max(191).optional(),
});

export async function registerPlannerCommandRoutes(app: FastifyInstance) {
  app.post('/api/projects/:projectId/planner/generate-doc', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = parseOrThrow(paramsSchema, request.params, 'Invalid planner generation payload.');
    const payload = parseOrThrow(payloadSchema, request.body, 'Invalid planner generation payload.');

    const result = await queuePlannerGenerateDocRun({
      projectId: params.projectId,
      episodeId: payload.episodeId,
      userId: user.id,
      prompt: payload.prompt,
      subtype: payload.subtype,
      modelFamily: payload.modelFamily,
      modelEndpoint: payload.modelEndpoint,
      targetVideoModelFamilySlug: payload.targetVideoModelFamilySlug,
      idempotencyKey: payload.idempotencyKey,
    });

    if (!result.ok) {
      if (result.error === 'NOT_FOUND') {
        throw notFound('Episode not found.');
      }

      if (result.error === 'MODEL_NOT_FOUND') {
        throw notFound('No active text model endpoint matched the selection.', 'MODEL_NOT_FOUND');
      }

      if (result.error === 'PROVIDER_NOT_CONFIGURED') {
        throw conflict(
          '请先在 /settings/providers 中为当前账号配置并启用可用的文本模型 Provider，再执行策划生成。',
          'PROVIDER_NOT_CONFIGURED',
        );
      }

      throw conflict(
        'No active planner sub-agent matched the current content type and subtype.',
        'PLANNER_AGENT_NOT_CONFIGURED',
      );
    }

    return reply.code(202).send({
      ok: true,
      data: {
        plannerSession: result.plannerSession,
        targetStage: result.targetStage,
        triggerType: result.triggerType,
        run: mapRun(result.run),
      },
    });
  });
}
