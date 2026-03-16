import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { requireUser } from '../lib/auth.js';
import { getVideoModelCapability, summarizeVideoModelCapabilityForPlanner } from '../lib/model-capability.js';
import { findOwnedEpisode } from '../lib/ownership.js';
import { prisma } from '../lib/prisma.js';
import { generateShotPrompts } from '../lib/shot-prompt-generator.js';

const paramsSchema = z.object({
  projectId: z.string().min(1),
});

const querySchema = z.object({
  episodeId: z.string().min(1),
  modelSlug: z.string().trim().min(1).max(120),
});

export async function registerPlannerShotPromptRoutes(app: FastifyInstance) {
  app.get('/api/projects/:projectId/planner/shot-prompts', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = paramsSchema.safeParse(request.params);
    const query = querySchema.safeParse(request.query);
    if (!params.success || !query.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid planner shot prompt query.',
          details: query.success ? undefined : query.error.flatten(),
        },
      });
    }

    const episode = await findOwnedEpisode(params.data.projectId, query.data.episodeId, user.id);
    if (!episode) {
      return reply.code(404).send({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Episode not found.',
        },
      });
    }

    const plannerSession = await prisma.plannerSession.findFirst({
      where: {
        projectId: episode.project.id,
        episodeId: episode.id,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
      },
    });

    if (!plannerSession) {
      return reply.code(409).send({
        ok: false,
        error: {
          code: 'PLANNER_SESSION_REQUIRED',
          message: 'No active planner session found.',
        },
      });
    }

    const activeRefinement = await prisma.plannerRefinementVersion.findFirst({
      where: {
        plannerSessionId: plannerSession.id,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        scenes: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            name: true,
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
            visualDescription: true,
            composition: true,
            cameraMotion: true,
            voiceRole: true,
            dialogue: true,
            sortOrder: true,
          },
        },
      },
    });

    if (!activeRefinement || activeRefinement.shotScripts.length === 0) {
      return reply.code(409).send({
        ok: false,
        error: {
          code: 'PLANNER_REFINEMENT_REQUIRED',
          message: 'No active refinement shot scripts found.',
        },
      });
    }

    const model = await getVideoModelCapability(query.data.modelSlug).catch(() => null);
    if (!model) {
      return reply.code(404).send({
        ok: false,
        error: {
          code: 'MODEL_NOT_FOUND',
          message: 'Video model family not found.',
        },
      });
    }

    const scenesById = new Map(activeRefinement.scenes.map((scene) => [scene.id, scene.name]));
    const prompts = generateShotPrompts({
      modelFamilySlug: model.familySlug,
      capability: model.capability,
      shots: activeRefinement.shotScripts.map((shot) => ({
        id: shot.id,
        sceneId: shot.sceneId,
        sceneName: shot.sceneId ? scenesById.get(shot.sceneId) ?? null : null,
        actKey: shot.actKey,
        actTitle: shot.actTitle,
        shotNo: shot.shotNo,
        title: shot.title,
        durationSeconds: shot.durationSeconds,
        visualDescription: shot.visualDescription,
        composition: shot.composition,
        cameraMotion: shot.cameraMotion,
        voiceRole: shot.voiceRole,
        dialogue: shot.dialogue,
        sortOrder: shot.sortOrder,
      })),
    });

    return reply.send({
      ok: true,
      data: {
        refinementVersionId: activeRefinement.id,
        model: {
          familySlug: model.familySlug,
          familyName: model.familyName,
          summary: summarizeVideoModelCapabilityForPlanner({
            familySlug: model.familySlug,
            familyName: model.familyName,
            capability: model.capability,
          }),
          capability: model.capability,
        },
        prompts,
      },
    });
  });
}
