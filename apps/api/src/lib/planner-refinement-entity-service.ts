import { Prisma } from '@prisma/client';

import { findOwnedActivePlannerRefinement, verifyOwnedPlannerImageAssets } from './planner-refinement-access.js';
import { PLANNER_REFINEMENT_LOCKED_ERROR } from './planner-refinement-drafts.js';
import { syncPlannerRefinementProjection } from './planner-refinement-projection.js';
import { prisma } from './prisma.js';

type PlannerRefinementEntityError =
  | 'REFINEMENT_REQUIRED'
  | 'REFINEMENT_LOCKED'
  | 'ASSET_NOT_OWNED'
  | 'SUBJECT_NOT_FOUND'
  | 'SCENE_NOT_FOUND'
  | 'SHOT_NOT_FOUND';

type EntityResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: PlannerRefinementEntityError;
    };

interface ScopedEntityArgs {
  projectId: string;
  episodeId: string;
  userId: string;
}

async function requireEditableRefinementWithDeps(
  args: ScopedEntityArgs,
  deps: {
    findOwnedActivePlannerRefinement: typeof findOwnedActivePlannerRefinement;
  },
) {
  const activeRefinement = await deps.findOwnedActivePlannerRefinement(args.projectId, args.episodeId, args.userId);
  if (!activeRefinement) {
    return { ok: false as const, error: 'REFINEMENT_REQUIRED' as const };
  }

  if (activeRefinement.isConfirmed) {
    return { ok: false as const, error: 'REFINEMENT_LOCKED' as const };
  }

  return { ok: true as const, activeRefinement };
}

async function requireEditableRefinement(args: ScopedEntityArgs) {
  return requireEditableRefinementWithDeps(args, { findOwnedActivePlannerRefinement });
}

export async function updatePlannerSubject(args: ScopedEntityArgs & {
  subjectId: string;
  patch: {
    name?: string;
    role?: string;
    appearance?: string;
    personality?: string | null;
    prompt?: string;
    negativePrompt?: string | null;
  };
}): Promise<EntityResult<{
  id: string;
  name: string;
  role: string | null;
  appearance: string | null;
  personality: string | null;
  prompt: string | null;
  negativePrompt: string | null;
}>> {
  const access = await requireEditableRefinement(args);
  if (!access.ok) {
    return access;
  }

  const subject = await prisma.plannerSubject.findFirst({
    where: {
      id: args.subjectId,
      refinementVersionId: access.activeRefinement.id,
    },
    select: { id: true },
  });
  if (!subject) {
    return { ok: false, error: 'SUBJECT_NOT_FOUND' };
  }

  const updated = await prisma.$transaction(async (tx) => {
    const nextSubject = await tx.plannerSubject.update({
      where: { id: subject.id },
      data: {
        ...(args.patch.name ? { name: args.patch.name } : {}),
        ...(args.patch.role ? { role: args.patch.role } : {}),
        ...(args.patch.appearance ? { appearance: args.patch.appearance } : {}),
        ...(args.patch.personality !== undefined ? { personality: args.patch.personality } : {}),
        ...(args.patch.prompt ? { prompt: args.patch.prompt } : {}),
        ...(args.patch.negativePrompt !== undefined ? { negativePrompt: args.patch.negativePrompt } : {}),
      },
    });

    await syncPlannerRefinementProjection({
      db: tx,
      refinementVersionId: access.activeRefinement.id,
    });

    return nextSubject;
  });

  return {
    ok: true,
    data: {
      id: updated.id,
      name: updated.name,
      role: updated.role,
      appearance: updated.appearance,
      personality: updated.personality,
      prompt: updated.prompt,
      negativePrompt: updated.negativePrompt,
    },
  };
}

