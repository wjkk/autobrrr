import { Prisma } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { mapRun } from '../lib/api-mappers.js';
import { requireUser } from '../lib/auth.js';
import { resolveModelSelection } from '../lib/model-registry.js';
import { prisma } from '../lib/prisma.js';
import { resolveUserDefaultModelSelection } from '../lib/user-model-defaults.js';

const scopedPayloadSchema = z.object({
  episodeId: z.string().min(1),
  prompt: z.string().trim().max(10000).optional(),
  modelFamily: z.string().trim().max(120).optional(),
  modelEndpoint: z.string().trim().max(120).optional(),
  referenceAssetIds: z.array(z.string().min(1)).max(16).optional().default([]),
  idempotencyKey: z.string().trim().max(191).optional(),
  options: z.record(z.string(), z.unknown()).optional(),
});

const projectParamsSchema = z.object({
  projectId: z.string().min(1),
});

const subjectParamsSchema = projectParamsSchema.extend({
  subjectId: z.string().min(1),
});

const sceneParamsSchema = projectParamsSchema.extend({
  sceneId: z.string().min(1),
});

const shotParamsSchema = projectParamsSchema.extend({
  shotScriptId: z.string().min(1),
});

async function findOwnedActiveRefinement(projectId: string, episodeId: string, userId: string) {
  return prisma.plannerRefinementVersion.findFirst({
    where: {
      isActive: true,
      plannerSession: {
        projectId,
        episodeId,
        isActive: true,
        project: {
          createdById: userId,
        },
      },
    },
    include: {
      plannerSession: {
        include: {
          project: {
            include: {
              creationConfig: {
                include: {
                  imageModelEndpoint: {
                    select: {
                      id: true,
                      slug: true,
                      label: true,
                    },
                  },
                },
              },
            },
          },
          episode: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
    },
  });
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

async function createPlannerImageGenerationRun(args: {
  userId: string;
  projectId: string;
  episodeId: string;
  prompt: string;
  resourceType: 'planner_subject' | 'planner_scene' | 'planner_shot_script';
  resourceId: string;
  entityName: string;
  modelFamily?: string;
  modelEndpoint?: string;
  preferredEndpointSlug?: string | null;
  referenceAssetIds: string[];
  idempotencyKey?: string;
  options?: Record<string, unknown>;
}) {
  if (args.referenceAssetIds.length > 0) {
    const ownedAssets = await prisma.asset.findMany({
      where: {
        id: { in: args.referenceAssetIds },
        projectId: args.projectId,
        ownerUserId: args.userId,
        mediaKind: 'IMAGE',
      },
      select: { id: true },
    });
    if (ownedAssets.length !== new Set(args.referenceAssetIds).size) {
      return { error: 'ASSET_NOT_OWNED' as const };
    }
  }

  const resolvedModel = await resolvePlannerImageModel({
    userId: args.userId,
    modelFamily: args.modelFamily,
    modelEndpoint: args.modelEndpoint,
    preferredEndpointSlug: args.preferredEndpointSlug,
  });
  if (!resolvedModel) {
    return { error: 'MODEL_NOT_FOUND' as const };
  }

  const run = await prisma.run.create({
    data: {
      projectId: args.projectId,
      episodeId: args.episodeId,
      modelFamilyId: resolvedModel.family.id,
      modelProviderId: resolvedModel.provider.id,
      modelEndpointId: resolvedModel.endpoint.id,
      runType: 'IMAGE_GENERATION',
      resourceType: args.resourceType,
      resourceId: args.resourceId,
      status: 'QUEUED',
      executorType: 'SYSTEM_WORKER',
      idempotencyKey: args.idempotencyKey ?? null,
      inputJson: {
        prompt: args.prompt,
        entityName: args.entityName,
        resourceType: args.resourceType,
        resourceId: args.resourceId,
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
        referenceAssetIds: args.referenceAssetIds,
        options: args.options ?? null,
      } as Prisma.InputJsonValue,
    },
  });

  return { run };
}

export async function registerPlannerMediaGenerationRoutes(app: FastifyInstance) {
  app.post('/api/projects/:projectId/planner/subjects/:subjectId/generate-image', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = subjectParamsSchema.safeParse(request.params);
    const payload = scopedPayloadSchema.safeParse(request.body);
    if (!params.success || !payload.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid planner subject image generation payload.',
          details: payload.success ? undefined : payload.error.flatten(),
        },
      });
    }

    const activeRefinement = await findOwnedActiveRefinement(params.data.projectId, payload.data.episodeId, user.id);
    if (!activeRefinement) {
      return reply.code(409).send({
        ok: false,
        error: {
          code: 'PLANNER_REFINEMENT_REQUIRED',
          message: 'No active refinement version found.',
        },
      });
    }

    const subject = await prisma.plannerSubject.findFirst({
      where: {
        id: params.data.subjectId,
        refinementVersionId: activeRefinement.id,
      },
      select: {
        id: true,
        name: true,
        prompt: true,
        referenceAssetIdsJson: true,
      },
    });
    if (!subject) {
      return reply.code(404).send({
        ok: false,
        error: {
          code: 'PLANNER_SUBJECT_NOT_FOUND',
          message: 'Planner subject not found.',
        },
      });
    }

    const result = await createPlannerImageGenerationRun({
      userId: user.id,
      projectId: activeRefinement.plannerSession.project.id,
      episodeId: activeRefinement.plannerSession.episode.id,
      prompt: payload.data.prompt?.trim() || subject.prompt,
      resourceType: 'planner_subject',
      resourceId: subject.id,
      entityName: subject.name,
      modelFamily: payload.data.modelFamily,
      modelEndpoint: payload.data.modelEndpoint,
      preferredEndpointSlug: activeRefinement.plannerSession.project.creationConfig?.imageModelEndpoint?.slug ?? null,
      referenceAssetIds:
        payload.data.referenceAssetIds.length > 0
          ? payload.data.referenceAssetIds
          : (Array.isArray(subject.referenceAssetIdsJson) ? subject.referenceAssetIdsJson.filter((assetId): assetId is string => typeof assetId === 'string') : []),
      idempotencyKey: payload.data.idempotencyKey,
      options: {
        ...(payload.data.options ?? {}),
        plannerImageKind: 'subject',
      },
    });

    if ('error' in result) {
      if (result.error === 'ASSET_NOT_OWNED') {
        return reply.code(400).send({
          ok: false,
          error: {
            code: 'PLANNER_ASSET_NOT_OWNED',
            message: 'One or more subject image reference assets are invalid or not owned by the current user.',
          },
        });
      }
      return reply.code(404).send({
        ok: false,
        error: {
          code: 'MODEL_NOT_FOUND',
          message: 'No active image model endpoint matched the selection.',
        },
      });
    }

    return reply.code(202).send({
      ok: true,
      data: {
        run: mapRun(result.run),
      },
    });
  });

  app.post('/api/projects/:projectId/planner/scenes/:sceneId/generate-image', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = sceneParamsSchema.safeParse(request.params);
    const payload = scopedPayloadSchema.safeParse(request.body);
    if (!params.success || !payload.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid planner scene image generation payload.',
          details: payload.success ? undefined : payload.error.flatten(),
        },
      });
    }

    const activeRefinement = await findOwnedActiveRefinement(params.data.projectId, payload.data.episodeId, user.id);
    if (!activeRefinement) {
      return reply.code(409).send({
        ok: false,
        error: {
          code: 'PLANNER_REFINEMENT_REQUIRED',
          message: 'No active refinement version found.',
        },
      });
    }

    const scene = await prisma.plannerScene.findFirst({
      where: {
        id: params.data.sceneId,
        refinementVersionId: activeRefinement.id,
      },
      select: {
        id: true,
        name: true,
        prompt: true,
        description: true,
        referenceAssetIdsJson: true,
      },
    });
    if (!scene) {
      return reply.code(404).send({
        ok: false,
        error: {
          code: 'PLANNER_SCENE_NOT_FOUND',
          message: 'Planner scene not found.',
        },
      });
    }

    const result = await createPlannerImageGenerationRun({
      userId: user.id,
      projectId: activeRefinement.plannerSession.project.id,
      episodeId: activeRefinement.plannerSession.episode.id,
      prompt: payload.data.prompt?.trim() || scene.prompt || scene.description,
      resourceType: 'planner_scene',
      resourceId: scene.id,
      entityName: scene.name,
      modelFamily: payload.data.modelFamily,
      modelEndpoint: payload.data.modelEndpoint,
      preferredEndpointSlug: activeRefinement.plannerSession.project.creationConfig?.imageModelEndpoint?.slug ?? null,
      referenceAssetIds:
        payload.data.referenceAssetIds.length > 0
          ? payload.data.referenceAssetIds
          : (Array.isArray(scene.referenceAssetIdsJson) ? scene.referenceAssetIdsJson.filter((assetId): assetId is string => typeof assetId === 'string') : []),
      idempotencyKey: payload.data.idempotencyKey,
      options: {
        ...(payload.data.options ?? {}),
        plannerImageKind: 'scene',
      },
    });

    if ('error' in result) {
      if (result.error === 'ASSET_NOT_OWNED') {
        return reply.code(400).send({
          ok: false,
          error: {
            code: 'PLANNER_ASSET_NOT_OWNED',
            message: 'One or more scene image reference assets are invalid or not owned by the current user.',
          },
        });
      }
      return reply.code(404).send({
        ok: false,
        error: {
          code: 'MODEL_NOT_FOUND',
          message: 'No active image model endpoint matched the selection.',
        },
      });
    }

    return reply.code(202).send({
      ok: true,
      data: {
        run: mapRun(result.run),
      },
    });
  });

  app.post('/api/projects/:projectId/planner/shot-scripts/:shotScriptId/generate-image', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = shotParamsSchema.safeParse(request.params);
    const payload = scopedPayloadSchema.safeParse(request.body);
    if (!params.success || !payload.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid planner shot storyboard generation payload.',
          details: payload.success ? undefined : payload.error.flatten(),
        },
      });
    }

    const activeRefinement = await findOwnedActiveRefinement(params.data.projectId, payload.data.episodeId, user.id);
    if (!activeRefinement) {
      return reply.code(409).send({
        ok: false,
        error: {
          code: 'PLANNER_REFINEMENT_REQUIRED',
          message: 'No active refinement version found.',
        },
      });
    }

    const shotScript = await prisma.plannerShotScript.findFirst({
      where: {
        id: params.data.shotScriptId,
        refinementVersionId: activeRefinement.id,
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
    if (!shotScript) {
      return reply.code(404).send({
        ok: false,
        error: {
          code: 'PLANNER_SHOT_NOT_FOUND',
          message: 'Planner shot script not found.',
        },
      });
    }

    const result = await createPlannerImageGenerationRun({
      userId: user.id,
      projectId: activeRefinement.plannerSession.project.id,
      episodeId: activeRefinement.plannerSession.episode.id,
      prompt:
        payload.data.prompt?.trim()
        || [shotScript.visualDescription, shotScript.composition, shotScript.cameraMotion].filter(Boolean).join('\n'),
      resourceType: 'planner_shot_script',
      resourceId: shotScript.id,
      entityName: shotScript.title,
      modelFamily: payload.data.modelFamily,
      modelEndpoint: payload.data.modelEndpoint,
      preferredEndpointSlug: activeRefinement.plannerSession.project.creationConfig?.imageModelEndpoint?.slug ?? null,
      referenceAssetIds:
        payload.data.referenceAssetIds.length > 0
          ? payload.data.referenceAssetIds
          : (Array.isArray(shotScript.referenceAssetIdsJson) ? shotScript.referenceAssetIdsJson.filter((assetId): assetId is string => typeof assetId === 'string') : []),
      idempotencyKey: payload.data.idempotencyKey,
      options: {
        ...(payload.data.options ?? {}),
        plannerImageKind: 'storyboard_sketch',
      },
    });

    if ('error' in result) {
      if (result.error === 'ASSET_NOT_OWNED') {
        return reply.code(400).send({
          ok: false,
          error: {
            code: 'PLANNER_ASSET_NOT_OWNED',
            message: 'One or more shot storyboard reference assets are invalid or not owned by the current user.',
          },
        });
      }
      return reply.code(404).send({
        ok: false,
        error: {
          code: 'MODEL_NOT_FOUND',
          message: 'No active image model endpoint matched the selection.',
        },
      });
    }

    return reply.code(202).send({
      ok: true,
      data: {
        run: mapRun(result.run),
      },
    });
  });
}
