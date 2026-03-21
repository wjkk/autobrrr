import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { mapRun } from '../lib/api-mappers.js';
import { notFound, parseOrThrow } from '../lib/app-error.js';
import { requireUser } from '../lib/auth.js';
import { queueShotGenerationRun } from '../lib/creation-run-service.js';

const paramsSchema = z.object({
  projectId: z.string().min(1),
  shotId: z.string().min(1),
});

const commandSchema = z.object({
  prompt: z.string().trim().max(10000).optional(),
  modelFamily: z.string().trim().max(120).optional(),
  modelEndpoint: z.string().trim().max(120).optional(),
  referenceAssetIds: z.array(z.string().min(1)).max(16).optional().default([]),
  idempotencyKey: z.string().trim().max(191).optional(),
  options: z.record(z.string(), z.unknown()).optional(),
});

const videoCommandSchema = commandSchema.extend({
  durationSeconds: z.number().int().positive().max(60).optional(),
  aspectRatio: z.string().trim().min(1).max(24).optional(),
  resolution: z.string().trim().min(1).max(24).optional(),
  firstFrameUrl: z.string().trim().url().optional(),
  lastFrameUrl: z.string().trim().url().optional(),
});

export async function registerCreationCommandRoutes(app: FastifyInstance) {
  app.post('/api/projects/:projectId/shots/:shotId/generate-image', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = parseOrThrow(paramsSchema, request.params, 'Invalid image generation payload.');
    const payload = parseOrThrow(commandSchema, request.body, 'Invalid image generation payload.');

    const result = await queueShotGenerationRun({
      projectId: params.projectId,
      shotId: params.shotId,
      userId: user.id,
      runType: 'IMAGE_GENERATION',
      modelKind: 'IMAGE',
      promptField: 'imagePrompt',
      promptOverride: payload.prompt,
      modelFamily: payload.modelFamily,
      modelEndpoint: payload.modelEndpoint,
      referenceAssetIds: payload.referenceAssetIds,
      idempotencyKey: payload.idempotencyKey,
      options: payload.options,
    });

    if (!result.ok) {
      if (result.error === 'MODEL_NOT_FOUND') {
        throw notFound('No active image model endpoint matched the selection.', 'MODEL_NOT_FOUND');
      }
      throw notFound('Shot not found.');
    }

    return reply.code(202).send({
      ok: true,
      data: {
        shot: {
          id: result.shot.id,
          status: result.shot.status.toLowerCase(),
          imagePrompt: result.shot.imagePrompt,
          motionPrompt: result.shot.motionPrompt,
        },
        run: mapRun(result.run),
      },
    });
  });

  app.post('/api/projects/:projectId/shots/:shotId/generate-video', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = parseOrThrow(paramsSchema, request.params, 'Invalid video generation payload.');
    const payload = parseOrThrow(videoCommandSchema, request.body, 'Invalid video generation payload.');

    const result = await queueShotGenerationRun({
      projectId: params.projectId,
      shotId: params.shotId,
      userId: user.id,
      runType: 'VIDEO_GENERATION',
      modelKind: 'VIDEO',
      promptField: 'motionPrompt',
      promptOverride: payload.prompt,
      modelFamily: payload.modelFamily,
      modelEndpoint: payload.modelEndpoint,
      referenceAssetIds: payload.referenceAssetIds,
      idempotencyKey: payload.idempotencyKey,
      options: {
        ...(payload.options ?? {}),
        ...(payload.durationSeconds ? { durationSeconds: payload.durationSeconds } : {}),
        ...(payload.aspectRatio ? { aspectRatio: payload.aspectRatio } : {}),
        ...(payload.resolution ? { resolution: payload.resolution } : {}),
        ...(payload.firstFrameUrl ? { firstFrameUrl: payload.firstFrameUrl } : {}),
        ...(payload.lastFrameUrl ? { lastFrameUrl: payload.lastFrameUrl } : {}),
      },
    });

    if (!result.ok) {
      if (result.error === 'MODEL_NOT_FOUND') {
        throw notFound('No active video model endpoint matched the selection.', 'MODEL_NOT_FOUND');
      }
      throw notFound('Shot not found.');
    }

    return reply.code(202).send({
      ok: true,
      data: {
        shot: {
          id: result.shot.id,
          status: result.shot.status.toLowerCase(),
          imagePrompt: result.shot.imagePrompt,
          motionPrompt: result.shot.motionPrompt,
        },
        run: mapRun(result.run),
      },
    });
  });
}
