export interface PlannerInputSchemaEditorState {
  required: string[];
  optional: string[];
  language: string;
  userPromptMaxLength: string;
  priorMessagesMaxLength: string;
  plannerAssetsMaxLength: string;
  stages: string[];
  partialRerunScopes: string[];
}

export interface PlannerOutputSchemaEditorState {
  outlineRequired: string[];
  refinementRequired: string[];
  structuredDocRequired: string[];
  shotFields: string[];
  rules: string[];
}

export interface PlannerToolPolicyEditorState {
  mode: string;
  emphasis: string;
  allowedStages: string[];
  partialRerunScopes: string[];
  allowSubjectAssetPlanning: boolean;
  allowSceneAssetPlanning: boolean;
  allowDocumentRewrite: boolean;
  allowStoryboardGeneration: boolean;
  requireStructuredDoc: boolean;
  allowPlannerAssetContext: boolean;
  preferGeneratedAssetAsPrimary: boolean;
  allowReferenceAssetBinding: boolean;
  allowImageDraftGeneration: boolean;
  preserveUnrelatedEntitiesDuringPartialRerun: boolean;
  requireStructuredJsonOutput: boolean;
  requireStepAnalysisOnRefinement: boolean;
}

export interface PlannerGenerationConfigEditorState {
  outlineTemperature: string;
  outlineMaxOutputTokens: string;
  outlineTopP: string;
  refinementTemperature: string;
  refinementMaxOutputTokens: string;
  refinementTopP: string;
  responseFormat: string;
  retryMaxAttempts: string;
  allowFallback: boolean;
  requireDocumentTitle: boolean;
  requireOperationsBlock: boolean;
  requireEntityPrompts: boolean;
}

function toStringArray(value: unknown, fallback: string[] = []) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : fallback;
}

