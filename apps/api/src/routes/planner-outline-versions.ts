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

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function toOutlinePreview(value: Prisma.JsonValue | null) {
  const outlineDoc = readObject(value);
  const projectTitle = typeof outlineDoc.projectTitle === 'string' ? outlineDoc.projectTitle : null;
  const premise = typeof outlineDoc.premise === 'string' ? outlineDoc.premise : null;
  const storyArc = Array.isArray(outlineDoc.storyArc) ? outlineDoc.storyArc : [];
  const firstArc = storyArc[0] && typeof storyArc[0] === 'object' && !Array.isArray(storyArc[0])
    ? (storyArc[0] as Record<string, unknown>)
    : null;
  const episodeTitle = firstArc && typeof firstArc.title === 'string' ? firstArc.title : null;
  const episodeSummary = firstArc && typeof firstArc.summary === 'string' ? firstArc.summary : null;

  return {
    projectTitle,
    premise,
    episodeTitle,
    episodeSummary,
    outlineDoc,
  };
}

async function findPlannerContext(projectId: string, episodeId: string, userId: string) {
  const episode = await findOwnedEpisode(projectId, episodeId, userId);
  if (!episode) {
    return { episode: null, plannerSession: null, refinementCount: 0 };
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
      outlineConfirmedAt: true,
    },
  });

  const refinementCount = plannerSession
    ? await prisma.plannerRefinementVersion.count({
        where: {
          plannerSessionId: plannerSession.id,
        },
      })
    : 0;

  return {
    episode,
    plannerSession,
    refinementCount,
  };
}

