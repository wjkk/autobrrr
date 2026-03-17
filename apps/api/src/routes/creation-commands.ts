import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { mapRun } from '../lib/api-mappers.js';
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

    const params = paramsSchema.safeParse(request.params);
    const payload = commandSchema.safeParse(request.body);
    if (!params.success || !payload.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid image generation payload.',
          details: payload.success ? undefined : payload.error.flatten(),
        },
      });
    }

    const result = await queueShotGenerationRun({
      projectId: params.data.projectId,
      shotId: params.data.shotId,
      userId: user.id,
      runType: 'IMAGE_GENERATION',
      modelKind: 'IMAGE',
      promptField: 'imagePrompt',
      promptOverride: payload.data.prompt,
      modelFamily: payload.data.modelFamily,
      modelEndpoint: payload.data.modelEndpoint,
      referenceAssetIds: payload.data.referenceAssetIds,
      idempotencyKey: payload.data.idempotencyKey,
      options: payload.data.options,
    });

    if (!result.ok) {
      if (result.error === 'MODEL_NOT_FOUND') {
        return reply.code(404).send({
          ok: false,
          error: {
            code: 'MODEL_NOT_FOUND',
            message: 'No active image model endpoint matched the selection.',
          },
        });
      }
      return reply.code(404).send({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Shot not found.',
        },
      });
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

    const params = paramsSchema.safeParse(request.params);
    const payload = videoCommandSchema.safeParse(request.body);
    if (!params.success || !payload.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid video generation payload.',
          details: payload.success ? undefined : payload.error.flatten(),
        },
      });
    }

    const result = await queueShotGenerationRun({
      projectId: params.data.projectId,
      shotId: params.data.shotId,
      userId: user.id,
      runType: 'VIDEO_GENERATION',
      modelKind: 'VIDEO',
      promptField: 'motionPrompt',
      promptOverride: payload.data.prompt,
      modelFamily: payload.data.modelFamily,
      modelEndpoint: payload.data.modelEndpoint,
      referenceAssetIds: payload.data.referenceAssetIds,
      idempotencyKey: payload.data.idempotencyKey,
      options: {
        ...(payload.data.options ?? {}),
        ...(payload.data.durationSeconds ? { durationSeconds: payload.data.durationSeconds } : {}),
        ...(payload.data.aspectRatio ? { aspectRatio: payload.data.aspectRatio } : {}),
        ...(payload.data.resolution ? { resolution: payload.data.resolution } : {}),
        ...(payload.data.firstFrameUrl ? { firstFrameUrl: payload.data.firstFrameUrl } : {}),
        ...(payload.data.lastFrameUrl ? { lastFrameUrl: payload.data.lastFrameUrl } : {}),
      },
    });

    if (!result.ok) {
      if (result.error === 'MODEL_NOT_FOUND') {
        return reply.code(404).send({
          ok: false,
          error: {
            code: 'MODEL_NOT_FOUND',
            message: 'No active video model endpoint matched the selection.',
          },
        });
      }
      return reply.code(404).send({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Shot not found.',
        },
      });
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
