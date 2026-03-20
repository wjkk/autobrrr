import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { requireUser } from '../lib/auth.js';
import { debugCompareSchema, debugRunListQuerySchema, debugRunSchema } from '../lib/planner/debug/contract.js';
import {
  applyPlannerDebugRunToMainFlow,
  comparePlannerDebugRuns,
  executePlannerDebugRun,
  getPlannerDebugRunDetail,
  listPlannerDebugRuns,
  replayPlannerDebugRun,
} from '../lib/planner/debug/service.js';
import { registerPlannerDebugSubAgentRoutes } from './planner-debug-sub-agents.js';

export async function registerPlannerDebugRoutes(app: FastifyInstance) {
  await registerPlannerDebugSubAgentRoutes(app);

  app.get('/api/planner/debug/runs', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const query = debugRunListQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid planner debug run query.',
          details: query.error.flatten(),
        },
      });
    }

    return reply.send({
      ok: true,
      data: await listPlannerDebugRuns(user.id, query.data),
    });
  });

  app.get('/api/planner/debug/runs/:id', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = z.object({ id: z.string().min(1) }).safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid planner debug run id.',
        },
      });
    }

    const run = await getPlannerDebugRunDetail(user.id, params.data.id);
    if (!run) {
      return reply.code(404).send({
        ok: false,
        error: {
          code: 'PLANNER_DEBUG_RUN_NOT_FOUND',
          message: 'Planner debug run not found.',
        },
      });
    }

    return reply.send({
      ok: true,
      data: run,
    });
  });

  app.post('/api/planner/debug/runs/:id/replay', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = z.object({ id: z.string().min(1) }).safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid planner debug replay run id.',
        },
      });
    }

    try {
      const result = await replayPlannerDebugRun(user.id, params.data.id);
      if (!result) {
        return reply.code(404).send({
          ok: false,
          error: {
            code: 'PLANNER_DEBUG_RUN_NOT_FOUND',
            message: 'Planner debug run not found.',
          },
        });
      }

      return reply.send({
        ok: true,
        data: result,
      });
    } catch (error) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'PLANNER_DEBUG_REPLAY_FAILED',
          message: error instanceof Error ? error.message : 'Planner debug replay failed.',
        },
      });
    }
  });

  app.post('/api/planner/debug/runs/:id/apply', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = z.object({ id: z.string().min(1) }).safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid planner debug apply run id.',
        },
      });
    }

    try {
      const result = await applyPlannerDebugRunToMainFlow(user.id, params.data.id);
      if (!result) {
        return reply.code(404).send({
          ok: false,
          error: {
            code: 'PLANNER_DEBUG_RUN_NOT_FOUND',
            message: 'Planner debug run not found.',
          },
        });
      }

      return reply.send({
        ok: true,
        data: result,
      });
    } catch (error) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'PLANNER_DEBUG_APPLY_FAILED',
          message: error instanceof Error ? error.message : 'Planner debug apply failed.',
        },
      });
    }
  });

  app.post('/api/planner/debug/run', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const payload = debugRunSchema.safeParse(request.body);
    if (!payload.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid planner debug payload.',
          details: payload.error.flatten(),
        },
      });
    }

    try {
      const result = await executePlannerDebugRun({
        userId: user.id,
        ...payload.data,
      });

      return reply.send({
        ok: true,
        data: result,
      });
    } catch (error) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'PLANNER_DEBUG_RUN_FAILED',
          message: error instanceof Error ? error.message : '调试运行失败。',
        },
      });
    }
  });

  app.post('/api/planner/debug/compare', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const payload = debugCompareSchema.safeParse(request.body);
    if (!payload.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid planner debug compare payload.',
          details: payload.error.flatten(),
        },
      });
    }

    try {
      const result = await comparePlannerDebugRuns(user.id, payload.data);
      if (!result) {
        return reply.code(404).send({
          ok: false,
          error: {
            code: 'PLANNER_SUB_AGENT_NOT_FOUND',
            message: 'Compare sub-agent not found.',
          },
        });
      }

      return reply.send({
        ok: true,
        data: result,
      });
    } catch (error) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'PLANNER_DEBUG_COMPARE_FAILED',
          message: error instanceof Error ? error.message : 'Planner debug compare failed.',
        },
      });
    }
  });
}
