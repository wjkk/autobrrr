import type { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

import { mapRun } from '../lib/api-mappers.js';
import { requireUser } from '../lib/auth.js';
import { resolveModelSelection } from '../lib/model-registry.js';
import { findOwnedShot } from '../lib/ownership.js';
import { prisma } from '../lib/prisma.js';
import { resolveUserDefaultModelSelection } from '../lib/user-model-defaults.js';

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
});

async function createGenerationRun(args: {
  projectId: string;
  shotId: string;
  userId: string;
  runType: 'IMAGE_GENERATION' | 'VIDEO_GENERATION';
  modelKind: 'IMAGE' | 'VIDEO';
  promptField: 'imagePrompt' | 'motionPrompt';
  promptOverride?: string;
  modelFamily?: string;
  modelEndpoint?: string;
  referenceAssetIds: string[];
  idempotencyKey?: string;
  options?: Record<string, unknown>;
}) {
  const shot = await findOwnedShot(args.projectId, args.shotId, args.userId);
  if (!shot) {
    return { error: 'NOT_FOUND' as const };
  }

  const userDefaultModel = !args.modelFamily && !args.modelEndpoint
    ? await resolveUserDefaultModelSelection(args.userId, args.modelKind)
    : null;

  const resolvedModel = await resolveModelSelection({
    modelKind: args.modelKind,
    familySlug: args.modelFamily ?? userDefaultModel?.familySlug,
    endpointSlug: args.modelEndpoint ?? userDefaultModel?.endpointSlug,
    strategy: 'default',
  });
  if (!resolvedModel) {
    return { error: 'MODEL_NOT_FOUND' as const };
  }

  const effectivePrompt = args.promptOverride ?? shot[args.promptField];

  const result = await prisma.$transaction(async (tx) => {
    await tx.project.update({
      where: { id: shot.projectId },
      data: { status: 'CREATING' },
    });

    await tx.episode.update({
      where: { id: shot.episodeId },
      data: { status: 'CREATING' },
    });

    const updatedShot = await tx.shot.update({
      where: { id: shot.id },
      data: {
        status: 'QUEUED',
        ...(args.promptOverride
          ? args.promptField === 'imagePrompt'
            ? { imagePrompt: args.promptOverride }
            : { motionPrompt: args.promptOverride }
          : {}),
      },
      include: {
        activeVersion: {
          select: {
            id: true,
            label: true,
            mediaKind: true,
            status: true,
          },
        },
      },
    });

    const run = await tx.run.create({
      data: {
        projectId: shot.projectId,
        episodeId: shot.episodeId,
        modelFamilyId: resolvedModel.family.id,
        modelProviderId: resolvedModel.provider.id,
        modelEndpointId: resolvedModel.endpoint.id,
        runType: args.runType,
        resourceType: 'shot',
        resourceId: shot.id,
        status: 'QUEUED',
        executorType: 'SYSTEM_WORKER',
        idempotencyKey: args.idempotencyKey ?? null,
        inputJson: {
          shotId: shot.id,
          prompt: effectivePrompt,
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

    return { shot: updatedShot, run };
  });

  return result;
}

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

    const result = await createGenerationRun({
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

    if ('error' in result) {
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

    const result = await createGenerationRun({
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
      },
    });

    if ('error' in result) {
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
