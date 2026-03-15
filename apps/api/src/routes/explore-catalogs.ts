import type { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

import { requireUser } from '../lib/auth.js';
import { catalogSubjectImageGenerationSchema, generateCatalogSubjectImageForUser } from '../lib/catalog-subject-image.js';
import { prisma } from '../lib/prisma.js';

const visibilitySchema = z.enum(['public', 'personal']);
const subjectTypeSchema = z.enum(['human', 'animal', 'creature', 'object']);
const genderTagSchema = z.enum(['unknown', 'female', 'male', 'child']);
const catalogImagePathSchema = z
  .string()
  .trim()
  .min(1)
  .max(2048)
  .refine((value) => value.startsWith('/') || z.url().safeParse(value).success, {
    message: 'Expected an absolute URL or root-relative asset path.',
  });

const listSubjectsQuerySchema = z.object({
  scope: z.enum(['all', 'public', 'personal']).optional().default('all'),
  genderTag: z.enum(['all', 'unknown', 'female', 'male', 'child']).optional().default('all'),
});

const listStylesQuerySchema = z.object({
  scope: z.enum(['all', 'public', 'personal']).optional().default('all'),
});

const subjectPayloadSchema = z.object({
  slug: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1).max(120),
  visibility: visibilitySchema.default('public'),
  subjectType: subjectTypeSchema.default('human'),
  genderTag: genderTagSchema.default('unknown'),
  previewImageUrl: catalogImagePathSchema,
  referenceImageUrl: catalogImagePathSchema.optional(),
  description: z.string().trim().max(5000).optional(),
  promptTemplate: z.string().trim().max(10000).optional(),
  negativePrompt: z.string().trim().max(10000).optional(),
  tags: z.array(z.string().trim().min(1).max(64)).max(32).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  enabled: z.boolean().optional().default(true),
  sortOrder: z.number().int().min(0).max(9999).optional().default(100),
});

const stylePayloadSchema = z.object({
  slug: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1).max(120),
  visibility: visibilitySchema.default('public'),
  previewImageUrl: catalogImagePathSchema,
  description: z.string().trim().max(5000).optional(),
  promptTemplate: z.string().trim().max(10000).optional(),
  negativePrompt: z.string().trim().max(10000).optional(),
  tags: z.array(z.string().trim().min(1).max(64)).max(32).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  enabled: z.boolean().optional().default(true),
  sortOrder: z.number().int().min(0).max(9999).optional().default(100),
});

const itemParamsSchema = z.object({
  itemId: z.string().min(1),
});

function mapSubject(subject: {
  id: string;
  slug: string;
  name: string;
  visibility: string;
  subjectType: string;
  genderTag: string;
  previewImageUrl: string;
  referenceImageUrl: string | null;
  description: string | null;
  promptTemplate: string | null;
  negativePrompt: string | null;
  tagsJson: unknown;
  metadataJson: unknown;
  enabled: boolean;
  sortOrder: number;
  ownerUserId: string | null;
}) {
  return {
    id: subject.id,
    slug: subject.slug,
    name: subject.name,
    visibility: subject.visibility.toLowerCase(),
    subjectType: subject.subjectType.toLowerCase(),
    genderTag: subject.genderTag.toLowerCase(),
    imageUrl: subject.previewImageUrl,
    referenceImageUrl: subject.referenceImageUrl,
    description: subject.description,
    promptTemplate: subject.promptTemplate,
    negativePrompt: subject.negativePrompt,
    tags: subject.tagsJson,
    metadata: subject.metadataJson,
    enabled: subject.enabled,
    sortOrder: subject.sortOrder,
    ownerUserId: subject.ownerUserId,
  };
}

function mapStyle(style: {
  id: string;
  slug: string;
  name: string;
  visibility: string;
  previewImageUrl: string;
  description: string | null;
  promptTemplate: string | null;
  negativePrompt: string | null;
  tagsJson: unknown;
  metadataJson: unknown;
  enabled: boolean;
  sortOrder: number;
  ownerUserId: string | null;
}) {
  return {
    id: style.id,
    slug: style.slug,
    name: style.name,
    visibility: style.visibility.toLowerCase(),
    imageUrl: style.previewImageUrl,
    description: style.description,
    promptTemplate: style.promptTemplate,
    negativePrompt: style.negativePrompt,
    tags: style.tagsJson,
    metadata: style.metadataJson,
    enabled: style.enabled,
    sortOrder: style.sortOrder,
    ownerUserId: style.ownerUserId,
  };
}

