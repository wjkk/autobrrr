import { Prisma } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { mapAsset } from '../lib/api-mappers.js';
import { notFound, parseOrThrow } from '../lib/app-error.js';
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

function assertOwnedResourceOrThrow<T>(resource: T | null, message: string) {
  if (!resource) {
    throw notFound(message);
  }
  return resource;
}

export async function registerAssetRoutes(app: FastifyInstance) {
  app.get('/api/projects/:projectId/assets', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = parseOrThrow(projectParamsSchema, request.params, 'Invalid asset list request.');
    const query = parseOrThrow(listAssetsQuerySchema, request.query, 'Invalid asset list request.');

    const project = assertOwnedResourceOrThrow(await findOwnedProject(params.projectId, user.id), 'Project not found.');

    if (query.episodeId) {
      assertOwnedResourceOrThrow(await findOwnedEpisode(project.id, query.episodeId, user.id), 'Episode not found.');
    }

    const assets = await prisma.asset.findMany({
      where: {
        projectId: project.id,
        episodeId: query.episodeId,
        ...(query.mediaKind ? { mediaKind: query.mediaKind.toUpperCase() as 'IMAGE' | 'VIDEO' } : {}),
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

    const params = parseOrThrow(projectParamsSchema, request.params, 'Invalid asset payload.');
    const payload = parseOrThrow(createAssetSchema, request.body, 'Invalid asset payload.');

    const project = assertOwnedResourceOrThrow(await findOwnedProject(params.projectId, user.id), 'Project not found.');

    if (payload.episodeId) {
      assertOwnedResourceOrThrow(await findOwnedEpisode(project.id, payload.episodeId, user.id), 'Episode not found.');
    }

    const asset = await prisma.asset.create({
      data: {
        ownerUserId: user.id,
        projectId: project.id,
        episodeId: payload.episodeId ?? null,
        mediaKind: payload.mediaKind.toUpperCase() as 'IMAGE' | 'VIDEO',
        sourceKind: payload.sourceKind.toUpperCase() as 'UPLOAD' | 'GENERATED' | 'IMPORTED' | 'REFERENCE',
        fileName: payload.fileName,
        mimeType: payload.mimeType ?? null,
        fileSizeBytes: payload.fileSizeBytes ?? null,
        width: payload.width ?? null,
        height: payload.height ?? null,
        durationMs: payload.durationMs ?? null,
        storageKey: payload.storageKey ?? null,
        sourceUrl: payload.sourceUrl ?? null,
        ...(payload.metadata ? { metadataJson: payload.metadata as Prisma.InputJsonValue } : {}),
      },
    });

    return reply.code(201).send({
      ok: true,
      data: mapAsset(asset),
    });
  });
}

export const __testables = {
  assertOwnedResourceOrThrow,
};