export async function updatePlannerScene(args: ScopedEntityArgs & {
  sceneId: string;
  patch: {
    name?: string;
    time?: string;
    description?: string;
    prompt?: string;
    negativePrompt?: string | null;
  };
}): Promise<EntityResult<{
  id: string;
  name: string;
  time: string | null;
  description: string | null;
  prompt: string | null;
  negativePrompt: string | null;
}>> {
  const access = await requireEditableRefinement(args);
  if (!access.ok) {
    return access;
  }

  const scene = await prisma.plannerScene.findFirst({
    where: {
      id: args.sceneId,
      refinementVersionId: access.activeRefinement.id,
    },
    select: { id: true },
  });
  if (!scene) {
    return { ok: false, error: 'SCENE_NOT_FOUND' };
  }

  const updated = await prisma.$transaction(async (tx) => {
    const nextScene = await tx.plannerScene.update({
      where: { id: scene.id },
      data: {
        ...(args.patch.name ? { name: args.patch.name } : {}),
        ...(args.patch.time ? { time: args.patch.time } : {}),
        ...(args.patch.description ? { description: args.patch.description } : {}),
        ...(args.patch.prompt ? { prompt: args.patch.prompt } : {}),
        ...(args.patch.negativePrompt !== undefined ? { negativePrompt: args.patch.negativePrompt } : {}),
      },
    });

    await syncPlannerRefinementProjection({
      db: tx,
      refinementVersionId: access.activeRefinement.id,
    });

    return nextScene;
  });

  return {
    ok: true,
    data: {
      id: updated.id,
      name: updated.name,
      time: updated.time,
      description: updated.description,
      prompt: updated.prompt,
      negativePrompt: updated.negativePrompt,
    },
  };
}

export async function updatePlannerShot(args: ScopedEntityArgs & {
  shotScriptId: string;
  patch: {
    title?: string;
    visualDescription?: string;
    composition?: string;
    cameraMotion?: string;
    voiceRole?: string;
    dialogue?: string;
  };
}): Promise<EntityResult<{
  id: string;
  title: string;
  visualDescription: string | null;
  composition: string | null;
  cameraMotion: string | null;
  voiceRole: string | null;
  dialogue: string | null;
}>> {
  const access = await requireEditableRefinement(args);
  if (!access.ok) {
    return access;
  }

  const shot = await prisma.plannerShotScript.findFirst({
    where: {
      id: args.shotScriptId,
      refinementVersionId: access.activeRefinement.id,
    },
    select: { id: true },
  });
  if (!shot) {
    return { ok: false, error: 'SHOT_NOT_FOUND' };
  }

  const updated = await prisma.$transaction(async (tx) => {
    const nextShot = await tx.plannerShotScript.update({
      where: { id: shot.id },
      data: {
        ...(args.patch.title ? { title: args.patch.title, shotNo: args.patch.title } : {}),
        ...(args.patch.visualDescription ? { visualDescription: args.patch.visualDescription } : {}),
        ...(args.patch.composition ? { composition: args.patch.composition } : {}),
        ...(args.patch.cameraMotion ? { cameraMotion: args.patch.cameraMotion } : {}),
        ...(args.patch.voiceRole ? { voiceRole: args.patch.voiceRole } : {}),
        ...(args.patch.dialogue ? { dialogue: args.patch.dialogue } : {}),
      },
    });

    await syncPlannerRefinementProjection({
      db: tx,
      refinementVersionId: access.activeRefinement.id,
    });

    return nextShot;
  });

  return {
    ok: true,
    data: {
      id: updated.id,
      title: updated.title,
      visualDescription: updated.visualDescription,
      composition: updated.composition,
      cameraMotion: updated.cameraMotion,
      voiceRole: updated.voiceRole,
      dialogue: updated.dialogue,
    },
  };
}

