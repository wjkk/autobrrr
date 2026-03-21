import { Prisma } from '@prisma/client';

import { syncPlannerRefinementProjection } from './projection.js';
import {
  findOwnedActivePlannerRefinement,
  prisma,
  requireEditableRefinementWithDeps,
  verifyOwnedPlannerImageAssets,
} from './entity-accessors.js';
import type { ScopedEntityArgs } from './entity-service-types.js';

export async function updatePlannerEntityAssetsWithDeps(args: ScopedEntityArgs & {
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
