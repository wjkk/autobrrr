import {
  buildPlannerRecommendationReferenceAssets,
  buildPlannerSceneAssetRecommendations,
  buildPlannerSubjectAssetRecommendations,
} from '../entity/asset-recommendations.js';
import {
  findOwnedActivePlannerRefinement,
  prisma,
  readStringList,
} from './entity-accessors.js';
import type { PlannerRecommendationResult, ScopedEntityArgs } from './entity-service-types.js';

export async function getPlannerEntityRecommendationsWithDeps(args: ScopedEntityArgs & {
  entityKind: 'subject' | 'scene';
  entityId: string;
}, deps: {
  findOwnedActivePlannerRefinement: typeof findOwnedActivePlannerRefinement;
  prisma: Pick<typeof prisma, 'plannerSubject' | 'plannerScene' | 'asset'>;
}): Promise<PlannerRecommendationResult<{
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

export async function getPlannerSceneRecommendations(args: ScopedEntityArgs & {
  sceneId: string;
}) {
  return getPlannerEntityRecommendations({
    ...args,
    entityKind: 'scene',
    entityId: args.sceneId,
  });
}
