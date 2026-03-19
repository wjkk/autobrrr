import { Prisma } from '@prisma/client';

import { findOwnedEpisode } from '../../ownership.js';
import { prisma } from '../../prisma.js';
import { resolvePlannerTargetVideoModel } from '../target-video-model.js';
import { finalizePlannerRefinementToCreation } from './finalize.js';

interface PlannerFinalizeServiceDeps {
  prisma: typeof prisma;
  findOwnedEpisode: typeof findOwnedEpisode;
  resolvePlannerTargetVideoModel: typeof resolvePlannerTargetVideoModel;
  finalizePlannerRefinementToCreation: typeof finalizePlannerRefinementToCreation;
}

const defaultPlannerFinalizeServiceDeps: PlannerFinalizeServiceDeps = {
  prisma,
  findOwnedEpisode,
  resolvePlannerTargetVideoModel,
  finalizePlannerRefinementToCreation,
};

interface FinalizePlannerRefinementArgs {
  projectId: string;
  episodeId: string;
  userId: string;
  targetVideoModelFamilySlug?: string;
}

type FinalizePlannerRefinementResult =
  | {
      ok: true;
      refinementVersionId: string;
      targetVideoModelFamilySlug: string;
      finalizedShotCount: number;
      finalizedAt: string;
    }
  | {
      ok: false;
      error:
        | 'NOT_FOUND'
        | 'PLANNER_REFINEMENT_REQUIRED'
        | 'PLANNER_REFINEMENT_NOT_READY'
        | 'PLANNER_REFINEMENT_EMPTY'
        | 'TARGET_VIDEO_MODEL_REQUIRED'
        | 'CREATION_SHOT_CONFLICT'
        | 'PLANNER_FINALIZE_FAILED';
      message?: string;
    };

function readString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

async function finalizePlannerRefinementWithDeps(
  args: FinalizePlannerRefinementArgs,
  deps: PlannerFinalizeServiceDeps,
): Promise<FinalizePlannerRefinementResult> {
  const episode = await deps.findOwnedEpisode(args.projectId, args.episodeId, args.userId);
  if (!episode) {
    return {
      ok: false,
      error: 'NOT_FOUND',
    };
  }

  const plannerSession = await deps.prisma.plannerSession.findFirst({
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
    return {
      ok: false,
      error: 'PLANNER_REFINEMENT_REQUIRED',
    };
  }

  if (activeRefinement.status === 'RUNNING' || activeRefinement.status === 'FAILED') {
    return {
      ok: false,
      error: 'PLANNER_REFINEMENT_NOT_READY',
    };
  }

  if (activeRefinement.shotScripts.length === 0) {
    return {
      ok: false,
      error: 'PLANNER_REFINEMENT_EMPTY',
    };
  }

  const requestedFamilySlug =
    args.targetVideoModelFamilySlug
    ?? activeRefinement.shotScripts.map((shot) => readString(shot.targetModelFamilySlug)).find(Boolean)
    ?? undefined;

  const targetVideoModel = await deps.resolvePlannerTargetVideoModel({
    requestedFamilySlug,
    settingsJson: plannerSession.project.creationConfig?.settingsJson,
  });

  if (!targetVideoModel) {
    return {
      ok: false,
      error: 'TARGET_VIDEO_MODEL_REQUIRED',
    };
  }

  try {
    const result = await deps.prisma.$transaction(async (tx) => {
      const finalized = await deps.finalizePlannerRefinementToCreation({
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
          createdById: args.userId,
        },
      });

      return finalized;
    });

    return {
      ok: true,
      refinementVersionId: activeRefinement.id,
      targetVideoModelFamilySlug: targetVideoModel.familySlug,
      finalizedShotCount: result.finalizedShotCount,
      finalizedAt: result.finalizedAt,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Planner finalize failed.';
    const isConflict = message.includes('generated history');

    return {
      ok: false,
      error: isConflict ? 'CREATION_SHOT_CONFLICT' : 'PLANNER_FINALIZE_FAILED',
      message,
    };
  }
}

export async function finalizePlannerRefinement(args: FinalizePlannerRefinementArgs) {
  return finalizePlannerRefinementWithDeps(args, defaultPlannerFinalizeServiceDeps);
}

export const __testables = {
  readString,
  finalizePlannerRefinementWithDeps,
};
