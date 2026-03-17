import type { Run } from '@prisma/client';

import { findOwnedActivePlannerRefinement, verifyOwnedPlannerImageAssets } from './planner-refinement-access.js';
import { PLANNER_REFINEMENT_LOCKED_ERROR } from './planner-refinement-drafts.js';
import { prisma } from './prisma.js';
import { resolveModelSelection } from './model-registry.js';
import { serializeRunInput } from './run-input.js';
import { resolveUserDefaultModelSelection } from './user-model-defaults.js';

type PlannerMediaEntityKind = 'subject' | 'scene' | 'shot';

type QueuePlannerImageGenerationError =
  | 'REFINEMENT_REQUIRED'
  | 'REFINEMENT_LOCKED'
  | 'MODEL_NOT_FOUND'
  | 'ASSET_NOT_OWNED'
  | 'SUBJECT_NOT_FOUND'
  | 'SCENE_NOT_FOUND'
  | 'SHOT_NOT_FOUND';

export type QueuePlannerImageGenerationResult =
  | {
      ok: true;
      run: Run;
    }
  | {
      ok: false;
      error: QueuePlannerImageGenerationError;
    };

interface QueuePlannerImageGenerationArgs {
  projectId: string;
  episodeId: string;
  userId: string;
  entityId: string;
  entityKind: PlannerMediaEntityKind;
  prompt?: string;
  modelFamily?: string;
  modelEndpoint?: string;
  referenceAssetIds: string[];
  idempotencyKey?: string;
  options?: Record<string, unknown>;
}

function buildImageRunContext(entityKind: PlannerMediaEntityKind) {
  if (entityKind === 'subject') {
    return {
      resourceType: 'planner_subject' as const,
      plannerImageKind: 'subject' as const,
      notFoundError: 'SUBJECT_NOT_FOUND' as const,
    };
  }

  if (entityKind === 'scene') {
    return {
      resourceType: 'planner_scene' as const,
      plannerImageKind: 'scene' as const,
      notFoundError: 'SCENE_NOT_FOUND' as const,
    };
  }

  return {
    resourceType: 'planner_shot_script' as const,
    plannerImageKind: 'storyboard_sketch' as const,
    notFoundError: 'SHOT_NOT_FOUND' as const,
  };
}

async function resolvePlannerImageModel(args: {
  userId: string;
  modelFamily?: string;
  modelEndpoint?: string;
  preferredEndpointSlug?: string | null;
}) {
  const userDefaultModel = !args.modelFamily && !args.modelEndpoint
    ? await resolveUserDefaultModelSelection(args.userId, 'IMAGE')
    : null;

  return resolveModelSelection({
    modelKind: 'IMAGE',
    familySlug: args.modelFamily ?? userDefaultModel?.familySlug,
    endpointSlug: args.modelEndpoint ?? args.preferredEndpointSlug ?? userDefaultModel?.endpointSlug,
    strategy: 'default',
  });
}

async function findPlannerMediaEntity(args: {
  entityKind: PlannerMediaEntityKind;
  entityId: string;
  refinementVersionId: string;
}) {
  if (args.entityKind === 'subject') {
    const subject = await prisma.plannerSubject.findFirst({
      where: {
        id: args.entityId,
        refinementVersionId: args.refinementVersionId,
      },
      select: {
        id: true,
        name: true,
        prompt: true,
        referenceAssetIdsJson: true,
      },
    });

    return subject
      ? {
          id: subject.id,
          entityName: subject.name,
          prompt: subject.prompt,
          referenceAssetIds: Array.isArray(subject.referenceAssetIdsJson)
            ? subject.referenceAssetIdsJson.filter((assetId): assetId is string => typeof assetId === 'string')
            : [],
        }
      : null;
  }

  if (args.entityKind === 'scene') {
    const scene = await prisma.plannerScene.findFirst({
      where: {
        id: args.entityId,
        refinementVersionId: args.refinementVersionId,
      },
      select: {
        id: true,
        name: true,
        prompt: true,
        description: true,
        referenceAssetIdsJson: true,
      },
    });

    return scene
      ? {
          id: scene.id,
          entityName: scene.name,
          prompt: scene.prompt || scene.description,
          referenceAssetIds: Array.isArray(scene.referenceAssetIdsJson)
            ? scene.referenceAssetIdsJson.filter((assetId): assetId is string => typeof assetId === 'string')
            : [],
        }
      : null;
  }

  const shot = await prisma.plannerShotScript.findFirst({
    where: {
      id: args.entityId,
      refinementVersionId: args.refinementVersionId,
    },
    select: {
      id: true,
      title: true,
      visualDescription: true,
      composition: true,
      cameraMotion: true,
      referenceAssetIdsJson: true,
    },
  });

  return shot
    ? {
        id: shot.id,
        entityName: shot.title,
        prompt: [shot.visualDescription, shot.composition, shot.cameraMotion].filter(Boolean).join('\n'),
        referenceAssetIds: Array.isArray(shot.referenceAssetIdsJson)
          ? shot.referenceAssetIdsJson.filter((assetId): assetId is string => typeof assetId === 'string')
          : [],
      }
    : null;
}

