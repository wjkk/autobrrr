import type { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

import { requireUser } from '../lib/auth.js';
import { findOwnedEpisode } from '../lib/ownership.js';
import { prisma } from '../lib/prisma.js';

const paramsSchema = z.object({
  projectId: z.string().min(1),
  versionId: z.string().min(1),
});

const payloadSchema = z.object({
  episodeId: z.string().min(1),
});

export async function registerPlannerRefinementVersionRoutes(app: FastifyInstance) {
  app.post('/api/projects/:projectId/planner/refinement-versions/:versionId/activate', async (request, reply) => {
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
          message: 'Invalid planner refinement activation payload.',
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

    const plannerSession = await prisma.plannerSession.findFirst({
      where: {
        projectId: episode.project.id,
        episodeId: episode.id,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
      },
    });

    if (!plannerSession) {
      return reply.code(409).send({
        ok: false,
        error: {
          code: 'PLANNER_SESSION_REQUIRED',
          message: 'No active planner session found.',
        },
      });
    }

    const targetVersion = await prisma.plannerRefinementVersion.findFirst({
      where: {
        id: params.data.versionId,
        plannerSessionId: plannerSession.id,
      },
      select: {
        id: true,
        plannerSessionId: true,
        structuredDocJson: true,
      },
    });

    if (!targetVersion) {
      return reply.code(404).send({
        ok: false,
        error: {
          code: 'PLANNER_REFINEMENT_NOT_FOUND',
          message: 'Planner refinement version not found.',
        },
      });
    }

    const structuredDoc =
      targetVersion.structuredDocJson && typeof targetVersion.structuredDocJson === 'object' && !Array.isArray(targetVersion.structuredDocJson)
        ? (targetVersion.structuredDocJson as Record<string, unknown>)
        : null;

    await prisma.$transaction(async (tx) => {
      await tx.plannerRefinementVersion.updateMany({
        where: {
          plannerSessionId: plannerSession.id,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });

      await tx.plannerRefinementVersion.update({
        where: { id: targetVersion.id },
        data: {
          isActive: true,
          updatedAt: new Date(),
        },
      });

      if (structuredDoc) {
        const projectTitle = typeof structuredDoc.projectTitle === 'string' ? structuredDoc.projectTitle : null;
        const episodeTitle = typeof structuredDoc.episodeTitle === 'string' ? structuredDoc.episodeTitle : null;
        const summaryBullets = Array.isArray(structuredDoc.summaryBullets)
          ? structuredDoc.summaryBullets.filter((item): item is string => typeof item === 'string')
          : [];

        await tx.project.update({
          where: { id: episode.project.id },
          data: {
            ...(projectTitle ? { title: projectTitle } : {}),
            ...(summaryBullets[0] ? { brief: summaryBullets[0] } : {}),
          },
        });

        await tx.episode.update({
          where: { id: episode.id },
          data: {
            ...(episodeTitle ? { title: episodeTitle } : {}),
            ...(summaryBullets[0] ? { summary: summaryBullets[0] } : {}),
          },
        });

        const latestRun = await tx.run.findFirst({
          where: {
            projectId: episode.project.id,
            episodeId: episode.id,
            resourceType: 'planner_session',
            resourceId: plannerSession.id,
            runType: 'PLANNER_DOC_UPDATE',
          },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            outputJson: true,
          },
        });

        if (latestRun) {
          const currentOutput =
            latestRun.outputJson && typeof latestRun.outputJson === 'object' && !Array.isArray(latestRun.outputJson)
              ? (latestRun.outputJson as Record<string, unknown>)
              : {};

          await tx.run.update({
            where: { id: latestRun.id },
            data: {
              outputJson: {
                ...currentOutput,
                structuredDoc: structuredDoc as Prisma.InputJsonValue,
              } as Prisma.InputJsonValue,
            },
          });
        }
      }
    });

    return reply.send({
      ok: true,
      data: {
        refinementVersionId: targetVersion.id,
      },
    });
  });
}
