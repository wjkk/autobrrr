import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { mapRun } from '../lib/api-mappers.js';
import { requireUser } from '../lib/auth.js';
import { findOwnedRun } from '../lib/ownership.js';
import { prisma } from '../lib/prisma.js';

const runParamsSchema = z.object({
  runId: z.string().min(1),
});

export async function registerRunRoutes(app: FastifyInstance) {
  app.get('/api/runs/:runId', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = runParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid run id.',
        },
      });
    }

    const run = await findOwnedRun(params.data.runId, user.id);
    if (!run) {
      return reply.code(404).send({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Run not found.',
        },
      });
    }

    return reply.send({
      ok: true,
      data: mapRun(run),
    });
  });

  app.post('/api/runs/:runId/cancel', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = runParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid run id.',
        },
      });
    }

    const run = await findOwnedRun(params.data.runId, user.id);
    if (!run) {
      return reply.code(404).send({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Run not found.',
        },
      });
    }

    if (run.status === 'COMPLETED' || run.status === 'FAILED' || run.status === 'CANCELED' || run.status === 'TIMED_OUT') {
      return reply.code(409).send({
        ok: false,
        error: {
          code: 'RUN_NOT_CANCELABLE',
          message: 'Run is already terminal.',
        },
      });
    }

    const canceledRun = await prisma.$transaction(async (tx) => {
      const updatedRun = await tx.run.update({
        where: { id: run.id },
        data: {
          status: 'CANCELED',
          finishedAt: new Date(),
        },
      });

      if (run.resourceType === 'shot' && run.resourceId) {
        await tx.shot.updateMany({
          where: {
            id: run.resourceId,
            status: {
              in: ['QUEUED', 'GENERATING'],
            },
          },
          data: {
            status: 'FAILED',
          },
        });
      }

      return updatedRun;
    });

    return reply.send({
      ok: true,
      data: mapRun(canceledRun),
    });
  });
}