function buildCatalogScopeWhere(scope: 'all' | 'public' | 'personal', userId: string) {
  if (scope === 'public') {
    return { visibility: 'PUBLIC' as const };
  }

  if (scope === 'personal') {
    return {
      visibility: 'PERSONAL' as const,
      ownerUserId: userId,
    };
  }

  return {
    OR: [
      { visibility: 'PUBLIC' as const },
      {
        visibility: 'PERSONAL' as const,
        ownerUserId: userId,
      },
    ],
  };
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export async function registerExploreCatalogRoutes(app: FastifyInstance) {
  app.get('/api/explore/subjects', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const query = listSubjectsQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid subject query.',
        },
      });
    }

    const subjects = await prisma.subjectProfile.findMany({
      where: {
        ...buildCatalogScopeWhere(query.data.scope, user.id),
        enabled: true,
        ...(query.data.genderTag !== 'all' ? { genderTag: query.data.genderTag.toUpperCase() as 'UNKNOWN' | 'FEMALE' | 'MALE' | 'CHILD' } : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return reply.send({
      ok: true,
      data: subjects.map(mapSubject),
    });
  });

  app.post('/api/explore/subjects', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const payload = subjectPayloadSchema.safeParse(request.body);
    if (!payload.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid subject payload.',
          details: payload.error.flatten(),
        },
      });
    }

    const subject = await prisma.subjectProfile.create({
      data: {
        slug: payload.data.slug,
        name: payload.data.name,
        visibility: payload.data.visibility.toUpperCase() as 'PUBLIC' | 'PERSONAL',
        ...(payload.data.visibility === 'personal'
          ? {
              ownerUser: {
                connect: { id: user.id },
              },
            }
          : {}),
        subjectType: payload.data.subjectType.toUpperCase() as 'HUMAN' | 'ANIMAL' | 'CREATURE' | 'OBJECT',
        genderTag: payload.data.genderTag.toUpperCase() as 'UNKNOWN' | 'FEMALE' | 'MALE' | 'CHILD',
        previewImageUrl: payload.data.previewImageUrl,
        referenceImageUrl: payload.data.referenceImageUrl ?? null,
        description: payload.data.description ?? null,
        promptTemplate: payload.data.promptTemplate ?? null,
        negativePrompt: payload.data.negativePrompt ?? null,
        ...(payload.data.tags ? { tagsJson: toJsonValue(payload.data.tags) } : {}),
        ...(payload.data.metadata ? { metadataJson: toJsonValue(payload.data.metadata) } : {}),
        enabled: payload.data.enabled,
        sortOrder: payload.data.sortOrder,
      },
    });

    return reply.code(201).send({
      ok: true,
      data: mapSubject(subject),
    });
  });

  app.post('/api/explore/subjects/generate-image', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const payload = catalogSubjectImageGenerationSchema.safeParse(request.body);
    if (!payload.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid catalog subject image generation payload.',
          details: payload.error.flatten(),
        },
      });
    }

    try {
      const result = await generateCatalogSubjectImageForUser({
        userId: user.id,
        input: payload.data,
      });

      return reply.send({
        ok: true,
        data: result,
      });
    } catch (error) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'CATALOG_SUBJECT_IMAGE_GENERATION_FAILED',
          message: error instanceof Error ? error.message : 'Catalog subject image generation failed.',
        },
      });
    }
  });

  app.patch('/api/explore/subjects/:itemId', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = itemParamsSchema.safeParse(request.params);
    const payload = subjectPayloadSchema.partial().safeParse(request.body);
    if (!params.success || !payload.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid subject update payload.',
          details: payload.success ? undefined : payload.error.flatten(),
        },
      });
    }

    const existing = await prisma.subjectProfile.findFirst({
      where: {
        id: params.data.itemId,
        OR: [{ visibility: 'PUBLIC' }, { ownerUserId: user.id }],
      },
    });
    if (!existing) {
      return reply.code(404).send({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Subject not found.',
        },
      });
    }

    const updated = await prisma.subjectProfile.update({
      where: { id: existing.id },
      data: {
        ...(payload.data.slug ? { slug: payload.data.slug } : {}),
        ...(payload.data.name ? { name: payload.data.name } : {}),
        ...(payload.data.visibility
          ? {
              visibility: payload.data.visibility.toUpperCase() as 'PUBLIC' | 'PERSONAL',
              ownerUser:
                payload.data.visibility === 'personal'
                  ? { connect: { id: user.id } }
                  : { disconnect: true },
            }
          : {}),
        ...(payload.data.subjectType ? { subjectType: payload.data.subjectType.toUpperCase() as 'HUMAN' | 'ANIMAL' | 'CREATURE' | 'OBJECT' } : {}),
        ...(payload.data.genderTag ? { genderTag: payload.data.genderTag.toUpperCase() as 'UNKNOWN' | 'FEMALE' | 'MALE' | 'CHILD' } : {}),
        ...(payload.data.previewImageUrl ? { previewImageUrl: payload.data.previewImageUrl } : {}),
        ...(payload.data.referenceImageUrl !== undefined ? { referenceImageUrl: payload.data.referenceImageUrl ?? null } : {}),
        ...(payload.data.description !== undefined ? { description: payload.data.description ?? null } : {}),
        ...(payload.data.promptTemplate !== undefined ? { promptTemplate: payload.data.promptTemplate ?? null } : {}),
        ...(payload.data.negativePrompt !== undefined ? { negativePrompt: payload.data.negativePrompt ?? null } : {}),
        ...(payload.data.tags !== undefined ? { tagsJson: toJsonValue(payload.data.tags) } : {}),
        ...(payload.data.metadata !== undefined ? { metadataJson: toJsonValue(payload.data.metadata) } : {}),
        ...(payload.data.enabled !== undefined ? { enabled: payload.data.enabled } : {}),
        ...(payload.data.sortOrder !== undefined ? { sortOrder: payload.data.sortOrder } : {}),
      },
    });

    return reply.send({
      ok: true,
      data: mapSubject(updated),
    });
  });

  app.get('/api/explore/styles', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const query = listStylesQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid style query.',
        },
      });
    }

    const styles = await prisma.stylePreset.findMany({
      where: {
        ...buildCatalogScopeWhere(query.data.scope, user.id),
        enabled: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return reply.send({
      ok: true,
      data: styles.map(mapStyle),
    });
  });

  app.post('/api/explore/styles', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const payload = stylePayloadSchema.safeParse(request.body);
    if (!payload.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid style payload.',
          details: payload.error.flatten(),
        },
      });
    }

    const style = await prisma.stylePreset.create({
      data: {
        slug: payload.data.slug,
        name: payload.data.name,
        visibility: payload.data.visibility.toUpperCase() as 'PUBLIC' | 'PERSONAL',
        ...(payload.data.visibility === 'personal'
          ? {
              ownerUser: {
                connect: { id: user.id },
              },
            }
          : {}),
        previewImageUrl: payload.data.previewImageUrl,
        description: payload.data.description ?? null,
        promptTemplate: payload.data.promptTemplate ?? null,
        negativePrompt: payload.data.negativePrompt ?? null,
        ...(payload.data.tags ? { tagsJson: toJsonValue(payload.data.tags) } : {}),
        ...(payload.data.metadata ? { metadataJson: toJsonValue(payload.data.metadata) } : {}),
        enabled: payload.data.enabled,
        sortOrder: payload.data.sortOrder,
      },
    });

    return reply.code(201).send({
      ok: true,
      data: mapStyle(style),
    });
  });

  app.patch('/api/explore/styles/:itemId', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = itemParamsSchema.safeParse(request.params);
    const payload = stylePayloadSchema.partial().safeParse(request.body);
    if (!params.success || !payload.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid style update payload.',
          details: payload.success ? undefined : payload.error.flatten(),
        },
      });
    }

    const existing = await prisma.stylePreset.findFirst({
      where: {
        id: params.data.itemId,
        OR: [{ visibility: 'PUBLIC' }, { ownerUserId: user.id }],
      },
    });
    if (!existing) {
      return reply.code(404).send({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Style not found.',
        },
      });
    }

    const updated = await prisma.stylePreset.update({
      where: { id: existing.id },
      data: {
        ...(payload.data.slug ? { slug: payload.data.slug } : {}),
        ...(payload.data.name ? { name: payload.data.name } : {}),
        ...(payload.data.visibility
          ? {
              visibility: payload.data.visibility.toUpperCase() as 'PUBLIC' | 'PERSONAL',
              ownerUser:
                payload.data.visibility === 'personal'
                  ? { connect: { id: user.id } }
                  : { disconnect: true },
            }
          : {}),
        ...(payload.data.previewImageUrl ? { previewImageUrl: payload.data.previewImageUrl } : {}),
        ...(payload.data.description !== undefined ? { description: payload.data.description ?? null } : {}),
        ...(payload.data.promptTemplate !== undefined ? { promptTemplate: payload.data.promptTemplate ?? null } : {}),
        ...(payload.data.negativePrompt !== undefined ? { negativePrompt: payload.data.negativePrompt ?? null } : {}),
        ...(payload.data.tags !== undefined ? { tagsJson: toJsonValue(payload.data.tags) } : {}),
        ...(payload.data.metadata !== undefined ? { metadataJson: toJsonValue(payload.data.metadata) } : {}),
        ...(payload.data.enabled !== undefined ? { enabled: payload.data.enabled } : {}),
        ...(payload.data.sortOrder !== undefined ? { sortOrder: payload.data.sortOrder } : {}),
      },
    });

    return reply.send({
      ok: true,
      data: mapStyle(updated),
    });
  });
}
