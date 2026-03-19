import type { FastifyReply } from 'fastify';
import { z } from 'zod';

import { PLANNER_REFINEMENT_LOCKED_ERROR } from '../lib/planner/refinement/entity-service.js';

export const subjectParamsSchema = z.object({
  projectId: z.string().min(1),
  subjectId: z.string().min(1),
});

export const sceneParamsSchema = z.object({
  projectId: z.string().min(1),
  sceneId: z.string().min(1),
});

export const shotParamsSchema = z.object({
  projectId: z.string().min(1),
  shotScriptId: z.string().min(1),
});

export const scopedPayloadSchema = z.object({
  episodeId: z.string().min(1),
});

export const subjectPayloadSchema = scopedPayloadSchema.extend({
  name: z.string().trim().min(1).max(120).optional(),
  role: z.string().trim().min(1).max(120).optional(),
  appearance: z.string().trim().min(1).max(2000).optional(),
  personality: z.string().trim().min(1).max(2000).nullable().optional(),
  prompt: z.string().trim().min(1).max(2000).optional(),
  negativePrompt: z.string().trim().min(1).max(2000).nullable().optional(),
});

export const scenePayloadSchema = scopedPayloadSchema.extend({
  name: z.string().trim().min(1).max(120).optional(),
  time: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().min(1).max(2000).optional(),
  prompt: z.string().trim().min(1).max(2000).optional(),
  negativePrompt: z.string().trim().min(1).max(2000).nullable().optional(),
});

export const shotPayloadSchema = scopedPayloadSchema.extend({
  title: z.string().trim().min(1).max(255).optional(),
  visualDescription: z.string().trim().min(1).max(2000).optional(),
  composition: z.string().trim().min(1).max(1000).optional(),
  cameraMotion: z.string().trim().min(1).max(1000).optional(),
  voiceRole: z.string().trim().min(1).max(120).optional(),
  dialogue: z.string().trim().min(1).max(1000).optional(),
});

export const assetBindingPayloadSchema = scopedPayloadSchema.extend({
  referenceAssetIds: z.array(z.string().min(1)).max(16).optional(),
  generatedAssetIds: z.array(z.string().min(1)).max(16).optional(),
});

export type PlannerRefinementEntityRouteError =
  | 'REFINEMENT_REQUIRED'
  | 'REFINEMENT_LOCKED'
  | 'ASSET_NOT_OWNED'
  | 'SUBJECT_NOT_FOUND'
  | 'SCENE_NOT_FOUND'
  | 'SHOT_NOT_FOUND';

export function sendInvalidArgument(reply: FastifyReply, message: string, details?: unknown) {
  return reply.code(400).send({
    ok: false,
    error: {
      code: 'INVALID_ARGUMENT',
      message,
      details,
    },
  });
}

export function sendPlannerRefinementEntityError(args: {
  reply: FastifyReply;
  error: PlannerRefinementEntityRouteError;
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
