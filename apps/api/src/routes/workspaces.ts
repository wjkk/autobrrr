import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { requireUser } from '../lib/auth.js';
import { prisma } from '../lib/prisma.js';

const workspaceParamsSchema = z.object({
  projectId: z.string().min(1),
});

const workspaceQuerySchema = z.object({
  episodeId: z.string().min(1),
});

async function requireOwnedEpisode(projectId: string, episodeId: string, userId: string) {
  return prisma.episode.findFirst({
    where: {
      id: episodeId,
      projectId,
      project: {
        createdById: userId,
      },
    },
    include: {
      project: {
        select: {
          id: true,
          title: true,
          status: true,
          contentMode: true,
          currentEpisodeId: true,
        },
      },
    },
  });
}

export async function registerWorkspaceRoutes(app: FastifyInstance) {
  app.get('/api/projects/:projectId/planner/workspace', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = workspaceParamsSchema.safeParse(request.params);
    const query = workspaceQuerySchema.safeParse(request.query);
    if (!params.success || !query.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid workspace request.',
        },
      });
    }

    const episode = await requireOwnedEpisode(params.data.projectId, query.data.episodeId, user.id);
    if (!episode) {
      return reply.code(404).send({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Workspace not found.',
        },
      });
    }

    const plannerSession = await prisma.plannerSession.findFirst({
      where: {
        episodeId: episode.id,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        outlineConfirmedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const latestPlannerRun = plannerSession
      ? await prisma.run.findFirst({
          where: {
            episodeId: episode.id,
            resourceType: 'planner_session',
            resourceId: plannerSession.id,
            runType: 'PLANNER_DOC_UPDATE',
          },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            providerStatus: true,
            outputJson: true,
            errorCode: true,
            errorMessage: true,
            createdAt: true,
            finishedAt: true,
          },
        })
      : null;

    return reply.send({
      ok: true,
      data: {
        project: {
          id: episode.project.id,
          title: episode.project.title,
          status: episode.project.status.toLowerCase(),
          contentMode: episode.project.contentMode.toLowerCase(),
          currentEpisodeId: episode.project.currentEpisodeId,
        },
        episode: {
          id: episode.id,
          episodeNo: episode.episodeNo,
          title: episode.title,
          summary: episode.summary,
          status: episode.status.toLowerCase(),
        },
        plannerSession: plannerSession
          ? {
              id: plannerSession.id,
              status: plannerSession.status.toLowerCase(),
              outlineConfirmedAt: plannerSession.outlineConfirmedAt?.toISOString() ?? null,
              createdAt: plannerSession.createdAt.toISOString(),
              updatedAt: plannerSession.updatedAt.toISOString(),
            }
          : null,
        latestPlannerRun: latestPlannerRun
          ? {
              id: latestPlannerRun.id,
              status: latestPlannerRun.status.toLowerCase(),
              providerStatus: latestPlannerRun.providerStatus,
              generatedText:
                latestPlannerRun.outputJson && typeof latestPlannerRun.outputJson === 'object' && !Array.isArray(latestPlannerRun.outputJson)
                  ? (((latestPlannerRun.outputJson as Record<string, unknown>).generatedText as string | undefined) ?? null)
                  : null,
              structuredDoc:
                latestPlannerRun.outputJson && typeof latestPlannerRun.outputJson === 'object' && !Array.isArray(latestPlannerRun.outputJson)
                  ? (((latestPlannerRun.outputJson as Record<string, unknown>).structuredDoc as Record<string, unknown> | undefined) ?? null)
                  : null,
              errorCode: latestPlannerRun.errorCode,
              errorMessage: latestPlannerRun.errorMessage,
              createdAt: latestPlannerRun.createdAt.toISOString(),
              finishedAt: latestPlannerRun.finishedAt?.toISOString() ?? null,
            }
          : null,
      },
    });
  });

  app.get('/api/projects/:projectId/creation/workspace', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = workspaceParamsSchema.safeParse(request.params);
    const query = workspaceQuerySchema.safeParse(request.query);
    if (!params.success || !query.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid workspace request.',
        },
      });
    }

    const episode = await requireOwnedEpisode(params.data.projectId, query.data.episodeId, user.id);
    if (!episode) {
      return reply.code(404).send({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Workspace not found.',
        },
      });
    }

    const shots = await prisma.shot.findMany({
      where: { episodeId: episode.id },
      orderBy: { sequenceNo: 'asc' },
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

    const runs = await prisma.run.findMany({
      where: {
        episodeId: episode.id,
        resourceType: 'shot',
        runType: {
          in: ['IMAGE_GENERATION', 'VIDEO_GENERATION'],
        },
      },
      include: {
        modelEndpoint: {
          select: {
            id: true,
            slug: true,
            label: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    const latestRunByShotId = new Map<string, (typeof runs)[number]>();
    for (const run of runs) {
      if (!run.resourceId || latestRunByShotId.has(run.resourceId)) {
        continue;
      }
      latestRunByShotId.set(run.resourceId, run);
    }

    return reply.send({
      ok: true,
      data: {
        project: {
          id: episode.project.id,
          title: episode.project.title,
          status: episode.project.status.toLowerCase(),
        },
        episode: {
          id: episode.id,
          episodeNo: episode.episodeNo,
          title: episode.title,
          status: episode.status.toLowerCase(),
        },
        shots: shots.map((shot) => ({
          id: shot.id,
          sequenceNo: shot.sequenceNo,
          title: shot.title,
          subtitleText: shot.subtitleText,
          narrationText: shot.narrationText,
          imagePrompt: shot.imagePrompt,
          motionPrompt: shot.motionPrompt,
          status: shot.status.toLowerCase(),
          latestGenerationRun: latestRunByShotId.get(shot.id)
            ? {
                id: latestRunByShotId.get(shot.id)?.id,
                runType: latestRunByShotId.get(shot.id)?.runType.toLowerCase(),
                status: latestRunByShotId.get(shot.id)?.status.toLowerCase(),
                modelEndpoint: latestRunByShotId.get(shot.id)?.modelEndpoint
                  ? {
                      id: latestRunByShotId.get(shot.id)?.modelEndpoint?.id,
                      slug: latestRunByShotId.get(shot.id)?.modelEndpoint?.slug,
                      label: latestRunByShotId.get(shot.id)?.modelEndpoint?.label,
                    }
                  : null,
              }
            : null,
          activeVersionId: shot.activeVersionId,
          activeVersion: shot.activeVersion
            ? {
                id: shot.activeVersion.id,
                label: shot.activeVersion.label,
                mediaKind: shot.activeVersion.mediaKind.toLowerCase(),
                status: shot.activeVersion.status.toLowerCase(),
              }
            : null,
        })),
      },
    });
  });

  app.get('/api/projects/:projectId/publish/workspace', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = workspaceParamsSchema.safeParse(request.params);
    const query = workspaceQuerySchema.safeParse(request.query);
    if (!params.success || !query.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid workspace request.',
        },
      });
    }

    const episode = await requireOwnedEpisode(params.data.projectId, query.data.episodeId, user.id);
    if (!episode) {
      return reply.code(404).send({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Workspace not found.',
        },
      });
    }

    const shots = await prisma.shot.findMany({
      where: { episodeId: episode.id },
      orderBy: { sequenceNo: 'asc' },
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

    const publishableShots = shots.filter((shot) => {
      return shot.activeVersion && shot.activeVersion.status === 'ACTIVE';
    });

    return reply.send({
      ok: true,
      data: {
        project: {
          id: episode.project.id,
          title: episode.project.title,
          status: episode.project.status.toLowerCase(),
        },
        episode: {
          id: episode.id,
          episodeNo: episode.episodeNo,
          title: episode.title,
          status: episode.status.toLowerCase(),
        },
        summary: {
          totalShots: shots.length,
          publishableShotCount: publishableShots.length,
          readyToPublish: shots.length > 0 && publishableShots.length === shots.length,
        },
        shots: shots.map((shot) => ({
          id: shot.id,
          sequenceNo: shot.sequenceNo,
          title: shot.title,
          status: shot.status.toLowerCase(),
          activeVersionId: shot.activeVersionId,
          activeVersion: shot.activeVersion
            ? {
                id: shot.activeVersion.id,
                label: shot.activeVersion.label,
                mediaKind: shot.activeVersion.mediaKind.toLowerCase(),
                status: shot.activeVersion.status.toLowerCase(),
              }
            : null,
        })),
      },
    });
  });
}
