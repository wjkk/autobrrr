import { z } from 'zod';

import { buildFallbackPlannerOutlineDoc, plannerOutlineDocSchema } from './planner-outline-doc.js';
import { buildFallbackPlannerStructuredDoc, plannerStructuredDocSchema } from './planner-doc.js';

const plannerOperationSchema = z.object({
  replaceDocument: z.boolean().default(true),
  generateStoryboard: z.boolean().default(false),
  confirmOutline: z.boolean().default(false),
});

const plannerStepAnalysisItemSchema = z.object({
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

function stripCodeFence(text: string) {
  const trimmed = text.trim();
  if (!trimmed.startsWith('```')) {
    return trimmed;
  }

  return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
}

function extractJsonCandidate(text: string) {
  const stripped = stripCodeFence(text);
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  return stripped.slice(start, end + 1);
}

export function buildFallbackPlannerOutlineAssistantPackage(args: {
  userPrompt: string;
  projectTitle: string;
  contentType: string;
  subtype: string;
  contentMode?: string | null;
  generatedText: string;
}) {
  const outlineDoc = buildFallbackPlannerOutlineDoc({
    userPrompt: args.userPrompt,
    projectTitle: args.projectTitle,
    contentType: args.contentType,
    subtype: args.subtype,
    contentMode: args.contentMode,
    rawText: args.generatedText,
  });

  return plannerOutlineAssistantPackageSchema.parse({
    stage: 'outline',
    assistantMessage: `已根据当前需求生成可确认的大纲版本。请确认故事走向、角色设定和集数结构，再进入细化剧情内容。`,
    documentTitle: outlineDoc.projectTitle,
    outlineDoc,
    operations: {
      replaceDocument: false,
      generateStoryboard: false,
      confirmOutline: true,
    },
  });
}

export function buildFallbackPlannerRefinementAssistantPackage(args: {
  userPrompt: string;
  projectTitle: string;
  episodeTitle: string;
  generatedText: string;
  defaultSteps: PlannerStepAnalysisItem[];
  contentType: string;
  subtype: string;
}) {
  const structuredDoc = buildFallbackPlannerStructuredDoc({
    userPrompt: args.userPrompt,
    projectTitle: args.projectTitle,
    episodeTitle: args.episodeTitle,
    rawText: args.generatedText,
  });

  return plannerRefinementAssistantPackageSchema.parse({
    stage: 'refinement',
    assistantMessage: `已按${args.contentType} / ${args.subtype}的逻辑完成细化，并将内容更新到右侧文档。`,
    stepAnalysis: args.defaultSteps,
    documentTitle: structuredDoc.projectTitle,
    structuredDoc,
    operations: {
      replaceDocument: true,
      generateStoryboard: false,
      confirmOutline: false,
    },
  });
}

export function parsePlannerAssistantPackage(args: {
  targetStage: 'outline' | 'refinement';
  rawText: string;
  userPrompt: string;
  projectTitle: string;
  episodeTitle: string;
  defaultSteps: PlannerStepAnalysisItem[];
  contentType: string;
  subtype: string;
  contentMode?: string | null;
}) {
  const candidate = extractJsonCandidate(args.rawText);
  if (!candidate) {
    return args.targetStage === 'outline'
      ? buildFallbackPlannerOutlineAssistantPackage({
          userPrompt: args.userPrompt,
          projectTitle: args.projectTitle,
          contentType: args.contentType,
          subtype: args.subtype,
          contentMode: args.contentMode,
          generatedText: args.rawText,
        })
      : buildFallbackPlannerRefinementAssistantPackage({
          userPrompt: args.userPrompt,
          projectTitle: args.projectTitle,
          episodeTitle: args.episodeTitle,
          generatedText: args.rawText,
          defaultSteps: args.defaultSteps,
          contentType: args.contentType,
          subtype: args.subtype,
        });
  }

  try {
    const parsed = JSON.parse(candidate) as unknown;
    const packageCandidate = plannerAssistantPackageSchema.parse(parsed);
    if (packageCandidate.stage === args.targetStage) {
      return packageCandidate;
    }
  } catch {
    // fall through to stage-specific fallback
  }

  return args.targetStage === 'outline'
    ? buildFallbackPlannerOutlineAssistantPackage({
        userPrompt: args.userPrompt,
        projectTitle: args.projectTitle,
        contentType: args.contentType,
        subtype: args.subtype,
        contentMode: args.contentMode,
        generatedText: args.rawText,
      })
    : buildFallbackPlannerRefinementAssistantPackage({
        userPrompt: args.userPrompt,
        projectTitle: args.projectTitle,
        episodeTitle: args.episodeTitle,
        generatedText: args.rawText,
        defaultSteps: args.defaultSteps,
        contentType: args.contentType,
        subtype: args.subtype,
      });
}
