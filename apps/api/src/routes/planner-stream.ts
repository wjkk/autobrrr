import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { requireUser } from '../lib/auth.js';
import { findOwnedEpisode } from '../lib/ownership.js';
import { buildPlannerStreamSnapshot } from '../lib/planner/stream/snapshot-service.js';

const paramsSchema = z.object({
  projectId: z.string().min(1),
});

const querySchema = z.object({
  episodeId: z.string().min(1),
  runId: z.string().min(1).optional(),
});

export async function registerPlannerStreamRoutes(app: FastifyInstance) {
  app.get('/api/projects/:projectId/planner/stream', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = paramsSchema.safeParse(request.params);
    const query = querySchema.safeParse(request.query);
    if (!params.success || !query.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid planner stream request.',
        },
      });
    }

    const episode = await findOwnedEpisode(params.data.projectId, query.data.episodeId, user.id);
    if (!episode) {
      return reply.code(404).send({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Planner stream workspace not found.',
        },
      });
    }

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    });
    reply.raw.flushHeaders?.();

    let closed = false;
    let previousPayload = '';

    const writeEvent = async () => {
      const snapshot = await buildPlannerStreamSnapshot({
        projectId: episode.project.id,
        episodeId: episode.id,
        runId: query.data.runId,
      });
      const serialized = JSON.stringify(snapshot);
      if (serialized !== previousPayload) {
        reply.raw.write(`event: planner_state\n`);
        reply.raw.write(`data: ${serialized}\n\n`);
        previousPayload = serialized;
      }

      if (snapshot.terminal) {
        reply.raw.end();
        closed = true;
      }
    };

    const interval = setInterval(() => {
      if (closed) {
        return;
      }

      void writeEvent().catch(() => {
        if (!closed) {
          reply.raw.end();
          closed = true;
        }
      });
    }, 1000);

    const timeout = setTimeout(() => {
      if (!closed) {
        reply.raw.end();
        closed = true;
      }
    }, 90_000);

    request.raw.on('close', () => {
      closed = true;
      clearInterval(interval);
      clearTimeout(timeout);
    });

    await writeEvent();
    return reply;
  });
}
