import type { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

import { mapRun } from '../lib/api-mappers.js';
import { requireUser } from '../lib/auth.js';
import { findOwnedEpisode } from '../lib/ownership.js';
import { prisma } from '../lib/prisma.js';
import { serializeRunInput } from '../lib/run-input.js';

const paramsSchema = z.object({
  projectId: z.string().min(1),
});

const payloadSchema = z.object({
  episodeId: z.string().min(1),
  title: z.string().trim().min(1).max(255),
  intro: z.string().trim().min(1).max(5000),
  script: z.string().trim().max(20000).optional().default(''),
  tag: z.string().trim().max(120).optional().default(''),
  sourceHistoryId: z.string().trim().min(1).nullable().optional(),
  idempotencyKey: z.string().trim().max(191).optional(),
});

export async function registerPublishCommandRoutes(app: FastifyInstance) {
  app.post('/api/projects/:projectId/publish/submit', async (request, reply) => {
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
          message: 'Invalid publish payload.',
          details: payload.success ? undefined : payload.error.flatten(),
        },
      });
    }

    const episode = await findOwnedEpisode(params.data.projectId, payload.data.episodeId, user.id);
    if (!episode) {
      return reply.code(404).send({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Episode not found.',
        },
      });
    }

    const shots = await prisma.shot.findMany({
      where: { episodeId: episode.id },
      include: {
        activeVersion: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    const publishableShots = shots.filter((shot) => shot.activeVersion?.status === 'ACTIVE');
    if (shots.length === 0 || publishableShots.length !== shots.length) {
      return reply.code(409).send({
        ok: false,
        error: {
          code: 'PUBLISH_NOT_READY',
          message: 'All shots must have an active version before publish.',
        },
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id: episode.project.id },
        data: {
          title: payload.data.title,
          brief: payload.data.intro,
          status: 'PUBLISHED',
        },
      });

      await tx.episode.update({
        where: { id: episode.id },
        data: {
          title: payload.data.title,
          summary: payload.data.intro,
          status: 'PUBLISHED',
        },
      });

      const run = await tx.run.create({
        data: {
          projectId: episode.project.id,
          episodeId: episode.id,
          runType: 'PUBLISH',
          resourceType: 'episode',
          resourceId: episode.id,
          status: 'COMPLETED',
          executorType: 'MANUAL',
          idempotencyKey: payload.data.idempotencyKey ?? null,
          inputJson: serializeRunInput({
            title: payload.data.title,
            intro: payload.data.intro,
            script: payload.data.script,
            tag: payload.data.tag,
            sourceHistoryId: payload.data.sourceHistoryId ?? null,
          }),
          outputJson: {
            published: true,
            shotCount: shots.length,
            publishedAt: new Date().toISOString(),
          } as Prisma.InputJsonValue,
          startedAt: new Date(),
          finishedAt: new Date(),
        },
      });

      return run;
    });

    return reply.send({
      ok: true,
      data: {
        run: mapRun(result),
      },
    });
  });
}
