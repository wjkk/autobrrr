import type { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

import { requireUser } from '../lib/auth.js';
import { plannerStructuredDocSchema } from '../lib/planner-doc.js';
import { findOwnedEpisode } from '../lib/ownership.js';
import { PLANNER_REFINEMENT_LOCKED_ERROR } from '../lib/planner-refinement-drafts.js';
import { syncPlannerRefinementDerivedData } from '../lib/planner-refinement-sync.js';
import { prisma } from '../lib/prisma.js';

const paramsSchema = z.object({
  projectId: z.string().min(1),
});

const payloadSchema = z.object({
  episodeId: z.string().min(1),
  structuredDoc: plannerStructuredDocSchema,
});

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export async function registerPlannerDocumentRoutes(app: FastifyInstance) {
  app.put('/api/projects/:projectId/planner/document', async (request, reply) => {
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
          message: 'Invalid planner document payload.',
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

    const latestRun = await prisma.run.findFirst({
      where: {
        projectId: episode.project.id,
        episodeId: episode.id,
        resourceType: 'planner_session',
        resourceId: plannerSession.id,
        runType: 'PLANNER_DOC_UPDATE',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestRun) {
      return reply.code(409).send({
        ok: false,
        error: {
          code: 'PLANNER_DOCUMENT_REQUIRED',
          message: 'No planner document run exists yet.',
        },
      });
    }

    const updatedRun = await prisma.$transaction(async (tx) => {
      const activeRefinement = await tx.plannerRefinementVersion.findFirst({
        where: {
          plannerSessionId: plannerSession.id,
          isActive: true,
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          structuredDocJson: true,
          isConfirmed: true,
        },
      });

      if (activeRefinement?.isConfirmed) {
        throw new Error('PLANNER_REFINEMENT_LOCKED');
      }

      await tx.project.update({
        where: { id: episode.project.id },
        data: {
          title: payload.data.structuredDoc.projectTitle,
          brief: payload.data.structuredDoc.summaryBullets[0] ?? episode.project.title,
        },
      });

      await tx.episode.update({
        where: { id: episode.id },
        data: {
          title: payload.data.structuredDoc.episodeTitle,
          summary: payload.data.structuredDoc.summaryBullets[0] ?? episode.summary,
        },
      });

      if (activeRefinement) {
        const previousProjection =
          activeRefinement.structuredDocJson && typeof activeRefinement.structuredDocJson === 'object' && !Array.isArray(activeRefinement.structuredDocJson)
            ? (activeRefinement.structuredDocJson as Record<string, unknown>)
            : null;

        await tx.plannerRefinementVersion.update({
          where: { id: activeRefinement.id },
          data: {
            documentTitle: payload.data.structuredDoc.projectTitle,
            structuredDocJson: payload.data.structuredDoc as Prisma.InputJsonValue,
            updatedAt: new Date(),
          },
        });

        await syncPlannerRefinementDerivedData({
          db: tx,
          refinementVersionId: activeRefinement.id,
          structuredDoc: payload.data.structuredDoc,
          previousProjection,
        });
      }

      return tx.run.update({
        where: { id: latestRun.id },
        data: {
          outputJson: {
            ...readObject(latestRun.outputJson),
            structuredDoc: payload.data.structuredDoc,
          } as Prisma.InputJsonValue,
          finishedAt: latestRun.finishedAt ?? new Date(),
        },
      });
    }).catch((error: unknown) => {
      if (error instanceof Error && error.message === 'PLANNER_REFINEMENT_LOCKED') {
        return null;
      }

      throw error;
    });

    if (!updatedRun) {
      return reply.code(409).send(PLANNER_REFINEMENT_LOCKED_ERROR);
    }

    return reply.send({
      ok: true,
      data: {
        runId: updatedRun.id,
        structuredDoc: payload.data.structuredDoc,
      },
    });
  });
}
