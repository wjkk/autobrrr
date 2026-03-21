import type { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

import { mapRun } from '../lib/api-mappers.js';
import { conflict, notFound, parseOrThrow } from '../lib/app-error.js';
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

function assertPublishableShots(shots: Array<{ activeVersion: { status: string } | null }>) {
  const publishableShots = shots.filter((shot) => shot.activeVersion?.status === 'ACTIVE');
  if (shots.length === 0 || publishableShots.length !== shots.length) {
    throw conflict('All shots must have an active version before publish.', 'PUBLISH_NOT_READY');
  }
}

export async function registerPublishCommandRoutes(app: FastifyInstance) {
  app.post('/api/projects/:projectId/publish/submit', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = parseOrThrow(paramsSchema, request.params, 'Invalid publish payload.');
    const payload = parseOrThrow(payloadSchema, request.body, 'Invalid publish payload.');

    const episode = await findOwnedEpisode(params.projectId, payload.episodeId, user.id);
    if (!episode) {
      throw notFound('Episode not found.');
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

    assertPublishableShots(shots);

    const result = await prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id: episode.project.id },
        data: {
          title: payload.title,
          brief: payload.intro,
          status: 'PUBLISHED',
        },
      });

      await tx.episode.update({
        where: { id: episode.id },
        data: {
          title: payload.title,
          summary: payload.intro,
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
          idempotencyKey: payload.idempotencyKey ?? null,
          inputJson: serializeRunInput({
            title: payload.title,
            intro: payload.intro,
            script: payload.script,
            tag: payload.tag,
            sourceHistoryId: payload.sourceHistoryId ?? null,
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

export const __testables = {
  assertPublishableShots,
};
