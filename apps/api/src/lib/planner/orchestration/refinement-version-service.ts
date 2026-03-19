import { Prisma, type PrismaClient } from '@prisma/client';

import { findOwnedEpisode } from '../../ownership.js';
import { prisma } from '../../prisma.js';
import {
  createPlannerRefinementDraftCopy,
  isPlannerRefinementConfirmed,
} from '../refinement/drafts.js';

type PlannerDb = Prisma.TransactionClient | PrismaClient;

interface PlannerRefinementVersionServiceDeps {
  prisma: typeof prisma;
  findOwnedEpisode: typeof findOwnedEpisode;
  createPlannerRefinementDraftCopy: typeof createPlannerRefinementDraftCopy;
}

const defaultPlannerRefinementVersionServiceDeps: PlannerRefinementVersionServiceDeps = {
  prisma,
  findOwnedEpisode,
  createPlannerRefinementDraftCopy,
};

interface PlannerRefinementVersionArgs {
  projectId: string;
  episodeId: string;
  userId: string;
  versionId: string;
}

type ActivatePlannerRefinementVersionResult =
  | {
      ok: true;
      refinementVersionId: string;
    }
  | {
      ok: false;
      error: 'NOT_FOUND' | 'PLANNER_SESSION_REQUIRED' | 'PLANNER_REFINEMENT_NOT_FOUND';
    };

type CreatePlannerRefinementDraftResult =
  | {
      ok: true;
      refinementVersionId: string;
      sourceRefinementVersionId: string;
    }
  | {
      ok: false;
      error: 'NOT_FOUND' | 'PLANNER_SESSION_REQUIRED' | 'PLANNER_REFINEMENT_NOT_FOUND' | 'PLANNER_REFINEMENT_NOT_CONFIRMED';
    };

function readStructuredDocRecord(value: Prisma.JsonValue | null) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

async function findActivePlannerSession(db: typeof prisma, projectId: string, episodeId: string) {
  return db.plannerSession.findFirst({
    where: {
      projectId,
      episodeId,
      isActive: true,
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
    },
  });
}

async function syncActivatedStructuredDoc(args: {
  db: PlannerDb;
  projectId: string;
  episodeId: string;
  plannerSessionId: string;
  structuredDoc: Record<string, unknown>;
}) {
  const projectTitle = typeof args.structuredDoc.projectTitle === 'string' ? args.structuredDoc.projectTitle : null;
  const episodeTitle = typeof args.structuredDoc.episodeTitle === 'string' ? args.structuredDoc.episodeTitle : null;
  const summaryBullets = Array.isArray(args.structuredDoc.summaryBullets)
    ? args.structuredDoc.summaryBullets.filter((item): item is string => typeof item === 'string')
    : [];

  await args.db.project.update({
    where: { id: args.projectId },
    data: {
      ...(projectTitle ? { title: projectTitle } : {}),
      ...(summaryBullets[0] ? { brief: summaryBullets[0] } : {}),
    },
  });

  await args.db.episode.update({
    where: { id: args.episodeId },
    data: {
      ...(episodeTitle ? { title: episodeTitle } : {}),
      ...(summaryBullets[0] ? { summary: summaryBullets[0] } : {}),
    },
  });

  const latestRun = await args.db.run.findFirst({
    where: {
      projectId: args.projectId,
      episodeId: args.episodeId,
      resourceType: 'planner_session',
      resourceId: args.plannerSessionId,
      runType: 'PLANNER_DOC_UPDATE',
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      outputJson: true,
    },
  });

  if (!latestRun) {
    return;
  }

  const currentOutput =
    latestRun.outputJson && typeof latestRun.outputJson === 'object' && !Array.isArray(latestRun.outputJson)
      ? (latestRun.outputJson as Record<string, unknown>)
      : {};

  await args.db.run.update({
    where: { id: latestRun.id },
    data: {
      outputJson: {
        ...currentOutput,
        structuredDoc: args.structuredDoc as Prisma.InputJsonValue,
      } as Prisma.InputJsonValue,
    },
  });
}

