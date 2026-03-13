import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { mapShot } from '../lib/api-mappers.js';
import { requireUser } from '../lib/auth.js';
import { findOwnedEpisode } from '../lib/ownership.js';
import { prisma } from '../lib/prisma.js';

const projectParamsSchema = z.object({
  projectId: z.string().min(1),
});

const createShotSchema = z.object({
  episodeId: z.string().min(1),
  title: z.string().trim().min(1).max(255),
  subtitleText: z.string().trim().max(5000).optional().default(''),
  narrationText: z.string().trim().max(5000).optional().default(''),
  imagePrompt: z.string().trim().max(10000).optional().default(''),
  motionPrompt: z.string().trim().max(10000).optional().default(''),
});

export async function registerShotRoutes(app: FastifyInstance) {
  app.post('/api/projects/:projectId/shots', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = projectParamsSchema.safeParse(request.params);
    const payload = createShotSchema.safeParse(request.body);
    if (!params.success || !payload.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid shot payload.',
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

    const maxSequence = await prisma.shot.aggregate({
      where: { episodeId: episode.id },
      _max: { sequenceNo: true },
    });

    const shot = await prisma.shot.create({
      data: {
        projectId: episode.project.id,
        episodeId: episode.id,
        sequenceNo: (maxSequence._max.sequenceNo ?? 0) + 1,
        title: payload.data.title,
        subtitleText: payload.data.subtitleText,
        narrationText: payload.data.narrationText,
        imagePrompt: payload.data.imagePrompt,
        motionPrompt: payload.data.motionPrompt,
        status: 'PENDING',
      },
      include: {
        activeVersion: {
          select: {
            id: true,
            label: true,
            mediaKind: true,
            status: true,
          },
        },
      },
    });

    return reply.code(201).send({
      ok: true,
      data: mapShot(shot),
    });
  });
}
