import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { mapRun } from '../lib/api-mappers.js';
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

    const params = paramsSchema.safeParse(request.params);
    const payload = payloadSchema.safeParse(request.body);
    if (!params.success || !payload.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid planner generation payload.',
          details: payload.success ? undefined : payload.error.flatten(),
        },
      });
    }

    const result = await queuePlannerGenerateDocRun({
      projectId: params.data.projectId,
      episodeId: payload.data.episodeId,
      userId: user.id,
      prompt: payload.data.prompt,
      subtype: payload.data.subtype,
      modelFamily: payload.data.modelFamily,
      modelEndpoint: payload.data.modelEndpoint,
      targetVideoModelFamilySlug: payload.data.targetVideoModelFamilySlug,
      idempotencyKey: payload.data.idempotencyKey,
    });

    if (!result.ok) {
      if (result.error === 'NOT_FOUND') {
        return reply.code(404).send({
          ok: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Episode not found.',
          },
        });
      }

      if (result.error === 'MODEL_NOT_FOUND') {
        return reply.code(404).send({
          ok: false,
          error: {
            code: 'MODEL_NOT_FOUND',
            message: 'No active text model endpoint matched the selection.',
          },
        });
      }

      if (result.error === 'PROVIDER_NOT_CONFIGURED') {
        return reply.code(409).send({
          ok: false,
          error: {
            code: 'PROVIDER_NOT_CONFIGURED',
            message: '请先在 /settings/providers 中为当前账号配置并启用可用的文本模型 Provider，再执行策划生成。',
          },
        });
      }

      return reply.code(409).send({
        ok: false,
        error: {
          code: 'PLANNER_AGENT_NOT_CONFIGURED',
          message: 'No active planner sub-agent matched the current content type and subtype.',
        },
      });
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