async function activatePlannerRefinementVersionWithDeps(
  args: PlannerRefinementVersionArgs,
  deps: PlannerRefinementVersionServiceDeps,
): Promise<ActivatePlannerRefinementVersionResult> {
  const episode = await deps.findOwnedEpisode(args.projectId, args.episodeId, args.userId);
  if (!episode) {
    return {
      ok: false,
      error: 'NOT_FOUND',
    };
  }

  const plannerSession = await findActivePlannerSession(deps.prisma, episode.project.id, episode.id);
  if (!plannerSession) {
    return {
      ok: false,
      error: 'PLANNER_SESSION_REQUIRED',
    };
  }

  const targetVersion = await deps.prisma.plannerRefinementVersion.findFirst({
    where: {
      id: args.versionId,
      plannerSessionId: plannerSession.id,
    },
    select: {
      id: true,
      plannerSessionId: true,
      structuredDocJson: true,
    },
  });

  if (!targetVersion) {
    return {
      ok: false,
      error: 'PLANNER_REFINEMENT_NOT_FOUND',
    };
  }

  const structuredDoc = readStructuredDocRecord(targetVersion.structuredDocJson);

  await deps.prisma.$transaction(async (tx) => {
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
      await syncActivatedStructuredDoc({
        db: tx,
        projectId: episode.project.id,
        episodeId: episode.id,
        plannerSessionId: plannerSession.id,
        structuredDoc,
      });
    }
  });

  return {
    ok: true,
    refinementVersionId: targetVersion.id,
  };
}

export async function activatePlannerRefinementVersion(args: PlannerRefinementVersionArgs) {
  return activatePlannerRefinementVersionWithDeps(args, defaultPlannerRefinementVersionServiceDeps);
}

async function createPlannerRefinementDraftWithDeps(
  args: PlannerRefinementVersionArgs,
  deps: PlannerRefinementVersionServiceDeps,
): Promise<CreatePlannerRefinementDraftResult> {
  const episode = await deps.findOwnedEpisode(args.projectId, args.episodeId, args.userId);
  if (!episode) {
    return {
      ok: false,
      error: 'NOT_FOUND',
    };
  }

  const plannerSession = await findActivePlannerSession(deps.prisma, episode.project.id, episode.id);
  if (!plannerSession) {
    return {
      ok: false,
      error: 'PLANNER_SESSION_REQUIRED',
    };
  }

  const sourceVersion = await deps.prisma.plannerRefinementVersion.findFirst({
    where: {
      id: args.versionId,
      plannerSessionId: plannerSession.id,
    },
    select: {
      id: true,
      plannerSessionId: true,
      agentProfileId: true,
      subAgentProfileId: true,
      sourceRunId: true,
      sourceOutlineVersionId: true,
      versionNumber: true,
      triggerType: true,
      status: true,
      instruction: true,
      assistantMessage: true,
      documentTitle: true,
      generatedText: true,
      structuredDocJson: true,
      inputSnapshotJson: true,
      modelSnapshotJson: true,
      operationsJson: true,
      isConfirmed: true,
      createdById: true,
      subjects: {
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          name: true,
          role: true,
          appearance: true,
          personality: true,
          prompt: true,
          negativePrompt: true,
          referenceAssetIdsJson: true,
          generatedAssetIdsJson: true,
          sortOrder: true,
          editable: true,
        },
      },
      scenes: {
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          name: true,
          time: true,
          locationType: true,
          description: true,
          prompt: true,
          negativePrompt: true,
          referenceAssetIdsJson: true,
          generatedAssetIdsJson: true,
          sortOrder: true,
          editable: true,
        },
      },
      shotScripts: {
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          sceneId: true,
          actKey: true,
          actTitle: true,
          shotNo: true,
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
      stepAnalysis: {
        orderBy: { sortOrder: 'asc' },
        select: {
          stepKey: true,
          title: true,
          status: true,
          detailJson: true,
          sortOrder: true,
        },
      },
    },
  });

  if (!sourceVersion) {
    return {
      ok: false,
      error: 'PLANNER_REFINEMENT_NOT_FOUND',
    };
  }

  if (!isPlannerRefinementConfirmed(sourceVersion)) {
    return {
      ok: false,
      error: 'PLANNER_REFINEMENT_NOT_CONFIRMED',
    };
  }

  const draftVersion = await deps.prisma.$transaction(async (tx) =>
    deps.createPlannerRefinementDraftCopy({
      db: tx,
      sourceVersion,
      createdById: args.userId,
    }),
  );

  return {
    ok: true,
    refinementVersionId: draftVersion.id,
    sourceRefinementVersionId: sourceVersion.id,
  };
}

export async function createPlannerRefinementDraft(args: PlannerRefinementVersionArgs) {
  return createPlannerRefinementDraftWithDeps(args, defaultPlannerRefinementVersionServiceDeps);
}

export const __testables = {
  readStructuredDocRecord,
  findActivePlannerSession,
  syncActivatedStructuredDoc,
  activatePlannerRefinementVersionWithDeps,
  createPlannerRefinementDraftWithDeps,
};
