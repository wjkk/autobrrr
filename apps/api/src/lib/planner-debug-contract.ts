import { z } from 'zod';

const detailJsonSchema = z.record(z.string(), z.unknown());

export const plannerAssetSchema = z.object({
  id: z.string().trim().min(1).max(191),
  fileName: z.string().trim().max(255).optional(),
  sourceUrl: z.string().trim().max(2000).nullable().optional(),
  sourceKind: z.string().trim().max(64).optional(),
  createdAt: z.string().trim().max(64).optional(),
});

export const debugRunSchema = z.object({
  contentType: z.string().trim().min(1).max(64),
  subtype: z.string().trim().min(1).max(64),
  subAgentId: z.string().trim().min(1).max(191).optional(),
  configSource: z.enum(['draft', 'published']).default('draft'),
  targetStage: z.enum(['outline', 'refinement']).default('refinement'),
  partialRerunScope: z.enum(['none', 'subject_only', 'scene_only', 'shots_only']).default('none'),
  projectTitle: z.string().trim().min(1).max(255).default('调试项目'),
  episodeTitle: z.string().trim().min(1).max(255).default('第1集'),
  userPrompt: z.string().trim().min(1).max(20000),
  scriptContent: z.string().trim().max(50000).optional(),
  selectedSubjectName: z.string().trim().max(255).optional(),
  selectedStyleName: z.string().trim().max(255).optional(),
  selectedImageModelLabel: z.string().trim().max(255).optional(),
  targetVideoModelFamilySlug: z.string().trim().max(120).optional(),
  priorMessages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    text: z.string().trim().min(1).max(4000),
  })).max(12).default([]),
  currentOutlineDoc: detailJsonSchema.optional(),
  currentStructuredDoc: detailJsonSchema.optional(),
  targetEntity: detailJsonSchema.optional(),
  plannerAssets: z.array(plannerAssetSchema).max(48).default([]),
  modelFamily: z.string().trim().max(120).optional(),
  modelEndpoint: z.string().trim().max(120).optional(),
});

export const debugRunListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  subAgentSlug: z.string().trim().max(120).optional(),
  compareGroupKey: z.string().trim().max(191).optional(),
});

export const debugCompareSchema = debugRunSchema.extend({
  leftSubAgentId: z.string().trim().min(1).max(191),
  rightSubAgentId: z.string().trim().min(1).max(191),
});

export type PlannerDebugRunInput = z.infer<typeof debugRunSchema>;
export type PlannerDebugRunListQuery = z.infer<typeof debugRunListQuerySchema>;
export type PlannerDebugCompareInput = z.infer<typeof debugCompareSchema>;
