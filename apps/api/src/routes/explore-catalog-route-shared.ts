import { z } from 'zod';

export const visibilitySchema = z.enum(['public', 'personal']);
export const subjectTypeSchema = z.enum(['human', 'animal', 'creature', 'object']);
export const genderTagSchema = z.enum(['unknown', 'female', 'male', 'child']);
export const catalogImagePathSchema = z
  .string()
  .trim()
  .min(1)
  .max(2048)
  .refine((value) => value.startsWith('/') || z.url().safeParse(value).success, {
    message: 'Expected an absolute URL or root-relative asset path.',
  });

export const listSubjectsQuerySchema = z.object({
  scope: z.enum(['all', 'public', 'personal']).optional().default('all'),
  genderTag: z.enum(['all', 'unknown', 'female', 'male', 'child']).optional().default('all'),
});

export const listStylesQuerySchema = z.object({
  scope: z.enum(['all', 'public', 'personal']).optional().default('all'),
});

export const subjectPayloadSchema = z.object({
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

export const stylePayloadSchema = z.object({
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

export const itemParamsSchema = z.object({
  itemId: z.string().min(1),
});
