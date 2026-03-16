import type { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

import { requireUser } from '../lib/auth.js';
import { PLANNER_REFINEMENT_LOCKED_ERROR } from '../lib/planner-refinement-drafts.js';
import { syncPlannerRefinementProjection } from '../lib/planner-refinement-projection.js';
import { prisma } from '../lib/prisma.js';

const subjectParamsSchema = z.object({
  projectId: z.string().min(1),
  subjectId: z.string().min(1),
});

const sceneParamsSchema = z.object({
  projectId: z.string().min(1),
  sceneId: z.string().min(1),
});

const shotParamsSchema = z.object({
  projectId: z.string().min(1),
  shotScriptId: z.string().min(1),
});

const scopedPayloadSchema = z.object({
  episodeId: z.string().min(1),
});

const subjectPayloadSchema = scopedPayloadSchema.extend({
  name: z.string().trim().min(1).max(120).optional(),
  role: z.string().trim().min(1).max(120).optional(),
  appearance: z.string().trim().min(1).max(2000).optional(),
  personality: z.string().trim().min(1).max(2000).nullable().optional(),
  prompt: z.string().trim().min(1).max(2000).optional(),
  negativePrompt: z.string().trim().min(1).max(2000).nullable().optional(),
});

const scenePayloadSchema = scopedPayloadSchema.extend({
  name: z.string().trim().min(1).max(120).optional(),
  time: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().min(1).max(2000).optional(),
  prompt: z.string().trim().min(1).max(2000).optional(),
  negativePrompt: z.string().trim().min(1).max(2000).nullable().optional(),
});

const shotPayloadSchema = scopedPayloadSchema.extend({
  title: z.string().trim().min(1).max(255).optional(),
  visualDescription: z.string().trim().min(1).max(2000).optional(),
  composition: z.string().trim().min(1).max(1000).optional(),
  cameraMotion: z.string().trim().min(1).max(1000).optional(),
  voiceRole: z.string().trim().min(1).max(120).optional(),
  dialogue: z.string().trim().min(1).max(1000).optional(),
});

const assetBindingPayloadSchema = scopedPayloadSchema.extend({
  referenceAssetIds: z.array(z.string().min(1)).max(16).optional(),
  generatedAssetIds: z.array(z.string().min(1)).max(16).optional(),
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
    select: {
      id: true,
      isConfirmed: true,
      plannerSession: {
        select: {
          projectId: true,
          episodeId: true,
        },
      },
    },
  });
}