function toObject(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function readString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function readBoolean(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function readNumberString(value: unknown, fallback = '') {
  return typeof value === 'number' ? String(value) : typeof value === 'string' ? value : fallback;
}

export function normalizeInputSchema(value: unknown): PlannerInputSchemaEditorState {
  const schema = toObject(value);
  const constraints = toObject(schema.constraints);
  return {
    required: toStringArray(schema.required, ['projectTitle', 'episodeTitle', 'userPrompt']),
    optional: toStringArray(schema.optional),
    language: readString(constraints.language, 'zh-CN'),
    userPromptMaxLength: readNumberString(constraints.userPromptMaxLength, '20000'),
    priorMessagesMaxLength: readNumberString(constraints.priorMessagesMaxLength, '12'),
    plannerAssetsMaxLength: readNumberString(constraints.plannerAssetsMaxLength, '48'),
    stages: toStringArray(constraints.stages, ['outline', 'refinement']),
    partialRerunScopes: toStringArray(constraints.partialRerunScopes, ['none', 'subject_only', 'scene_only', 'shots_only']),
  };
}

export function serializeInputSchema(value: PlannerInputSchemaEditorState) {
  return {
    required: value.required.filter(Boolean),
    optional: value.optional.filter(Boolean),
    constraints: {
      language: value.language.trim() || 'zh-CN',
      userPromptMaxLength: Number(value.userPromptMaxLength || '20000'),
      priorMessagesMaxLength: Number(value.priorMessagesMaxLength || '12'),
      plannerAssetsMaxLength: Number(value.plannerAssetsMaxLength || '48'),
      stages: value.stages.filter(Boolean),
      partialRerunScopes: value.partialRerunScopes.filter(Boolean),
    },
  };
}

export function normalizeOutputSchema(value: unknown): PlannerOutputSchemaEditorState {
  const schema = toObject(value);
  const stages = toObject(schema.stages);
  const outline = toObject(stages.outline);
  const refinement = toObject(stages.refinement);
  const structuredDoc = toObject(schema.structuredDoc);
  return {
    outlineRequired: toStringArray(outline.required, ['stage', 'assistantMessage', 'documentTitle', 'outlineDoc', 'operations']),
    refinementRequired: toStringArray(refinement.required, ['stage', 'assistantMessage', 'stepAnalysis', 'documentTitle', 'structuredDoc', 'operations']),
    structuredDocRequired: toStringArray(structuredDoc.required),
    shotFields: toStringArray(structuredDoc.shotFields),
    rules: toStringArray(schema.rules),
  };
}

export function serializeOutputSchema(value: PlannerOutputSchemaEditorState) {
  return {
    stages: {
      outline: {
        required: value.outlineRequired.filter(Boolean),
        stageValue: 'outline',
      },
      refinement: {
        required: value.refinementRequired.filter(Boolean),
        stageValue: 'refinement',
      },
    },
    structuredDoc: {
      required: value.structuredDocRequired.filter(Boolean),
      shotFields: value.shotFields.filter(Boolean),
    },
    rules: value.rules.filter(Boolean),
  };
}

export function normalizeToolPolicy(value: unknown): PlannerToolPolicyEditorState {
  const policy = toObject(value);
  const assetStrategy = toObject(policy.assetStrategy);
  const constraints = toObject(policy.constraints);
  return {
    mode: readString(policy.mode),
    emphasis: readString(policy.emphasis),
    allowedStages: toStringArray(policy.allowedStages, ['outline', 'refinement']),
    partialRerunScopes: toStringArray(policy.partialRerunScopes, ['subject_only', 'scene_only', 'shots_only']),
    allowSubjectAssetPlanning: readBoolean(policy.allowSubjectAssetPlanning, true),
    allowSceneAssetPlanning: readBoolean(policy.allowSceneAssetPlanning, true),
    allowDocumentRewrite: readBoolean(policy.allowDocumentRewrite, true),
    allowStoryboardGeneration: readBoolean(policy.allowStoryboardGeneration, false),
    requireStructuredDoc: readBoolean(policy.requireStructuredDoc, true),
    allowPlannerAssetContext: readBoolean(assetStrategy.allowPlannerAssetContext, true),
    preferGeneratedAssetAsPrimary: readBoolean(assetStrategy.preferGeneratedAssetAsPrimary, true),
    allowReferenceAssetBinding: readBoolean(assetStrategy.allowReferenceAssetBinding, true),
    allowImageDraftGeneration: readBoolean(assetStrategy.allowImageDraftGeneration, true),
    preserveUnrelatedEntitiesDuringPartialRerun: readBoolean(constraints.preserveUnrelatedEntitiesDuringPartialRerun, true),
    requireStructuredJsonOutput: readBoolean(constraints.requireStructuredJsonOutput, true),
    requireStepAnalysisOnRefinement: readBoolean(constraints.requireStepAnalysisOnRefinement, true),
  };
}

export function serializeToolPolicy(value: PlannerToolPolicyEditorState) {
  return {
    mode: value.mode.trim(),
    emphasis: value.emphasis.trim(),
    allowedStages: value.allowedStages.filter(Boolean),
    partialRerunScopes: value.partialRerunScopes.filter(Boolean),
    assetStrategy: {
      allowPlannerAssetContext: value.allowPlannerAssetContext,
      preferGeneratedAssetAsPrimary: value.preferGeneratedAssetAsPrimary,
      allowReferenceAssetBinding: value.allowReferenceAssetBinding,
      allowImageDraftGeneration: value.allowImageDraftGeneration,
    },
    constraints: {
      preserveUnrelatedEntitiesDuringPartialRerun: value.preserveUnrelatedEntitiesDuringPartialRerun,
      requireStructuredJsonOutput: value.requireStructuredJsonOutput,
      requireStepAnalysisOnRefinement: value.requireStepAnalysisOnRefinement,
    },
    allowSubjectAssetPlanning: value.allowSubjectAssetPlanning,
    allowSceneAssetPlanning: value.allowSceneAssetPlanning,
    allowDocumentRewrite: value.allowDocumentRewrite,
    allowStoryboardGeneration: value.allowStoryboardGeneration,
    requireStructuredDoc: value.requireStructuredDoc,
  };
}

export function normalizeGenerationConfig(value: unknown): PlannerGenerationConfigEditorState {
  const config = toObject(value);
  const stageProfiles = toObject(config.stageProfiles);
  const outline = toObject(stageProfiles.outline);
  const refinement = toObject(stageProfiles.refinement);
  const retryPolicy = toObject(config.retryPolicy);
  const qualityGuards = toObject(config.qualityGuards);
  return {
    outlineTemperature: readNumberString(outline.temperature, '0.35'),
    outlineMaxOutputTokens: readNumberString(outline.maxOutputTokens, '2200'),
    outlineTopP: readNumberString(outline.topP, '0.9'),
    refinementTemperature: readNumberString(refinement.temperature, '0.35'),
    refinementMaxOutputTokens: readNumberString(refinement.maxOutputTokens, '3600'),
    refinementTopP: readNumberString(refinement.topP, '0.9'),
    responseFormat: readString(config.responseFormat, 'json_object'),
    retryMaxAttempts: readNumberString(retryPolicy.maxAttempts, '2'),
    allowFallback: readBoolean(retryPolicy.allowFallback, true),
    requireDocumentTitle: readBoolean(qualityGuards.requireDocumentTitle, true),
    requireOperationsBlock: readBoolean(qualityGuards.requireOperationsBlock, true),
    requireEntityPrompts: readBoolean(qualityGuards.requireEntityPrompts, true),
  };
}

export function serializeGenerationConfig(value: PlannerGenerationConfigEditorState) {
  return {
    stageProfiles: {
      outline: {
        temperature: Number(value.outlineTemperature || '0.35'),
        maxOutputTokens: Number(value.outlineMaxOutputTokens || '2200'),
        topP: Number(value.outlineTopP || '0.9'),
      },
      refinement: {
        temperature: Number(value.refinementTemperature || '0.35'),
        maxOutputTokens: Number(value.refinementMaxOutputTokens || '3600'),
        topP: Number(value.refinementTopP || '0.9'),
      },
    },
    responseFormat: value.responseFormat.trim() || 'json_object',
    retryPolicy: {
      maxAttempts: Number(value.retryMaxAttempts || '2'),
      allowFallback: value.allowFallback,
    },
    qualityGuards: {
      requireDocumentTitle: value.requireDocumentTitle,
      requireOperationsBlock: value.requireOperationsBlock,
      requireEntityPrompts: value.requireEntityPrompts,
    },
  };
}

export function parseLineList(text: string) {
  return text
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function toLineList(value: string[]) {
  return value.join('\n');
}
