import { Prisma } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { mapAsset } from '../lib/api-mappers.js';
import { requireUser } from '../lib/auth.js';
import { findOwnedEpisode, findOwnedProject } from '../lib/ownership.js';
import { prisma } from '../lib/prisma.js';

const projectParamsSchema = z.object({
  projectId: z.string().min(1),
});

const createAssetSchema = z.object({
  episodeId: z.string().min(1).optional(),
  mediaKind: z.enum(['image', 'video']),
  sourceKind: z.enum(['upload', 'generated', 'imported', 'reference']).default('upload'),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(120).optional(),
  fileSizeBytes: z.number().int().nonnegative().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  durationMs: z.number().int().nonnegative().optional(),
  storageKey: z.string().trim().min(1).max(255).optional(),
  sourceUrl: z.url().max(2048).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const listAssetsQuerySchema = z.object({
  episodeId: z.string().min(1).optional(),
  mediaKind: z.enum(['image', 'video']).optional(),
});

export async function registerAssetRoutes(app: FastifyInstance) {
  app.get('/api/projects/:projectId/assets', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = projectParamsSchema.safeParse(request.params);
    const query = listAssetsQuerySchema.safeParse(request.query);
    if (!params.success || !query.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid asset list request.',
        },
      });
    }

    const project = await findOwnedProject(params.data.projectId, user.id);
    if (!project) {
      return reply.code(404).send({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Project not found.',
        },
      });
    }

    if (query.data.episodeId) {
      const episode = await findOwnedEpisode(project.id, query.data.episodeId, user.id);
      if (!episode) {
        return reply.code(404).send({
          ok: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Episode not found.',
          },
        });
      }
    }

    const assets = await prisma.asset.findMany({
      where: {
        projectId: project.id,
        episodeId: query.data.episodeId,
        ...(query.data.mediaKind ? { mediaKind: query.data.mediaKind.toUpperCase() as 'IMAGE' | 'VIDEO' } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send({
      ok: true,
      data: assets.map(mapAsset),
    });
  });

  app.post('/api/projects/:projectId/assets', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = projectParamsSchema.safeParse(request.params);
    const payload = createAssetSchema.safeParse(request.body);
    if (!params.success || !payload.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid asset payload.',
          details: payload.success ? undefined : payload.error.flatten(),
        },
      });
    }

    const project = await findOwnedProject(params.data.projectId, user.id);
    if (!project) {
      return reply.code(404).send({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Project not found.',
        },
      });
    }

    if (payload.data.episodeId) {
      const episode = await findOwnedEpisode(project.id, payload.data.episodeId, user.id);
      if (!episode) {
        return reply.code(404).send({
          ok: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Episode not found.',
          },
        });
      }
    }

    const asset = await prisma.asset.create({
      data: {
        ownerUserId: user.id,
        projectId: project.id,
        episodeId: payload.data.episodeId ?? null,
        mediaKind: payload.data.mediaKind.toUpperCase() as 'IMAGE' | 'VIDEO',
        sourceKind: payload.data.sourceKind.toUpperCase() as 'UPLOAD' | 'GENERATED' | 'IMPORTED' | 'REFERENCE',
        fileName: payload.data.fileName,
        mimeType: payload.data.mimeType ?? null,
        fileSizeBytes: payload.data.fileSizeBytes ?? null,
        width: payload.data.width ?? null,
        height: payload.data.height ?? null,
        durationMs: payload.data.durationMs ?? null,
        storageKey: payload.data.storageKey ?? null,
        sourceUrl: payload.data.sourceUrl ?? null,
        ...(payload.data.metadata ? { metadataJson: payload.data.metadata as Prisma.InputJsonValue } : {}),
      },
    });

    return reply.code(201).send({
      ok: true,
      data: mapAsset(asset),
    });
  });
}
