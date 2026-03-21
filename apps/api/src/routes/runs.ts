import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { mapRun } from '../lib/api-mappers.js';
import { conflict, notFound, parseOrThrow } from '../lib/app-error.js';
import { requireUser } from '../lib/auth.js';
import { findOwnedRun } from '../lib/ownership.js';
import { prisma } from '../lib/prisma.js';

const runParamsSchema = z.object({
  runId: z.string().min(1),
});

function assertRunIsCancelable(run: { status: string }) {
  if (run.status === 'COMPLETED' || run.status === 'FAILED' || run.status === 'CANCELED' || run.status === 'TIMED_OUT') {
    throw conflict('Run is already terminal.', 'RUN_NOT_CANCELABLE');
  }
}

export async function registerRunRoutes(app: FastifyInstance) {
  app.get('/api/runs/:runId', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = parseOrThrow(runParamsSchema, request.params, 'Invalid run id.');

    const run = await findOwnedRun(params.runId, user.id);
    if (!run) {
      throw notFound('Run not found.');
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

    const params = parseOrThrow(runParamsSchema, request.params, 'Invalid run id.');

    const run = await findOwnedRun(params.runId, user.id);
    if (!run) {
      throw notFound('Run not found.');
    }

    assertRunIsCancelable(run);

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

export const __testables = {
  assertRunIsCancelable,
};
