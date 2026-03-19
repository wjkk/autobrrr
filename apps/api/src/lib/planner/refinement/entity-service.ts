import { Prisma } from '@prisma/client';

import {
  buildPlannerRecommendationReferenceAssets,
  buildPlannerSceneAssetRecommendations,
  buildPlannerSubjectAssetRecommendations,
} from '../entity/asset-recommendations.js';
import { prisma } from '../../prisma.js';
import { findOwnedActivePlannerRefinement, verifyOwnedPlannerImageAssets } from './access.js';
import { PLANNER_REFINEMENT_LOCKED_ERROR } from './drafts.js';
import { syncPlannerRefinementProjection } from './projection.js';

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

type PlannerRecommendationEntityError =
  | 'REFINEMENT_REQUIRED'
  | 'SUBJECT_NOT_FOUND'
  | 'SCENE_NOT_FOUND';

type PlannerRecommendationResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: PlannerRecommendationEntityError;
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

function readStringList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
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

async function getPlannerEntityRecommendationsWithDeps(args: ScopedEntityArgs & {
  entityKind: 'subject' | 'scene';
  entityId: string;
}, deps: {
  findOwnedActivePlannerRefinement: typeof findOwnedActivePlannerRefinement;
  prisma: Pick<typeof prisma, 'plannerSubject' | 'plannerScene' | 'asset'>;
}) : Promise<PlannerRecommendationResult<{
  entityKind: 'subject' | 'scene';
  entityId: string;
  entityName: string;
  recommendations: ReturnType<typeof buildPlannerSubjectAssetRecommendations>;
}>> {
  const activeRefinement = await deps.findOwnedActivePlannerRefinement(args.projectId, args.episodeId, args.userId);
  if (!activeRefinement) {
    return { ok: false, error: 'REFINEMENT_REQUIRED' };
  }

  const entity = args.entityKind === 'subject'
    ? await deps.prisma.plannerSubject.findFirst({
        where: {
          id: args.entityId,
          refinementVersionId: activeRefinement.id,
        },
        select: {
          id: true,
          name: true,
          role: true,
          appearance: true,
          personality: true,
          prompt: true,
          referenceAssetIdsJson: true,
          generatedAssetIdsJson: true,
        },
      })
    : await deps.prisma.plannerScene.findFirst({
        where: {
          id: args.entityId,
          refinementVersionId: activeRefinement.id,
        },
        select: {
          id: true,
          name: true,
          time: true,
          locationType: true,
          description: true,
          prompt: true,
          referenceAssetIdsJson: true,
          generatedAssetIdsJson: true,
        },
      });

  if (!entity) {
    return {
      ok: false,
      error: args.entityKind === 'subject' ? 'SUBJECT_NOT_FOUND' : 'SCENE_NOT_FOUND',
    };
  }

  const linkedAssetIds = [
    ...readStringList(entity.generatedAssetIdsJson),
    ...readStringList(entity.referenceAssetIdsJson),
  ];

  const linkedAssetsRaw = linkedAssetIds.length > 0
    ? await deps.prisma.asset.findMany({
        where: {
          id: { in: linkedAssetIds },
          projectId: args.projectId,
          ownerUserId: args.userId,
          mediaKind: 'IMAGE',
          sourceUrl: { not: null },
        },
        select: {
          id: true,
          sourceUrl: true,
          fileName: true,
          mediaKind: true,
          sourceKind: true,
          createdAt: true,
        },
      })
    : [];
  const linkedAssetMap = new Map(linkedAssetsRaw.map((asset) => [asset.id, asset]));
  const linkedAssets = linkedAssetIds
    .map((assetId) => linkedAssetMap.get(assetId))
    .filter((asset): asset is NonNullable<typeof asset> => Boolean(asset));

  const recentAssets = await deps.prisma.asset.findMany({
    where: {
      projectId: args.projectId,
      ownerUserId: args.userId,
      mediaKind: 'IMAGE',
      sourceUrl: { not: null },
      ...(linkedAssetIds.length > 0 ? { id: { notIn: linkedAssetIds } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 8,
    select: {
      id: true,
      sourceUrl: true,
      fileName: true,
      mediaKind: true,
      sourceKind: true,
      createdAt: true,
    },
  });

  const referenceAssets = buildPlannerRecommendationReferenceAssets({
    linkedAssets,
    recentAssets,
    limit: 3,
  });

  const recommendations = args.entityKind === 'subject'
    ? buildPlannerSubjectAssetRecommendations({
        entity: {
          name: entity.name,
          role: 'role' in entity ? entity.role : null,
          appearance: 'appearance' in entity ? entity.appearance : null,
          personality: 'personality' in entity ? entity.personality : null,
          prompt: entity.prompt,
        },
        referenceAssets,
      })
    : buildPlannerSceneAssetRecommendations({
        entity: {
          name: entity.name,
          time: 'time' in entity ? entity.time : null,
          locationType: 'locationType' in entity ? entity.locationType : null,
          description: 'description' in entity ? entity.description : null,
          prompt: entity.prompt,
        },
        referenceAssets,
      });

  return {
    ok: true,
    data: {
      entityKind: args.entityKind,
      entityId: entity.id,
      entityName: entity.name,
      recommendations,
    },
  };
}

async function getPlannerEntityRecommendations(args: ScopedEntityArgs & {
  entityKind: 'subject' | 'scene';
  entityId: string;
}) {
  return getPlannerEntityRecommendationsWithDeps(args, {
    findOwnedActivePlannerRefinement,
    prisma,
  });
}

export async function getPlannerSubjectRecommendations(args: ScopedEntityArgs & {
  subjectId: string;
}) {
  return getPlannerEntityRecommendations({
    ...args,
    entityKind: 'subject',
    entityId: args.subjectId,
  });
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

export async function getPlannerSceneRecommendations(args: ScopedEntityArgs & {
  sceneId: string;
}) {
  return getPlannerEntityRecommendations({
    ...args,
    entityKind: 'scene',
    entityId: args.sceneId,
  });
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
  getPlannerEntityRecommendationsWithDeps,
  updatePlannerEntityAssetsWithDeps,
};
