import { Prisma } from '@prisma/client';

import { findOwnedEpisode } from '../../ownership.js';
import { prisma } from '../../prisma.js';
import { readObject, readString } from '../../json-helpers.js';

interface PlannerOutlinePreview {
  projectTitle: string | null;
  premise: string | null;
  episodeTitle: string | null;
  episodeSummary: string | null;
  outlineDoc: Record<string, unknown>;
}

type PlannerOutlineVersionError =
  | 'NOT_FOUND'
  | 'PLANNER_SESSION_REQUIRED'
  | 'PLANNER_OUTLINE_LOCKED'
  | 'PLANNER_OUTLINE_ALREADY_CONFIRMED'
  | 'PLANNER_OUTLINE_NOT_FOUND';

type PlannerOutlineVersionResult =
  | {
      ok: true;
      data: {
        outlineVersionId: string;
        isConfirmed: boolean;
        confirmedAt: string | null;
      };
    }
  | {
      ok: false;
      error: PlannerOutlineVersionError;
    };

type PlannerDb = Prisma.TransactionClient | typeof prisma;

function toOutlinePreview(value: Prisma.JsonValue | null): PlannerOutlinePreview {
  const outlineDoc = readObject(value);
  const storyArc = Array.isArray(outlineDoc.storyArc) ? outlineDoc.storyArc : [];
  const firstArc = readObject(storyArc[0]);

  return {
    projectTitle: readString(outlineDoc.projectTitle),
    premise: readString(outlineDoc.premise),
    episodeTitle: readString(firstArc.title),
    episodeSummary: readString(firstArc.summary),
    outlineDoc,
  };
}

async function findPlannerContextWithDeps(
  projectId: string,
  episodeId: string,
  userId: string,
  deps: {
    findOwnedEpisode: typeof findOwnedEpisode;
    prisma: Pick<typeof prisma, 'plannerSession' | 'plannerRefinementVersion'>;
  },
) {
  const episode = await deps.findOwnedEpisode(projectId, episodeId, userId);
  if (!episode) {
    return { episode: null, plannerSession: null, refinementCount: 0 };
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
      outlineConfirmedAt: true,
    },
  });

  const refinementCount = plannerSession
    ? await deps.prisma.plannerRefinementVersion.count({
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

async function syncOutlinePreviewToWorkspace(args: {
  tx: PlannerDb;
  projectId: string;
  episodeId: string;
  plannerSessionId: string;
  targetStage: 'outline' | 'refinement';
  outlineVersionId: string;
  preview: PlannerOutlinePreview;
}) {
  await args.tx.project.update({
    where: { id: args.projectId },
    data: {
      ...(args.preview.projectTitle ? { title: args.preview.projectTitle } : {}),
      ...(args.preview.premise ? { brief: args.preview.premise } : {}),
    },
  });

  await args.tx.episode.update({
    where: { id: args.episodeId },
    data: {
      ...(args.preview.episodeTitle ? { title: args.preview.episodeTitle } : {}),
      ...(args.preview.episodeSummary ? { summary: args.preview.episodeSummary } : {}),
    },
  });

  const latestRun = await args.tx.run.findFirst({
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

  await args.tx.run.update({
    where: { id: latestRun.id },
    data: {
      outputJson: {
        ...readObject(latestRun.outputJson),
        targetStage: args.targetStage,
        outlineDoc: args.preview.outlineDoc as Prisma.InputJsonValue,
        outlineVersionId: args.outlineVersionId,
      } satisfies Prisma.InputJsonValue,
    },
  });
}

export async function activatePlannerOutlineVersion(args: {
  projectId: string;
  episodeId: string;
  userId: string;
  versionId: string;
}): Promise<PlannerOutlineVersionResult> {
  const { episode, plannerSession, refinementCount } = await findPlannerContextWithDeps(
    args.projectId,
    args.episodeId,
    args.userId,
    {
      findOwnedEpisode,
      prisma,
    },
  );
  if (!episode) {
    return { ok: false, error: 'NOT_FOUND' };
  }

  if (!plannerSession) {
    return { ok: false, error: 'PLANNER_SESSION_REQUIRED' };
  }

  if (refinementCount > 0) {
    return { ok: false, error: 'PLANNER_OUTLINE_LOCKED' };
  }

  const targetVersion = await prisma.plannerOutlineVersion.findFirst({
    where: {
      id: args.versionId,
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
    return { ok: false, error: 'PLANNER_OUTLINE_NOT_FOUND' };
  }

  const confirmedAt = targetVersion.isConfirmed ? (targetVersion.confirmedAt ?? new Date()) : null;
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
        ...(confirmedAt ? { confirmedAt } : {}),
        updatedAt: new Date(),
      },
    });

    await tx.plannerSession.update({
      where: { id: plannerSession.id },
      data: {
        outlineConfirmedAt: confirmedAt,
        status: 'READY',
      },
    });

    await syncOutlinePreviewToWorkspace({
      tx,
      projectId: episode.project.id,
      episodeId: episode.id,
      plannerSessionId: plannerSession.id,
      targetStage: confirmedAt ? 'refinement' : 'outline',
      outlineVersionId: targetVersion.id,
      preview,
    });
  });

  return {
    ok: true,
    data: {
      outlineVersionId: targetVersion.id,
      isConfirmed: targetVersion.isConfirmed,
      confirmedAt: confirmedAt?.toISOString() ?? null,
    },
  };
}

export async function confirmPlannerOutlineVersion(args: {
  projectId: string;
  episodeId: string;
  userId: string;
  versionId: string;
}): Promise<PlannerOutlineVersionResult> {
  const { episode, plannerSession, refinementCount } = await findPlannerContextWithDeps(
    args.projectId,
    args.episodeId,
    args.userId,
    {
      findOwnedEpisode,
      prisma,
    },
  );
  if (!episode) {
    return { ok: false, error: 'NOT_FOUND' };
  }

  if (!plannerSession) {
    return { ok: false, error: 'PLANNER_SESSION_REQUIRED' };
  }

  if (refinementCount > 0) {
    return { ok: false, error: 'PLANNER_OUTLINE_ALREADY_CONFIRMED' };
  }

  const targetVersion = await prisma.plannerOutlineVersion.findFirst({
    where: {
      id: args.versionId,
      plannerSessionId: plannerSession.id,
    },
    select: {
      id: true,
      outlineDocJson: true,
    },
  });
  if (!targetVersion) {
    return { ok: false, error: 'PLANNER_OUTLINE_NOT_FOUND' };
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
        createdById: args.userId,
      },
    });

    await syncOutlinePreviewToWorkspace({
      tx,
      projectId: episode.project.id,
      episodeId: episode.id,
      plannerSessionId: plannerSession.id,
      targetStage: 'refinement',
      outlineVersionId: targetVersion.id,
      preview,
    });
  });

  return {
    ok: true,
    data: {
      outlineVersionId: targetVersion.id,
      isConfirmed: true,
      confirmedAt: confirmedAt.toISOString(),
    },
  };
}

export const __testables = {
  toOutlinePreview,
  findPlannerContextWithDeps,
};
