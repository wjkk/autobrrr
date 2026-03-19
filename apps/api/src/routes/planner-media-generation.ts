import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { mapRun } from '../lib/api-mappers.js';
import { requireUser } from '../lib/auth.js';
import { PLANNER_REFINEMENT_LOCKED_ERROR, queuePlannerImageGeneration } from '../lib/planner/media/generation-service.js';

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

type PlannerImageGenerationEntityKind = 'subject' | 'scene' | 'shot';

function getPlannerImageParamsSchema(entityKind: PlannerImageGenerationEntityKind) {
  if (entityKind === 'subject') {
    return subjectParamsSchema;
  }

  if (entityKind === 'scene') {
    return sceneParamsSchema;
  }

  return shotParamsSchema;
}

function getPlannerImageEntityId(args: {
  entityKind: PlannerImageGenerationEntityKind;
  params: z.infer<typeof subjectParamsSchema> | z.infer<typeof sceneParamsSchema> | z.infer<typeof shotParamsSchema>;
}) {
  if (args.entityKind === 'subject') {
    return (args.params as z.infer<typeof subjectParamsSchema>).subjectId;
  }

  if (args.entityKind === 'scene') {
    return (args.params as z.infer<typeof sceneParamsSchema>).sceneId;
  }

  return (args.params as z.infer<typeof shotParamsSchema>).shotScriptId;
}

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

function registerPlannerImageGenerationRoute(args: {
  app: FastifyInstance;
  path: string;
  entityKind: PlannerImageGenerationEntityKind;
  assetLabel: string;
  invalidPayloadMessage: string;
}) {
  args.app.post(args.path, async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = getPlannerImageParamsSchema(args.entityKind).safeParse(request.params);
    const payload = scopedPayloadSchema.safeParse(request.body);
    if (!params.success || !payload.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: args.invalidPayloadMessage,
          details: payload.success ? undefined : payload.error.flatten(),
        },
      });
    }

    const result = await queuePlannerImageGeneration({
      projectId: params.data.projectId,
      episodeId: payload.data.episodeId,
      userId: user.id,
      entityId: getPlannerImageEntityId({
        entityKind: args.entityKind,
        params: params.data,
      }),
      entityKind: args.entityKind,
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
        assetLabel: args.assetLabel,
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

export async function registerPlannerMediaGenerationRoutes(app: FastifyInstance) {
  registerPlannerImageGenerationRoute({
    app,
    path: '/api/projects/:projectId/planner/subjects/:subjectId/generate-image',
    entityKind: 'subject',
    assetLabel: 'subject image',
    invalidPayloadMessage: 'Invalid planner subject image generation payload.',
  });

  registerPlannerImageGenerationRoute({
    app,
    path: '/api/projects/:projectId/planner/scenes/:sceneId/generate-image',
    entityKind: 'scene',
    assetLabel: 'scene image',
    invalidPayloadMessage: 'Invalid planner scene image generation payload.',
  });

  registerPlannerImageGenerationRoute({
    app,
    path: '/api/projects/:projectId/planner/shot-scripts/:shotScriptId/generate-image',
    entityKind: 'shot',
    assetLabel: 'shot storyboard',
    invalidPayloadMessage: 'Invalid planner shot storyboard generation payload.',
  });
}