export async function queuePlannerImageGeneration(
  args: QueuePlannerImageGenerationArgs,
): Promise<QueuePlannerImageGenerationResult> {
  const activeRefinement = await findOwnedActivePlannerRefinement(args.projectId, args.episodeId, args.userId);
  if (!activeRefinement) {
    return { ok: false, error: 'REFINEMENT_REQUIRED' };
  }

  if (activeRefinement.isConfirmed) {
    return { ok: false, error: 'REFINEMENT_LOCKED' };
  }

  const entityContext = buildImageRunContext(args.entityKind);
  const entity = await findPlannerMediaEntity({
    entityKind: args.entityKind,
    entityId: args.entityId,
    refinementVersionId: activeRefinement.id,
  });
  if (!entity) {
    return { ok: false, error: entityContext.notFoundError };
  }

  const referenceAssetIds = args.referenceAssetIds.length > 0 ? args.referenceAssetIds : entity.referenceAssetIds;
  const areAssetsOwned = await verifyOwnedPlannerImageAssets({
    assetIds: referenceAssetIds,
    projectId: args.projectId,
    userId: args.userId,
  });
  if (!areAssetsOwned) {
    return { ok: false, error: 'ASSET_NOT_OWNED' };
  }

  const resolvedModel = await resolvePlannerImageModel({
    userId: args.userId,
    modelFamily: args.modelFamily,
    modelEndpoint: args.modelEndpoint,
    preferredEndpointSlug: activeRefinement.plannerSession.project.creationConfig?.imageModelEndpoint?.slug ?? null,
  });
  if (!resolvedModel) {
    return { ok: false, error: 'MODEL_NOT_FOUND' };
  }

  const run = await prisma.run.create({
    data: {
      projectId: activeRefinement.plannerSession.project.id,
      episodeId: activeRefinement.plannerSession.episode.id,
      modelFamilyId: resolvedModel.family.id,
      modelProviderId: resolvedModel.provider.id,
      modelEndpointId: resolvedModel.endpoint.id,
      runType: 'IMAGE_GENERATION',
      resourceType: entityContext.resourceType,
      resourceId: entity.id,
      status: 'QUEUED',
      executorType: 'SYSTEM_WORKER',
      idempotencyKey: args.idempotencyKey ?? null,
      inputJson: serializeRunInput({
        prompt: args.prompt?.trim() || entity.prompt,
        entityName: entity.entityName,
        resourceType: entityContext.resourceType,
        resourceId: entity.id,
        modelFamily: {
          id: resolvedModel.family.id,
          slug: resolvedModel.family.slug,
          name: resolvedModel.family.name,
        },
        modelProvider: {
          id: resolvedModel.provider.id,
          code: resolvedModel.provider.code,
          name: resolvedModel.provider.name,
          providerType: resolvedModel.provider.providerType.toLowerCase(),
        },
        modelEndpoint: {
          id: resolvedModel.endpoint.id,
          slug: resolvedModel.endpoint.slug,
          label: resolvedModel.endpoint.label,
          remoteModelKey: resolvedModel.endpoint.remoteModelKey,
        },
        referenceAssetIds,
        options: {
          ...(args.options ?? {}),
          plannerImageKind: entityContext.plannerImageKind,
        },
      }),
    },
  });

  return { ok: true, run };
}

export { PLANNER_REFINEMENT_LOCKED_ERROR };
