import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { requireUser } from '../lib/auth.js';
import {
  deletePlannerShot,
  getPlannerSceneRecommendations,
  getPlannerSubjectRecommendations,
  PLANNER_REFINEMENT_LOCKED_ERROR,
  updatePlannerScene,
  updatePlannerSceneAssets,
  updatePlannerShot,
  updatePlannerSubject,
  updatePlannerSubjectAssets,
} from '../lib/planner-refinement-entity-service.js';

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

function sendPlannerRefinementEntityError(args: {
  reply: {
    code: (statusCode: number) => { send: (payload: unknown) => unknown };
  };
  error: 'REFINEMENT_REQUIRED' | 'REFINEMENT_LOCKED' | 'ASSET_NOT_OWNED' | 'SUBJECT_NOT_FOUND' | 'SCENE_NOT_FOUND' | 'SHOT_NOT_FOUND';
  assetLabel?: 'subject' | 'scene';
}) {
  if (args.error === 'REFINEMENT_REQUIRED') {
    return args.reply.code(409).send({
      ok: false,
      error: {
        code: 'PLANNER_REFINEMENT_REQUIRED',
        message: 'No active refinement version found.',
      },
    });
  }

  if (args.error === 'REFINEMENT_LOCKED') {
    return args.reply.code(409).send(PLANNER_REFINEMENT_LOCKED_ERROR);
  }

  if (args.error === 'ASSET_NOT_OWNED') {
    return args.reply.code(400).send({
      ok: false,
      error: {
        code: 'PLANNER_ASSET_NOT_OWNED',
        message: `One or more ${args.assetLabel} assets are invalid or not owned by the current user.`,
      },
    });
  }

  if (args.error === 'SUBJECT_NOT_FOUND') {
    return args.reply.code(404).send({
      ok: false,
      error: {
        code: 'PLANNER_SUBJECT_NOT_FOUND',
        message: 'Planner subject not found.',
      },
    });
  }

  if (args.error === 'SCENE_NOT_FOUND') {
    return args.reply.code(404).send({
      ok: false,
      error: {
        code: 'PLANNER_SCENE_NOT_FOUND',
        message: 'Planner scene not found.',
      },
    });
  }

  return args.reply.code(404).send({
    ok: false,
    error: {
      code: 'PLANNER_SHOT_NOT_FOUND',
      message: 'Planner shot not found.',
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

    const result = await updatePlannerSubject({
      projectId: params.data.projectId,
      subjectId: params.data.subjectId,
      episodeId: payload.data.episodeId,
      userId: user.id,
      patch: {
        name: payload.data.name,
        role: payload.data.role,
        appearance: payload.data.appearance,
        personality: payload.data.personality,
        prompt: payload.data.prompt,
        negativePrompt: payload.data.negativePrompt,
      },
    });

    if (!result.ok) {
      return sendPlannerRefinementEntityError({
        reply,
        error: result.error,
      });
    }

    return reply.send({
      ok: true,
      data: result.data,
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

    const result = await updatePlannerScene({
      projectId: params.data.projectId,
      sceneId: params.data.sceneId,
      episodeId: payload.data.episodeId,
      userId: user.id,
      patch: {
        name: payload.data.name,
        time: payload.data.time,
        description: payload.data.description,
        prompt: payload.data.prompt,
        negativePrompt: payload.data.negativePrompt,
      },
    });

    if (!result.ok) {
      return sendPlannerRefinementEntityError({
        reply,
        error: result.error,
      });
    }

    return reply.send({
      ok: true,
      data: result.data,
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

    const result = await updatePlannerSubjectAssets({
      projectId: params.data.projectId,
      subjectId: params.data.subjectId,
      episodeId: payload.data.episodeId,
      userId: user.id,
      referenceAssetIds: payload.data.referenceAssetIds,
      generatedAssetIds: payload.data.generatedAssetIds,
    });

    if (!result.ok) {
      return sendPlannerRefinementEntityError({
        reply,
        error: result.error,
        assetLabel: 'subject',
      });
    }

    return reply.send({
      ok: true,
      data: result.data,
    });
  });

  app.get('/api/projects/:projectId/planner/subjects/:subjectId/recommendations', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = subjectParamsSchema.safeParse(request.params);
    const payload = scopedPayloadSchema.safeParse(request.query);
    if (!params.success || !payload.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid planner subject recommendation request.',
          details: payload.success ? undefined : payload.error.flatten(),
        },
      });
    }

    const result = await getPlannerSubjectRecommendations({
      projectId: params.data.projectId,
      subjectId: params.data.subjectId,
      episodeId: payload.data.episodeId,
      userId: user.id,
    });

    if (!result.ok) {
      return sendPlannerRefinementEntityError({
        reply,
        error: result.error,
      });
    }

    return reply.send({
      ok: true,
      data: result.data,
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

    const result = await updatePlannerSceneAssets({
      projectId: params.data.projectId,
      sceneId: params.data.sceneId,
      episodeId: payload.data.episodeId,
      userId: user.id,
      referenceAssetIds: payload.data.referenceAssetIds,
      generatedAssetIds: payload.data.generatedAssetIds,
    });

    if (!result.ok) {
      return sendPlannerRefinementEntityError({
        reply,
        error: result.error,
        assetLabel: 'scene',
      });
    }

    return reply.send({
      ok: true,
      data: result.data,
    });
  });

  app.get('/api/projects/:projectId/planner/scenes/:sceneId/recommendations', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = sceneParamsSchema.safeParse(request.params);
    const payload = scopedPayloadSchema.safeParse(request.query);
    if (!params.success || !payload.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid planner scene recommendation request.',
          details: payload.success ? undefined : payload.error.flatten(),
        },
      });
    }

    const result = await getPlannerSceneRecommendations({
      projectId: params.data.projectId,
      sceneId: params.data.sceneId,
      episodeId: payload.data.episodeId,
      userId: user.id,
    });

    if (!result.ok) {
      return sendPlannerRefinementEntityError({
        reply,
        error: result.error,
      });
    }

    return reply.send({
      ok: true,
      data: result.data,
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

    const result = await updatePlannerShot({
      projectId: params.data.projectId,
      shotScriptId: params.data.shotScriptId,
      episodeId: payload.data.episodeId,
      userId: user.id,
      patch: {
        title: payload.data.title,
        visualDescription: payload.data.visualDescription,
        composition: payload.data.composition,
        cameraMotion: payload.data.cameraMotion,
        voiceRole: payload.data.voiceRole,
        dialogue: payload.data.dialogue,
      },
    });

    if (!result.ok) {
      return sendPlannerRefinementEntityError({
        reply,
        error: result.error,
      });
    }

    return reply.send({
      ok: true,
      data: result.data,
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

    const result = await deletePlannerShot({
      projectId: params.data.projectId,
      shotScriptId: params.data.shotScriptId,
      episodeId: payload.data.episodeId,
      userId: user.id,
    });

    if (!result.ok) {
      return sendPlannerRefinementEntityError({
        reply,
        error: result.error,
      });
    }

    return reply.send({
      ok: true,
      data: result.data,
    });
  });
}
