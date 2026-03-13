import type { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

import { mapRun } from '../lib/api-mappers.js';
import { requireUser } from '../lib/auth.js';
import { resolveModelSelection } from '../lib/model-registry.js';
import { findOwnedEpisode } from '../lib/ownership.js';
import { prisma } from '../lib/prisma.js';

const paramsSchema = z.object({
  projectId: z.string().min(1),
});

const payloadSchema = z.object({
  episodeId: z.string().min(1),
  prompt: z.string().trim().min(1).max(10000).optional(),
  modelFamily: z.string().trim().max(120).optional(),
  modelEndpoint: z.string().trim().max(120).optional(),
  idempotencyKey: z.string().trim().max(191).optional(),
});

async function findOrCreateActivePlannerSession(projectId: string, episodeId: string, userId: string) {
  const existing = await prisma.plannerSession.findFirst({
    where: {
      projectId,
      episodeId,
      isActive: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (existing) {
    return existing;
  }

  const created = await prisma.plannerSession.create({
    data: {
      projectId,
      episodeId,
      status: 'IDLE',
      isActive: true,
      createdById: userId,
    },
  });

  await prisma.episode.update({
    where: { id: episodeId },
    data: {
      activePlannerSessionId: created.id,
    },
  });

  return created;
}

export async function registerPlannerCommandRoutes(app: FastifyInstance) {
  app.post('/api/projects/:projectId/planner/generate-doc', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = paramsSchema.safeParse(request.params);
    const payload = payloadSchema.safeParse(request.body);
    if (!params.success || !payload.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid planner generation payload.',
          details: payload.success ? undefined : payload.error.flatten(),
        },
      });
    }

    const episode = await findOwnedEpisode(params.data.projectId, payload.data.episodeId, user.id);
    if (!episode) {
      return reply.code(404).send({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Episode not found.',
        },
      });
    }

    const resolvedModel = await resolveModelSelection({
      modelKind: 'TEXT',
      familySlug: payload.data.modelFamily,
      endpointSlug: payload.data.modelEndpoint,
      strategy: 'default',
    });
    if (!resolvedModel) {
      return reply.code(404).send({
        ok: false,
        error: {
          code: 'MODEL_NOT_FOUND',
          message: 'No active text model endpoint matched the selection.',
        },
      });
    }

    const plannerSession = await findOrCreateActivePlannerSession(episode.project.id, episode.id, user.id);
    const effectivePrompt = payload.data.prompt ?? episode.summary ?? episode.project.title;

    const result = await prisma.$transaction(async (tx) => {
      await tx.plannerSession.update({
        where: { id: plannerSession.id },
        data: {
          status: 'UPDATING',
        },
      });

      const run = await tx.run.create({
        data: {
          projectId: episode.project.id,
          episodeId: episode.id,
          modelFamilyId: resolvedModel.family.id,
          modelProviderId: resolvedModel.provider.id,
          modelEndpointId: resolvedModel.endpoint.id,
          runType: 'PLANNER_DOC_UPDATE',
          resourceType: 'planner_session',
          resourceId: plannerSession.id,
          status: 'QUEUED',
          executorType: 'SYSTEM_WORKER',
          idempotencyKey: payload.data.idempotencyKey ?? null,
          inputJson: {
            plannerSessionId: plannerSession.id,
            episodeId: episode.id,
            projectId: episode.project.id,
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
          } as Prisma.InputJsonValue,
        },
      });

      return run;
    });

    return reply.code(202).send({
      ok: true,
      data: {
        plannerSession: {
          id: plannerSession.id,
          status: 'updating',
        },
        run: mapRun(result),
      },
    });
  });
}