export async function registerPlannerRefinementEntityRoutes(app: FastifyInstance) {
  app.patch('/api/projects/:projectId/planner/subjects/:subjectId', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = subjectParamsSchema.safeParse(request.params);
    const payload = subjectPayloadSchema.safeParse(request.body);
    if (!params.success || !payload.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid planner subject payload.',
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

    if (activeRefinement.isConfirmed) {
      return reply.code(409).send(PLANNER_REFINEMENT_LOCKED_ERROR);
    }

    const subject = await prisma.plannerSubject.findFirst({
      where: {
        id: params.data.subjectId,
        refinementVersionId: activeRefinement.id,
      },
      select: { id: true },
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

    const updated = await prisma.$transaction(async (tx) => {
      const nextSubject = await tx.plannerSubject.update({
        where: { id: subject.id },
        data: {
          ...(payload.data.name ? { name: payload.data.name } : {}),
          ...(payload.data.role ? { role: payload.data.role } : {}),
          ...(payload.data.appearance ? { appearance: payload.data.appearance } : {}),
          ...(payload.data.personality !== undefined ? { personality: payload.data.personality } : {}),
          ...(payload.data.prompt ? { prompt: payload.data.prompt } : {}),
          ...(payload.data.negativePrompt !== undefined ? { negativePrompt: payload.data.negativePrompt } : {}),
        },
      });

      await syncPlannerRefinementProjection({
        db: tx,
        refinementVersionId: activeRefinement.id,
      });

      return nextSubject;
    });

    return reply.send({
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
    });
  });

  app.patch('/api/projects/:projectId/planner/scenes/:sceneId', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = sceneParamsSchema.safeParse(request.params);
    const payload = scenePayloadSchema.safeParse(request.body);
    if (!params.success || !payload.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid planner scene payload.',
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

    if (activeRefinement.isConfirmed) {
      return reply.code(409).send(PLANNER_REFINEMENT_LOCKED_ERROR);
    }

    const scene = await prisma.plannerScene.findFirst({
      where: {
        id: params.data.sceneId,
        refinementVersionId: activeRefinement.id,
      },
      select: { id: true },
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

    const updated = await prisma.$transaction(async (tx) => {
      const nextScene = await tx.plannerScene.update({
        where: { id: scene.id },
        data: {
          ...(payload.data.name ? { name: payload.data.name } : {}),
          ...(payload.data.time ? { time: payload.data.time } : {}),
          ...(payload.data.description ? { description: payload.data.description } : {}),
          ...(payload.data.prompt ? { prompt: payload.data.prompt } : {}),
          ...(payload.data.negativePrompt !== undefined ? { negativePrompt: payload.data.negativePrompt } : {}),
        },
      });

      await syncPlannerRefinementProjection({
        db: tx,
        refinementVersionId: activeRefinement.id,
      });

      return nextScene;
    });

    return reply.send({
      ok: true,
      data: {
        id: updated.id,
        name: updated.name,
        time: updated.time,
        description: updated.description,
        prompt: updated.prompt,
        negativePrompt: updated.negativePrompt,
      },
    });
  });

  app.put('/api/projects/:projectId/planner/subjects/:subjectId/assets', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = subjectParamsSchema.safeParse(request.params);
    const payload = assetBindingPayloadSchema.safeParse(request.body);
    if (!params.success || !payload.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid planner subject asset payload.',
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

    if (activeRefinement.isConfirmed) {
      return reply.code(409).send(PLANNER_REFINEMENT_LOCKED_ERROR);
    }

    const subject = await prisma.plannerSubject.findFirst({
      where: {
        id: params.data.subjectId,
        refinementVersionId: activeRefinement.id,
      },
      select: { id: true },
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

    const allAssetIds = [...(payload.data.referenceAssetIds ?? []), ...(payload.data.generatedAssetIds ?? [])];
    if (allAssetIds.length > 0) {
      const ownedAssets = await prisma.asset.findMany({
        where: {
          id: { in: allAssetIds },
          projectId: params.data.projectId,
          ownerUserId: user.id,
          mediaKind: 'IMAGE',
        },
        select: { id: true },
      });
      if (ownedAssets.length !== new Set(allAssetIds).size) {
        return reply.code(400).send({
          ok: false,
          error: {
            code: 'PLANNER_ASSET_NOT_OWNED',
            message: 'One or more subject assets are invalid or not owned by the current user.',
          },
        });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const nextSubject = await tx.plannerSubject.update({
        where: { id: subject.id },
        data: {
          ...(payload.data.referenceAssetIds ? { referenceAssetIdsJson: payload.data.referenceAssetIds as Prisma.InputJsonValue } : {}),
          ...(payload.data.generatedAssetIds ? { generatedAssetIdsJson: payload.data.generatedAssetIds as Prisma.InputJsonValue } : {}),
        },
      });

      await syncPlannerRefinementProjection({
        db: tx,
        refinementVersionId: activeRefinement.id,
      });

      return nextSubject;
    });

    return reply.send({
      ok: true,
      data: {
        id: updated.id,
        referenceAssetIds: Array.isArray(updated.referenceAssetIdsJson) ? updated.referenceAssetIdsJson : [],
        generatedAssetIds: Array.isArray(updated.generatedAssetIdsJson) ? updated.generatedAssetIdsJson : [],
      },
    });
  });

  app.put('/api/projects/:projectId/planner/scenes/:sceneId/assets', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = sceneParamsSchema.safeParse(request.params);
    const payload = assetBindingPayloadSchema.safeParse(request.body);
    if (!params.success || !payload.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid planner scene asset payload.',
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

    if (activeRefinement.isConfirmed) {
      return reply.code(409).send(PLANNER_REFINEMENT_LOCKED_ERROR);
    }

    const scene = await prisma.plannerScene.findFirst({
      where: {
        id: params.data.sceneId,
        refinementVersionId: activeRefinement.id,
      },
      select: { id: true },
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

    const allAssetIds = [...(payload.data.referenceAssetIds ?? []), ...(payload.data.generatedAssetIds ?? [])];
    if (allAssetIds.length > 0) {
      const ownedAssets = await prisma.asset.findMany({
        where: {
          id: { in: allAssetIds },
          projectId: params.data.projectId,
          ownerUserId: user.id,
          mediaKind: 'IMAGE',
        },
        select: { id: true },
      });
      if (ownedAssets.length !== new Set(allAssetIds).size) {
        return reply.code(400).send({
          ok: false,
          error: {
            code: 'PLANNER_ASSET_NOT_OWNED',
            message: 'One or more scene assets are invalid or not owned by the current user.',
          },
        });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const nextScene = await tx.plannerScene.update({
        where: { id: scene.id },
        data: {
          ...(payload.data.referenceAssetIds ? { referenceAssetIdsJson: payload.data.referenceAssetIds as Prisma.InputJsonValue } : {}),
          ...(payload.data.generatedAssetIds ? { generatedAssetIdsJson: payload.data.generatedAssetIds as Prisma.InputJsonValue } : {}),
        },
      });

      await syncPlannerRefinementProjection({
        db: tx,
        refinementVersionId: activeRefinement.id,
      });

      return nextScene;
    });

    return reply.send({
      ok: true,
      data: {
        id: updated.id,
        referenceAssetIds: Array.isArray(updated.referenceAssetIdsJson) ? updated.referenceAssetIdsJson : [],
        generatedAssetIds: Array.isArray(updated.generatedAssetIdsJson) ? updated.generatedAssetIdsJson : [],
      },
    });
  });

  app.patch('/api/projects/:projectId/planner/shot-scripts/:shotScriptId', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = shotParamsSchema.safeParse(request.params);
    const payload = shotPayloadSchema.safeParse(request.body);
    if (!params.success || !payload.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid planner shot payload.',
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

    if (activeRefinement.isConfirmed) {
      return reply.code(409).send(PLANNER_REFINEMENT_LOCKED_ERROR);
    }

    const shot = await prisma.plannerShotScript.findFirst({
      where: {
        id: params.data.shotScriptId,
        refinementVersionId: activeRefinement.id,
      },
      select: { id: true },
    });
    if (!shot) {
      return reply.code(404).send({
        ok: false,
        error: {
          code: 'PLANNER_SHOT_NOT_FOUND',
          message: 'Planner shot not found.',
        },
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const nextShot = await tx.plannerShotScript.update({
        where: { id: shot.id },
        data: {
          ...(payload.data.title ? { title: payload.data.title, shotNo: payload.data.title } : {}),
          ...(payload.data.visualDescription ? { visualDescription: payload.data.visualDescription } : {}),
          ...(payload.data.composition ? { composition: payload.data.composition } : {}),
          ...(payload.data.cameraMotion ? { cameraMotion: payload.data.cameraMotion } : {}),
          ...(payload.data.voiceRole ? { voiceRole: payload.data.voiceRole } : {}),
          ...(payload.data.dialogue ? { dialogue: payload.data.dialogue } : {}),
        },
      });

      await syncPlannerRefinementProjection({
        db: tx,
        refinementVersionId: activeRefinement.id,
      });

      return nextShot;
    });

    return reply.send({
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
    });
  });

  app.delete('/api/projects/:projectId/planner/shot-scripts/:shotScriptId', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = shotParamsSchema.safeParse(request.params);
    const payload = scopedPayloadSchema.safeParse(request.query);
    if (!params.success || !payload.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid planner shot delete payload.',
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

    if (activeRefinement.isConfirmed) {
      return reply.code(409).send(PLANNER_REFINEMENT_LOCKED_ERROR);
    }

    const shot = await prisma.plannerShotScript.findFirst({
      where: {
        id: params.data.shotScriptId,
        refinementVersionId: activeRefinement.id,
      },
      select: { id: true },
    });
    if (!shot) {
      return reply.code(404).send({
        ok: false,
        error: {
          code: 'PLANNER_SHOT_NOT_FOUND',
          message: 'Planner shot not found.',
        },
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.plannerShotScript.delete({
        where: { id: shot.id },
      });

      await syncPlannerRefinementProjection({
        db: tx,
        refinementVersionId: activeRefinement.id,
      });
    });

    return reply.send({
      ok: true,
      data: {
        deleted: true,
        shotScriptId: shot.id,
      },
    });
  });
}
