import { z } from 'zod';

import { plannerOutlineDocSchema } from './planner-outline-doc.js';
import { plannerStructuredDocSchema } from './planner-doc.js';

export const plannerOperationSchema = z.object({
  replaceDocument: z.boolean().default(true),
  generateStoryboard: z.boolean().default(false),
  confirmOutline: z.boolean().default(false),
});

export const plannerStepAnalysisItemSchema = z.object({
  id: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(255),
  status: z.enum(['pending', 'running', 'done', 'failed']).default('done'),
  details: z.array(z.string().trim().min(1).max(500)).max(8).default([]),
});

export const plannerOutlineAssistantPackageSchema = z.object({
  stage: z.literal('outline').default('outline'),
  assistantMessage: z.string().trim().min(1).max(4000),
  documentTitle: z.string().trim().min(1).max(255).optional(),
  outlineDoc: plannerOutlineDocSchema,
  operations: plannerOperationSchema.default({
    replaceDocument: false,
    generateStoryboard: false,
    confirmOutline: true,
  }),
});

export const plannerRefinementAssistantPackageSchema = z.object({
  stage: z.literal('refinement').default('refinement'),
  assistantMessage: z.string().trim().min(1).max(4000),
  stepAnalysis: z.array(plannerStepAnalysisItemSchema).min(1).max(12),
  documentTitle: z.string().trim().min(1).max(255).optional(),
  structuredDoc: plannerStructuredDocSchema,
  operations: plannerOperationSchema.default({
    replaceDocument: true,
    generateStoryboard: false,
    confirmOutline: false,
  }),
});

export const plannerAssistantPackageSchema = z.union([
  plannerOutlineAssistantPackageSchema,
  plannerRefinementAssistantPackageSchema,
]);

export type PlannerOutlineAssistantPackage = z.infer<typeof plannerOutlineAssistantPackageSchema>;
export type PlannerRefinementAssistantPackage = z.infer<typeof plannerRefinementAssistantPackageSchema>;
export type PlannerAssistantPackage = z.infer<typeof plannerAssistantPackageSchema>;
export type PlannerStepAnalysisItem = z.infer<typeof plannerStepAnalysisItemSchema>;
