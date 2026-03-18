import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizeGenerationConfig,
  normalizeInputSchema,
  normalizeOutputSchema,
  normalizeToolPolicy,
  parseLineList,
  serializeGenerationConfig,
  serializeInputSchema,
  serializeOutputSchema,
  serializeToolPolicy,
  toLineList,
} from './planner-agent-config-editor';

test('planner agent config editor normalizes empty payloads to stable defaults', () => {
  assert.deepEqual(normalizeInputSchema(null), {
    required: ['projectTitle', 'episodeTitle', 'userPrompt'],
    optional: [],
    language: 'zh-CN',
    userPromptMaxLength: '20000',
    priorMessagesMaxLength: '12',
    plannerAssetsMaxLength: '48',
    stages: ['outline', 'refinement'],
    partialRerunScopes: ['none', 'subject', 'scene', 'shot', 'act'],
  });

  assert.deepEqual(normalizeOutputSchema(null), {
    outlineRequired: ['stage', 'assistantMessage', 'documentTitle', 'outlineDoc', 'operations'],
    refinementRequired: ['stage', 'assistantMessage', 'stepAnalysis', 'documentTitle', 'structuredDoc', 'operations'],
    structuredDocRequired: [],
    shotFields: [],
    rules: [],
  });

  assert.deepEqual(normalizeToolPolicy(null), {
    mode: '',
    emphasis: '',
    allowedStages: ['outline', 'refinement'],
    partialRerunScopes: ['subject', 'scene', 'shot', 'act'],
    allowSubjectAssetPlanning: true,
    allowSceneAssetPlanning: true,
    allowDocumentRewrite: true,
    allowStoryboardGeneration: false,
    requireStructuredDoc: true,
    allowPlannerAssetContext: true,
    preferGeneratedAssetAsPrimary: true,
    allowReferenceAssetBinding: true,
    allowImageDraftGeneration: true,
    preserveUnrelatedEntitiesDuringPartialRerun: true,
    requireStructuredJsonOutput: true,
    requireStepAnalysisOnRefinement: true,
  });

  assert.deepEqual(normalizeGenerationConfig(null), {
    outlineTemperature: '0.35',
    outlineMaxOutputTokens: '2200',
    outlineTopP: '0.9',
    refinementTemperature: '0.35',
    refinementMaxOutputTokens: '3600',
    refinementTopP: '0.9',
    responseFormat: 'json_object',
    retryMaxAttempts: '2',
    allowFallback: true,
    requireDocumentTitle: true,
    requireOperationsBlock: true,
    requireEntityPrompts: true,
  });
});

test('planner agent config editor serializes numeric and boolean fields predictably', () => {
  assert.deepEqual(
    serializeInputSchema({
      required: ['projectTitle', '', 'userPrompt'],
      optional: ['notes', ''],
      language: 'en-US',
      userPromptMaxLength: '123',
      priorMessagesMaxLength: '4',
      plannerAssetsMaxLength: '8',
      stages: ['outline', '', 'refinement'],
      partialRerunScopes: ['subject', '', 'act'],
    }),
    {
      required: ['projectTitle', 'userPrompt'],
      optional: ['notes'],
      constraints: {
        language: 'en-US',
        userPromptMaxLength: 123,
        priorMessagesMaxLength: 4,
        plannerAssetsMaxLength: 8,
        stages: ['outline', 'refinement'],
        partialRerunScopes: ['subject', 'act'],
      },
    },
  );

  assert.deepEqual(
    serializeOutputSchema({
      outlineRequired: ['stage', '', 'outlineDoc'],
      refinementRequired: ['stage', 'structuredDoc'],
      structuredDocRequired: ['acts', ''],
      shotFields: ['visual', '', 'line'],
      rules: ['rule-1', ''],
    }),
    {
      stages: {
        outline: {
          required: ['stage', 'outlineDoc'],
          stageValue: 'outline',
        },
        refinement: {
          required: ['stage', 'structuredDoc'],
          stageValue: 'refinement',
        },
      },
      structuredDoc: {
        required: ['acts'],
        shotFields: ['visual', 'line'],
      },
      rules: ['rule-1'],
    },
  );

  assert.deepEqual(
    serializeGenerationConfig({
      outlineTemperature: '0.2',
      outlineMaxOutputTokens: '1200',
      outlineTopP: '0.8',
      refinementTemperature: '0.4',
      refinementMaxOutputTokens: '2800',
      refinementTopP: '0.95',
      responseFormat: 'json_schema',
      retryMaxAttempts: '3',
      allowFallback: false,
      requireDocumentTitle: false,
      requireOperationsBlock: true,
      requireEntityPrompts: false,
    }),
    {
      stageProfiles: {
        outline: {
          temperature: 0.2,
          maxOutputTokens: 1200,
          topP: 0.8,
        },
        refinement: {
          temperature: 0.4,
          maxOutputTokens: 2800,
          topP: 0.95,
        },
      },
      responseFormat: 'json_schema',
      retryPolicy: {
        maxAttempts: 3,
        allowFallback: false,
      },
      qualityGuards: {
        requireDocumentTitle: false,
        requireOperationsBlock: true,
        requireEntityPrompts: false,
      },
    },
  );
});

test('planner agent config editor round-trips tool policy and line lists', () => {
  const normalized = normalizeToolPolicy({
    mode: 'strict',
    emphasis: 'story-first',
    allowedStages: ['outline'],
    partialRerunScopes: ['shot'],
    assetStrategy: {
      allowPlannerAssetContext: false,
      preferGeneratedAssetAsPrimary: false,
      allowReferenceAssetBinding: false,
      allowImageDraftGeneration: true,
    },
    constraints: {
      preserveUnrelatedEntitiesDuringPartialRerun: false,
      requireStructuredJsonOutput: false,
      requireStepAnalysisOnRefinement: true,
    },
    allowSubjectAssetPlanning: false,
    allowSceneAssetPlanning: true,
    allowDocumentRewrite: false,
    allowStoryboardGeneration: true,
    requireStructuredDoc: false,
  });

  assert.deepEqual(
    serializeToolPolicy(normalized),
    {
      mode: 'strict',
      emphasis: 'story-first',
      allowedStages: ['outline'],
      partialRerunScopes: ['shot'],
      assetStrategy: {
        allowPlannerAssetContext: false,
        preferGeneratedAssetAsPrimary: false,
        allowReferenceAssetBinding: false,
        allowImageDraftGeneration: true,
      },
      constraints: {
        preserveUnrelatedEntitiesDuringPartialRerun: false,
        requireStructuredJsonOutput: false,
        requireStepAnalysisOnRefinement: true,
      },
      allowSubjectAssetPlanning: false,
      allowSceneAssetPlanning: true,
      allowDocumentRewrite: false,
      allowStoryboardGeneration: true,
      requireStructuredDoc: false,
    },
  );

  assert.deepEqual(parseLineList(' line-1 \n\nline-2\n '), ['line-1', 'line-2']);
  assert.equal(toLineList(['line-1', 'line-2']), 'line-1\nline-2');
});
