import {
  plannerAssistantPackageSchema,
  plannerOutlineAssistantPackageSchema,
  plannerRefinementAssistantPackageSchema,
  type PlannerAssistantPackage,
  type PlannerOutlineAssistantPackage,
  type PlannerRefinementAssistantPackage,
  type PlannerStepAnalysisItem,
} from './planner-agent-package-schemas.js';
import { normalizePlannerAssistantPackageCandidate } from './planner-agent-normalizers.js';
import { extractJsonCandidate } from './planner-json-candidate.js';
import { buildFallbackPlannerOutlineDoc } from './planner-outline-doc.js';
import { buildFallbackPlannerStructuredDoc } from './planner-doc.js';

export {
  plannerAssistantPackageSchema,
  plannerOutlineAssistantPackageSchema,
  plannerRefinementAssistantPackageSchema,
  type PlannerAssistantPackage,
  type PlannerOutlineAssistantPackage,
  type PlannerRefinementAssistantPackage,
  type PlannerStepAnalysisItem,
};

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
    assistantMessage: '已根据当前需求生成可确认的大纲版本。请确认故事走向、角色设定和集数结构，再进入细化剧情内容。',
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
  return inspectPlannerAssistantPackage(args).assistantPackage;
}

export function inspectPlannerAssistantPackage(args: {
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
  const buildFallbackPackage = () =>
    args.targetStage === 'outline'
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

  if (!candidate) {
    return {
      rawCandidate: null,
      normalizedCandidate: null,
      assistantPackage: buildFallbackPackage(),
    };
  }

  try {
    const parsed = JSON.parse(candidate) as unknown;
    const normalized = normalizePlannerAssistantPackageCandidate({
      parsed,
      userPrompt: args.userPrompt,
      projectTitle: args.projectTitle,
      episodeTitle: args.episodeTitle,
      defaultSteps: args.defaultSteps,
      contentType: args.contentType,
      subtype: args.subtype,
      contentMode: args.contentMode,
      rawText: args.rawText,
    });
    const packageCandidate = plannerAssistantPackageSchema.parse(normalized);
    if (packageCandidate.stage === args.targetStage) {
      return {
        rawCandidate: parsed,
        normalizedCandidate: normalized,
        assistantPackage: packageCandidate,
      };
    }
  } catch {
    // fall through to stage-specific fallback
  }

  return {
    rawCandidate: null,
    normalizedCandidate: null,
    assistantPackage: buildFallbackPackage(),
  };
}
