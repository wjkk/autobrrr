import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { mapRun } from '../lib/api-mappers.js';
import { requireUser } from '../lib/auth.js';
import { PLANNER_REFINEMENT_LOCKED_ERROR } from '../lib/planner/refinement/drafts.js';
import { normalizePlannerRerunScope, plannerLegacyRerunScopeSchema, plannerRerunScopeSchema } from '../lib/planner/rerun/scope.js';
import { queuePlannerPartialRerun } from '../lib/planner/rerun/service.js';

const paramsSchema = z.object({
  projectId: z.string().min(1),
});

const payloadBaseSchema = z.object({
  episodeId: z.string().min(1),
  prompt: z.string().trim().min(1).max(10000).optional(),
  modelFamily: z.string().trim().max(120).optional(),
  modelEndpoint: z.string().trim().max(120).optional(),
  targetVideoModelFamilySlug: z.string().trim().max(120).optional(),
  idempotencyKey: z.string().trim().max(191).optional(),
});

const payloadSchema = z.union([
  payloadBaseSchema.extend(plannerLegacyRerunScopeSchema.shape),
  payloadBaseSchema.extend({
    rerunScope: plannerRerunScopeSchema,
  }),
]);

export async function registerPlannerPartialRerunRoutes(app: FastifyInstance) {
  app.post('/api/projects/:projectId/planner/partial-rerun', async (request, reply) => {
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
          message: 'Invalid planner partial rerun payload.',
          details: payload.success ? undefined : payload.error.flatten(),
        },
      });
    }

    const rerunScope = normalizePlannerRerunScope(
      'rerunScope' in payload.data
        ? payload.data.rerunScope
        : {
            scope: payload.data.scope,
            targetId: payload.data.targetId,
          },
    );

    const result = await queuePlannerPartialRerun({
      projectId: params.data.projectId,
      episodeId: payload.data.episodeId,
      userId: user.id,
      rerunScope,
      prompt: payload.data.prompt,
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
            code: 'PLANNER_SESSION_NOT_FOUND',
            message: 'Planner session not found.',
          },
        });
      }

      if (result.error === 'REFINEMENT_REQUIRED') {
        return reply.code(409).send({
          ok: false,
          error: {
            code: 'PLANNER_REFINEMENT_REQUIRED',
            message: 'No active refinement document found.',
          },
        });
      }

      if (result.error === 'REFINEMENT_LOCKED') {
        return reply.code(409).send(PLANNER_REFINEMENT_LOCKED_ERROR);
      }

      if (result.error === 'SCOPE_TARGET_NOT_FOUND') {
        return reply.code(404).send({
          ok: false,
          error: {
            code: 'PLANNER_SCOPE_TARGET_NOT_FOUND',
            message: 'Target entity for partial rerun was not found.',
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
            message: '请先在 /settings/providers 中为当前账号配置并启用可用的文本模型 Provider，再执行局部重跑。',
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
        triggerType: result.triggerType,
        scope: result.triggerType,
        run: mapRun(result.run),
      },
    });
  });
}
