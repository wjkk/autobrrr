import type { Prisma, Run, RunType } from '@prisma/client';
import { z } from 'zod';

import { readObject } from './json-helpers.js';

const modelFamilySchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
});

const modelProviderSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
  providerType: z.string().min(1),
  baseUrl: z.string().trim().url().optional().nullable(),
});

const modelEndpointSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  label: z.string().min(1),
  remoteModelKey: z.string().min(1),
});

const optionsSchema = z.record(z.string(), z.unknown());

const objectSnapshotSchema = z.record(z.string(), z.unknown());
const objectSnapshotOrArraySchema = z.union([objectSnapshotSchema, z.array(objectSnapshotSchema)]);
const plannerRerunScopeSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('subject'),
    subjectId: z.string().min(1),
  }),
  z.object({
    type: z.literal('scene'),
    sceneId: z.string().min(1),
  }),
  z.object({
    type: z.literal('act'),
    actId: z.string().min(1),
  }),
  z.object({
    type: z.literal('shot'),
    shotIds: z.array(z.string().min(1)).min(1).max(8),
  }),
]);

export const imageGenerationRunInputSchema = z.object({
  prompt: z.string().trim().min(1),
  modelFamily: modelFamilySchema,
  modelProvider: modelProviderSchema,
  modelEndpoint: modelEndpointSchema,
  referenceAssetIds: z.array(z.string().min(1)).max(16).default([]),
  options: optionsSchema.nullable().optional().default(null),
  shotId: z.string().min(1).optional(),
  entityName: z.string().min(1).optional(),
  resourceType: z.string().min(1).optional(),
  resourceId: z.string().min(1).optional(),
});

export const videoGenerationRunInputSchema = z.object({
  shotId: z.string().min(1),
  prompt: z.string().trim().min(1),
  modelFamily: modelFamilySchema,
  modelProvider: modelProviderSchema,
  modelEndpoint: modelEndpointSchema,
  referenceAssetIds: z.array(z.string().min(1)).max(16).default([]),
  options: optionsSchema.nullable().optional().default(null),
});

export const plannerDocUpdateRunInputSchema = z.object({
  plannerSessionId: z.string().min(1),
  episodeId: z.string().min(1),
  projectId: z.string().min(1),
  prompt: z.string().trim().min(1),
  rawPrompt: z.string().trim().min(1),
  projectTitle: z.string().min(1),
  episodeTitle: z.string().min(1),
  contentMode: z.string().min(1),
  contentType: z.string().min(1),
  subtype: z.string().nullable().optional(),
  targetStage: z.enum(['outline', 'refinement']),
  triggerType: z.string().min(1),
  sourceOutlineVersionId: z.string().min(1).optional(),
  targetVideoModelFamilySlug: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  targetEntityId: z.string().min(1).optional(),
  rerunScope: plannerRerunScopeSchema.optional(),
  targetEntity: objectSnapshotOrArraySchema.optional(),
  outlineRefinementHints: objectSnapshotSchema.nullable().optional(),
  rerunContext: objectSnapshotSchema.nullable().optional(),
  stepDefinitions: z.array(objectSnapshotSchema).default([]),
  promptSnapshot: objectSnapshotSchema,
  agentProfile: objectSnapshotSchema.nullable().optional(),
  subAgentProfile: objectSnapshotSchema.nullable().optional(),
  contextSnapshot: objectSnapshotSchema,
  modelFamily: modelFamilySchema,
  modelProvider: modelProviderSchema,
  modelEndpoint: modelEndpointSchema,
});

export const storyboardGenerationRunInputSchema = z.object({
  prompt: z.string().trim().min(1),
  modelFamily: modelFamilySchema,
  modelProvider: modelProviderSchema,
  modelEndpoint: modelEndpointSchema,
  contextSnapshot: objectSnapshotSchema.optional(),
  options: optionsSchema.nullable().optional().default(null),
});

export const publishRunInputSchema = z.object({
  title: z.string().trim().min(1).max(255),
  intro: z.string().trim().min(1).max(5000),
  script: z.string().trim().max(20000).default(''),
  tag: z.string().trim().max(120).default(''),
  sourceHistoryId: z.string().trim().min(1).nullable().optional().default(null),
});

export type ImageGenerationRunInput = z.infer<typeof imageGenerationRunInputSchema>;
export type VideoGenerationRunInput = z.infer<typeof videoGenerationRunInputSchema>;
export type PlannerDocUpdateRunInput = z.infer<typeof plannerDocUpdateRunInputSchema>;
export type StoryboardGenerationRunInput = z.infer<typeof storyboardGenerationRunInputSchema>;
export type PublishRunInput = z.infer<typeof publishRunInputSchema>;

export type RunInputPayload =
  | ImageGenerationRunInput
  | VideoGenerationRunInput
  | PlannerDocUpdateRunInput
  | StoryboardGenerationRunInput
  | PublishRunInput;

const runInputSchemaByType: Partial<Record<RunType, z.ZodType<RunInputPayload>>> = {
  IMAGE_GENERATION: imageGenerationRunInputSchema,
  VIDEO_GENERATION: videoGenerationRunInputSchema,
  PLANNER_DOC_UPDATE: plannerDocUpdateRunInputSchema,
  STORYBOARD_GENERATION: storyboardGenerationRunInputSchema,
  PUBLISH: publishRunInputSchema,
};

export class RunInputParseError extends Error {
  constructor(
    message: string,
    readonly runId: string,
    readonly runType: RunType,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'RunInputParseError';
  }
}

export function serializeRunInput<T extends RunInputPayload>(input: T): Prisma.InputJsonValue {
  return input as unknown as Prisma.InputJsonValue;
}

export function parseRunInput(run: Pick<Run, 'id' | 'runType' | 'inputJson'>): RunInputPayload {
  const schema = runInputSchemaByType[run.runType];
  if (!schema) {
    throw new RunInputParseError(`Run type ${run.runType} does not have a registered input schema.`, run.id, run.runType);
  }

  const parsed = schema.safeParse(readObject(run.inputJson));
  if (!parsed.success) {
    throw new RunInputParseError('Run input payload failed schema validation.', run.id, run.runType, parsed.error);
  }

  return parsed.data;
}
