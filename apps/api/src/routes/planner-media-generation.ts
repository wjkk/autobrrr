import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { mapRun } from '../lib/api-mappers.js';
import { requireUser } from '../lib/auth.js';
import { PLANNER_REFINEMENT_LOCKED_ERROR, queuePlannerImageGeneration } from '../lib/planner-media-generation-service.js';

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

function sendPlannerImageError(args: {
  reply: {
    code: (statusCode: number) => { send: (payload: unknown) => unknown };
  };
  error:
    | 'REFINEMENT_REQUIRED'
    | 'REFINEMENT_LOCKED'
    | 'MODEL_NOT_FOUND'
    | 'ASSET_NOT_OWNED'
    | 'SUBJECT_NOT_FOUND'
    | 'SCENE_NOT_FOUND'
    | 'SHOT_NOT_FOUND';
  assetLabel: string;
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

  if (args.error === 'MODEL_NOT_FOUND') {
    return args.reply.code(404).send({
      ok: false,
      error: {
        code: 'MODEL_NOT_FOUND',
        message: 'No active image model endpoint matched the selection.',
      },
    });
  }

  if (args.error === 'ASSET_NOT_OWNED') {
    return args.reply.code(400).send({
      ok: false,
      error: {
        code: 'PLANNER_ASSET_NOT_OWNED',
        message: `One or more ${args.assetLabel} reference assets are invalid or not owned by the current user.`,
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
      message: 'Planner shot script not found.',
    },
  });
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

    const result = await queuePlannerImageGeneration({
      projectId: params.data.projectId,
      episodeId: payload.data.episodeId,
      userId: user.id,
      entityId: params.data.subjectId,
      entityKind: 'subject',
      prompt: payload.data.prompt,
      modelFamily: payload.data.modelFamily,
      modelEndpoint: payload.data.modelEndpoint,
      referenceAssetIds: payload.data.referenceAssetIds,
      idempotencyKey: payload.data.idempotencyKey,
      options: payload.data.options,
    });

    if (!result.ok) {
      return sendPlannerImageError({
        reply,
        error: result.error,
        assetLabel: 'subject image',
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

    const result = await queuePlannerImageGeneration({
      projectId: params.data.projectId,
      episodeId: payload.data.episodeId,
      userId: user.id,
      entityId: params.data.sceneId,
      entityKind: 'scene',
      prompt: payload.data.prompt,
      modelFamily: payload.data.modelFamily,
      modelEndpoint: payload.data.modelEndpoint,
      referenceAssetIds: payload.data.referenceAssetIds,
      idempotencyKey: payload.data.idempotencyKey,
      options: payload.data.options,
    });

    if (!result.ok) {
      return sendPlannerImageError({
        reply,
        error: result.error,
        assetLabel: 'scene image',
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

    const result = await queuePlannerImageGeneration({
      projectId: params.data.projectId,
      episodeId: payload.data.episodeId,
      userId: user.id,
      entityId: params.data.shotScriptId,
      entityKind: 'shot',
      prompt: payload.data.prompt,
      modelFamily: payload.data.modelFamily,
      modelEndpoint: payload.data.modelEndpoint,
      referenceAssetIds: payload.data.referenceAssetIds,
      idempotencyKey: payload.data.idempotencyKey,
      options: payload.data.options,
    });

    if (!result.ok) {
      return sendPlannerImageError({
        reply,
        error: result.error,
        assetLabel: 'shot storyboard',
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