export async function registerPlannerOutlineVersionRoutes(app: FastifyInstance) {
  app.post('/api/projects/:projectId/planner/outline-versions/:versionId/activate', async (request, reply) => {
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
          message: 'Invalid planner outline activation payload.',
          details: payload.success ? undefined : payload.error.flatten(),
        },
      });
    }

    const { episode, plannerSession, refinementCount } = await findPlannerContext(
      params.data.projectId,
      payload.data.episodeId,
      user.id,
    );
    if (!episode) {
      return reply.code(404).send({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Episode not found.',
        },
      });
    }

    if (!plannerSession) {
      return reply.code(409).send({
        ok: false,
        error: {
          code: 'PLANNER_SESSION_REQUIRED',
          message: 'No active planner session found.',
        },
      });
    }

    if (refinementCount > 0) {
      return reply.code(409).send({
        ok: false,
        error: {
          code: 'PLANNER_OUTLINE_LOCKED',
          message: 'Outline versions can no longer be switched after refinement has started.',
        },
      });
    }

    const targetVersion = await prisma.plannerOutlineVersion.findFirst({
      where: {
        id: params.data.versionId,
        plannerSessionId: plannerSession.id,
      },
      select: {
        id: true,
        isConfirmed: true,
        confirmedAt: true,
        outlineDocJson: true,
      },
    });

    if (!targetVersion) {
      return reply.code(404).send({
        ok: false,
        error: {
          code: 'PLANNER_OUTLINE_NOT_FOUND',
          message: 'Planner outline version not found.',
        },
      });
    }

    const preview = toOutlinePreview(targetVersion.outlineDocJson);

    await prisma.$transaction(async (tx) => {
      await tx.plannerOutlineVersion.updateMany({
        where: {
          plannerSessionId: plannerSession.id,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });

      await tx.plannerOutlineVersion.update({
        where: { id: targetVersion.id },
        data: {
          isActive: true,
          ...(targetVersion.isConfirmed && !targetVersion.confirmedAt ? { confirmedAt: new Date() } : {}),
          updatedAt: new Date(),
        },
      });

      await tx.plannerSession.update({
        where: { id: plannerSession.id },
        data: {
          outlineConfirmedAt: targetVersion.isConfirmed ? (targetVersion.confirmedAt ?? new Date()) : null,
          status: 'READY',
        },
      });

      await tx.project.update({
        where: { id: episode.project.id },
        data: {
          ...(preview.projectTitle ? { title: preview.projectTitle } : {}),
          ...(preview.premise ? { brief: preview.premise } : {}),
        },
      });

      await tx.episode.update({
        where: { id: episode.id },
        data: {
          ...(preview.episodeTitle ? { title: preview.episodeTitle } : {}),
          ...(preview.episodeSummary ? { summary: preview.episodeSummary } : {}),
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
        const currentOutput = readObject(latestRun.outputJson);
        await tx.run.update({
          where: { id: latestRun.id },
          data: {
            outputJson: {
              ...currentOutput,
              targetStage: targetVersion.isConfirmed ? 'refinement' : 'outline',
              outlineDoc: preview.outlineDoc as Prisma.InputJsonValue,
              outlineVersionId: targetVersion.id,
            } satisfies Prisma.InputJsonValue,
          },
        });
      }
    });

    return reply.send({
      ok: true,
      data: {
        outlineVersionId: targetVersion.id,
        isConfirmed: targetVersion.isConfirmed,
        confirmedAt: targetVersion.confirmedAt?.toISOString() ?? null,
      },
    });
  });

  app.post('/api/projects/:projectId/planner/outline-versions/:versionId/confirm', async (request, reply) => {
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
          message: 'Invalid planner outline confirmation payload.',
          details: payload.success ? undefined : payload.error.flatten(),
        },
      });
    }

    const { episode, plannerSession, refinementCount } = await findPlannerContext(
      params.data.projectId,
      payload.data.episodeId,
      user.id,
    );
    if (!episode) {
      return reply.code(404).send({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Episode not found.',
        },
      });
    }

    if (!plannerSession) {
      return reply.code(409).send({
        ok: false,
        error: {
          code: 'PLANNER_SESSION_REQUIRED',
          message: 'No active planner session found.',
        },
      });
    }

    if (refinementCount > 0) {
      return reply.code(409).send({
        ok: false,
        error: {
          code: 'PLANNER_OUTLINE_ALREADY_CONFIRMED',
          message: 'Outline has already advanced into refinement.',
        },
      });
    }

    const targetVersion = await prisma.plannerOutlineVersion.findFirst({
      where: {
        id: params.data.versionId,
        plannerSessionId: plannerSession.id,
      },
      select: {
        id: true,
        outlineDocJson: true,
      },
    });

    if (!targetVersion) {
      return reply.code(404).send({
        ok: false,
        error: {
          code: 'PLANNER_OUTLINE_NOT_FOUND',
          message: 'Planner outline version not found.',
        },
      });
    }

    const confirmedAt = new Date();
    const preview = toOutlinePreview(targetVersion.outlineDocJson);

    await prisma.$transaction(async (tx) => {
      await tx.plannerOutlineVersion.updateMany({
        where: {
          plannerSessionId: plannerSession.id,
        },
        data: {
          isActive: false,
        },
      });

      await tx.plannerOutlineVersion.update({
        where: { id: targetVersion.id },
        data: {
          isActive: true,
          isConfirmed: true,
          confirmedAt,
          updatedAt: confirmedAt,
        },
      });

      await tx.plannerSession.update({
        where: { id: plannerSession.id },
        data: {
          outlineConfirmedAt: confirmedAt,
          status: 'READY',
        },
      });

      await tx.plannerMessage.create({
        data: {
          plannerSessionId: plannerSession.id,
          outlineVersionId: targetVersion.id,
          role: 'ASSISTANT',
          messageType: 'SYSTEM_TRANSITION',
          contentJson: {
            text: '已确认当前大纲，下一步可继续细化剧情内容。',
            transition: 'outline_confirmed',
          } satisfies Prisma.InputJsonValue,
          createdById: user.id,
        },
      });

      await tx.project.update({
        where: { id: episode.project.id },
        data: {
          ...(preview.projectTitle ? { title: preview.projectTitle } : {}),
          ...(preview.premise ? { brief: preview.premise } : {}),
        },
      });

      await tx.episode.update({
        where: { id: episode.id },
        data: {
          ...(preview.episodeTitle ? { title: preview.episodeTitle } : {}),
          ...(preview.episodeSummary ? { summary: preview.episodeSummary } : {}),
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
        const currentOutput = readObject(latestRun.outputJson);
        await tx.run.update({
          where: { id: latestRun.id },
          data: {
            outputJson: {
              ...currentOutput,
              targetStage: 'refinement',
              outlineDoc: preview.outlineDoc as Prisma.InputJsonValue,
              outlineVersionId: targetVersion.id,
            } satisfies Prisma.InputJsonValue,
          },
        });
      }
    });

    return reply.send({
      ok: true,
      data: {
        outlineVersionId: targetVersion.id,
        isConfirmed: true,
        confirmedAt: confirmedAt.toISOString(),
      },
    });
  });
}
