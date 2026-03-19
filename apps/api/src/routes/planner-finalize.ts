import type { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

import { requireUser } from '../lib/auth.js';
import { finalizePlannerRefinementToCreation } from '../lib/planner/orchestration/finalize.js';
import { resolvePlannerTargetVideoModel } from '../lib/planner/target-video-model.js';
import { findOwnedEpisode } from '../lib/ownership.js';
import { prisma } from '../lib/prisma.js';

const paramsSchema = z.object({
  projectId: z.string().min(1),
});

const payloadSchema = z.object({
  episodeId: z.string().min(1),
  targetVideoModelFamilySlug: z.string().trim().min(1).max(120).optional(),
});

function readString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

export async function registerPlannerFinalizeRoutes(app: FastifyInstance) {
  app.post('/api/projects/:projectId/planner/finalize', async (request, reply) => {
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
          message: 'Invalid planner finalize payload.',
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
        project: {
          select: {
            creationConfig: {
              select: {
                settingsJson: true,
              },
            },
          },
        },
        refinementVersions: {
          where: {
            isActive: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
          select: {
            id: true,
            status: true,
            isConfirmed: true,
            confirmedAt: true,
            shotScripts: {
              orderBy: {
                sortOrder: 'asc',
              },
              select: {
                id: true,
                sceneId: true,
                actKey: true,
                actTitle: true,
                title: true,
                durationSeconds: true,
                targetModelFamilySlug: true,
                visualDescription: true,
                composition: true,
                cameraMotion: true,
                voiceRole: true,
                dialogue: true,
                subjectBindingsJson: true,
                referenceAssetIdsJson: true,
                generatedAssetIdsJson: true,
                sortOrder: true,
              },
            },
            scenes: {
              orderBy: {
                sortOrder: 'asc',
              },
              select: {
                id: true,
                name: true,
                generatedAssetIdsJson: true,
                referenceAssetIdsJson: true,
              },
            },
            subjects: {
              orderBy: {
                sortOrder: 'asc',
              },
              select: {
                id: true,
                generatedAssetIdsJson: true,
                referenceAssetIdsJson: true,
              },
            },
          },
        },
      },
    });

    const activeRefinement = plannerSession?.refinementVersions[0] ?? null;
    if (!plannerSession || !activeRefinement) {
      return reply.code(409).send({
        ok: false,
        error: {
          code: 'PLANNER_REFINEMENT_REQUIRED',
          message: 'Finalize requires an active refinement version.',
        },
      });
    }

    if (activeRefinement.status === 'RUNNING' || activeRefinement.status === 'FAILED') {
      return reply.code(409).send({
        ok: false,
        error: {
          code: 'PLANNER_REFINEMENT_NOT_READY',
          message: 'Only draft or ready refinement versions can be finalized.',
        },
      });
    }

    if (activeRefinement.shotScripts.length === 0) {
      return reply.code(409).send({
        ok: false,
        error: {
          code: 'PLANNER_REFINEMENT_EMPTY',
          message: 'Finalize requires at least one shot script.',
        },
      });
    }

    const requestedFamilySlug =
      payload.data.targetVideoModelFamilySlug
      ?? activeRefinement.shotScripts.map((shot) => readString(shot.targetModelFamilySlug)).find(Boolean)
      ?? undefined;

    const targetVideoModel = await resolvePlannerTargetVideoModel({
      requestedFamilySlug,
      settingsJson: plannerSession.project.creationConfig?.settingsJson,
    });

    if (!targetVideoModel) {
      return reply.code(409).send({
        ok: false,
        error: {
          code: 'TARGET_VIDEO_MODEL_REQUIRED',
          message: 'Finalize requires a resolvable target video model.',
        },
      });
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        const finalized = await finalizePlannerRefinementToCreation({
          db: tx,
          projectId: episode.project.id,
          episodeId: episode.id,
          refinementVersionId: activeRefinement.id,
          targetVideoModel,
          subjects: activeRefinement.subjects,
          scenes: activeRefinement.scenes,
          shotScripts: activeRefinement.shotScripts,
        });

        await tx.plannerMessage.create({
          data: {
            plannerSessionId: plannerSession.id,
            refinementVersionId: activeRefinement.id,
            role: 'ASSISTANT',
            messageType: 'SYSTEM_TRANSITION',
            contentJson: {
              action: 'finalized_to_creation',
              refinementVersionId: activeRefinement.id,
              targetVideoModelFamilySlug: targetVideoModel.familySlug,
              finalizedShotCount: finalized.finalizedShotCount,
              finalizedAt: finalized.finalizedAt,
            } satisfies Prisma.InputJsonValue,
            createdById: user.id,
          },
        });

        return finalized;
      });

      return reply.send({
        ok: true,
        data: {
          refinementVersionId: activeRefinement.id,
          targetVideoModelFamilySlug: targetVideoModel.familySlug,
          finalizedShotCount: result.finalizedShotCount,
          finalizedAt: result.finalizedAt,
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Planner finalize failed.';
      const isConflict = message.includes('generated history');
      return reply.code(isConflict ? 409 : 500).send({
        ok: false,
        error: {
          code: isConflict ? 'CREATION_SHOT_CONFLICT' : 'PLANNER_FINALIZE_FAILED',
          message,
        },
      });
    }
  });
}