async function updatePlannerEntityAssetsWithDeps(args: ScopedEntityArgs & {
  entityKind: 'subject' | 'scene';
  entityId: string;
  referenceAssetIds?: string[];
  generatedAssetIds?: string[];
}, deps: {
  requireEditableRefinement: typeof requireEditableRefinementWithDeps;
  verifyOwnedPlannerImageAssets: typeof verifyOwnedPlannerImageAssets;
  prisma: Pick<typeof prisma, 'plannerSubject' | 'plannerScene' | '$transaction'>;
  syncPlannerRefinementProjection: typeof syncPlannerRefinementProjection;
}) {
  const access = await deps.requireEditableRefinement(args, {
    findOwnedActivePlannerRefinement,
  });
  if (!access.ok) {
    return access;
  }

  const entity = args.entityKind === 'subject'
    ? await deps.prisma.plannerSubject.findFirst({
        where: {
          id: args.entityId,
          refinementVersionId: access.activeRefinement.id,
        },
        select: { id: true },
      })
    : await deps.prisma.plannerScene.findFirst({
        where: {
          id: args.entityId,
          refinementVersionId: access.activeRefinement.id,
        },
        select: { id: true },
      });

  if (!entity) {
    return {
      ok: false as const,
      error: args.entityKind === 'subject' ? 'SUBJECT_NOT_FOUND' as const : 'SCENE_NOT_FOUND' as const,
    };
  }

  const allAssetIds = [...(args.referenceAssetIds ?? []), ...(args.generatedAssetIds ?? [])];
  const areAssetsOwned = await deps.verifyOwnedPlannerImageAssets({
    assetIds: allAssetIds,
    projectId: args.projectId,
    userId: args.userId,
  });
  if (!areAssetsOwned) {
    return { ok: false as const, error: 'ASSET_NOT_OWNED' as const };
  }

  const updated = await deps.prisma.$transaction(async (tx) => {
    const nextEntity = args.entityKind === 'subject'
      ? await tx.plannerSubject.update({
          where: { id: entity.id },
          data: {
            ...(args.referenceAssetIds ? { referenceAssetIdsJson: args.referenceAssetIds as Prisma.InputJsonValue } : {}),
            ...(args.generatedAssetIds ? { generatedAssetIdsJson: args.generatedAssetIds as Prisma.InputJsonValue } : {}),
          },
        })
      : await tx.plannerScene.update({
          where: { id: entity.id },
          data: {
            ...(args.referenceAssetIds ? { referenceAssetIdsJson: args.referenceAssetIds as Prisma.InputJsonValue } : {}),
            ...(args.generatedAssetIds ? { generatedAssetIdsJson: args.generatedAssetIds as Prisma.InputJsonValue } : {}),
          },
        });

    await deps.syncPlannerRefinementProjection({
      db: tx,
      refinementVersionId: access.activeRefinement.id,
    });

    return nextEntity;
  });

  return {
    ok: true as const,
    data: {
      id: updated.id,
      referenceAssetIds: Array.isArray(updated.referenceAssetIdsJson) ? updated.referenceAssetIdsJson : [],
      generatedAssetIds: Array.isArray(updated.generatedAssetIdsJson) ? updated.generatedAssetIdsJson : [],
    },
  };
}

async function updatePlannerEntityAssets(args: ScopedEntityArgs & {
  entityKind: 'subject' | 'scene';
  entityId: string;
  referenceAssetIds?: string[];
  generatedAssetIds?: string[];
}) {
  return updatePlannerEntityAssetsWithDeps(args, {
    requireEditableRefinement: requireEditableRefinementWithDeps,
    verifyOwnedPlannerImageAssets,
    prisma,
    syncPlannerRefinementProjection,
  });
}

export async function updatePlannerSubjectAssets(args: ScopedEntityArgs & {
  subjectId: string;
  referenceAssetIds?: string[];
  generatedAssetIds?: string[];
}) {
  return updatePlannerEntityAssets({
    ...args,
    entityKind: 'subject',
    entityId: args.subjectId,
  });
}

export async function updatePlannerSceneAssets(args: ScopedEntityArgs & {
  sceneId: string;
  referenceAssetIds?: string[];
  generatedAssetIds?: string[];
}) {
  return updatePlannerEntityAssets({
    ...args,
    entityKind: 'scene',
    entityId: args.sceneId,
  });
}

export async function deletePlannerShot(args: ScopedEntityArgs & {
  shotScriptId: string;
}): Promise<EntityResult<{
  deleted: true;
  shotScriptId: string;
}>> {
  const access = await requireEditableRefinement(args);
  if (!access.ok) {
    return access;
  }

  const shot = await prisma.plannerShotScript.findFirst({
    where: {
      id: args.shotScriptId,
      refinementVersionId: access.activeRefinement.id,
    },
    select: { id: true },
  });
  if (!shot) {
    return { ok: false, error: 'SHOT_NOT_FOUND' };
  }

  await prisma.$transaction(async (tx) => {
    await tx.plannerShotScript.delete({
      where: { id: shot.id },
    });

    await syncPlannerRefinementProjection({
      db: tx,
      refinementVersionId: access.activeRefinement.id,
    });
  });

  return {
    ok: true,
    data: {
      deleted: true,
      shotScriptId: shot.id,
    },
  };
}

export { PLANNER_REFINEMENT_LOCKED_ERROR };

export const __testables = {
  requireEditableRefinementWithDeps,
  updatePlannerEntityAssetsWithDeps,
};
