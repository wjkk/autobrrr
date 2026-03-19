import { randomUUID } from 'node:crypto';

import { Prisma, type PrismaClient } from '@prisma/client';

import { plannerStructuredDocSchema } from '../doc/planner-doc.js';

export const PLANNER_REFINEMENT_LOCKED_ERROR = {
  ok: false,
  error: {
    code: 'PLANNER_REFINEMENT_LOCKED',
    message: 'The active refinement version is confirmed. Create a draft copy before editing.',
  },
} as const;

type PlannerDb = Prisma.TransactionClient | PrismaClient;

type EntityIdMap = Map<string, string>;

function toNullableJsonInput(value: Prisma.JsonValue | null | undefined) {
  return value == null ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
}

function remapAssetIdBindings(value: Prisma.JsonValue | null | undefined, idMap: EntityIdMap) {
  if (!Array.isArray(value)) {
    return value ?? null;
  }

  return value.map((item) => (typeof item === 'string' ? idMap.get(item) ?? item : item));
}

function remapStructuredDocEntityKeys(args: {
  structuredDocJson: Prisma.JsonValue | null;
  subjectIdMap: EntityIdMap;
  sceneIdMap: EntityIdMap;
  shotIdMap: EntityIdMap;
}) {
  const parsed = plannerStructuredDocSchema.safeParse(args.structuredDocJson);
  if (!parsed.success) {
    return args.structuredDocJson;
  }

  return {
    ...parsed.data,
    subjects: parsed.data.subjects.map((subject) => ({
      ...subject,
      entityKey: subject.entityKey ? args.subjectIdMap.get(subject.entityKey) ?? subject.entityKey : subject.entityKey,
    })),
    scenes: parsed.data.scenes.map((scene) => ({
      ...scene,
      entityKey: scene.entityKey ? args.sceneIdMap.get(scene.entityKey) ?? scene.entityKey : scene.entityKey,
    })),
    acts: parsed.data.acts.map((act) => ({
      ...act,
      shots: act.shots.map((shot) => ({
        ...shot,
        entityKey: shot.entityKey ? args.shotIdMap.get(shot.entityKey) ?? shot.entityKey : shot.entityKey,
        subjectBindings: Array.isArray(shot.subjectBindings)
          ? shot.subjectBindings.map((binding) => args.subjectIdMap.get(binding) ?? binding)
          : shot.subjectBindings,
      })),
    })),
  } satisfies Prisma.InputJsonValue;
}

interface PlannerRefinementDraftSource {
  id: string;
  plannerSessionId: string;
  agentProfileId: string | null;
  subAgentProfileId: string | null;
  sourceRunId: string | null;
  sourceOutlineVersionId: string | null;
  versionNumber: number;
  instruction: string | null;
  assistantMessage: string | null;
  documentTitle: string | null;
  generatedText: string | null;
  structuredDocJson: Prisma.JsonValue | null;
  inputSnapshotJson: Prisma.JsonValue | null;
  modelSnapshotJson: Prisma.JsonValue | null;
  operationsJson: Prisma.JsonValue | null;
  createdById: string | null;
  subjects: Array<{
    id: string;
    name: string;
    role: string;
    appearance: string;
    personality: string | null;
    prompt: string;
    negativePrompt: string | null;
    referenceAssetIdsJson: Prisma.JsonValue | null;
    generatedAssetIdsJson: Prisma.JsonValue | null;
    sortOrder: number;
    editable: boolean;
  }>;
  scenes: Array<{
    id: string;
    name: string;
    time: string;
    locationType: string;
    description: string;
    prompt: string;
    negativePrompt: string | null;
    referenceAssetIdsJson: Prisma.JsonValue | null;
    generatedAssetIdsJson: Prisma.JsonValue | null;
    sortOrder: number;
    editable: boolean;
  }>;
  shotScripts: Array<{
    id: string;
    sceneId: string | null;
    actKey: string;
    actTitle: string;
    shotNo: string;
    title: string;
    durationSeconds: number | null;
    targetModelFamilySlug: string | null;
    visualDescription: string;
    composition: string;
    cameraMotion: string;
    voiceRole: string;
    dialogue: string;
    subjectBindingsJson: Prisma.JsonValue | null;
    referenceAssetIdsJson: Prisma.JsonValue | null;
    generatedAssetIdsJson: Prisma.JsonValue | null;
    sortOrder: number;
  }>;
  stepAnalysis: Array<{
    stepKey: string;
    title: string;
    status: 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED';
    detailJson: Prisma.JsonValue | null;
    sortOrder: number;
  }>;
}

export function isPlannerRefinementConfirmed(refinement: { isConfirmed?: boolean | null }) {
  return refinement.isConfirmed === true;
}

export async function createPlannerRefinementDraftCopy(args: {
  db: PlannerDb;
  sourceVersion: PlannerRefinementDraftSource;
  createdById: string | null;
}) {
  const latestVersion = await args.db.plannerRefinementVersion.findFirst({
    where: {
      plannerSessionId: args.sourceVersion.plannerSessionId,
    },
    orderBy: { versionNumber: 'desc' },
    select: {
      versionNumber: true,
    },
  });

  const subjectIdMap = new Map<string, string>();
  for (const subject of args.sourceVersion.subjects) {
    subjectIdMap.set(subject.id, randomUUID());
  }

  const sceneIdMap = new Map<string, string>();
  for (const scene of args.sourceVersion.scenes) {
    sceneIdMap.set(scene.id, randomUUID());
  }

  const shotIdMap = new Map<string, string>();
  for (const shot of args.sourceVersion.shotScripts) {
    shotIdMap.set(shot.id, randomUUID());
  }

  const remappedStructuredDocJson = remapStructuredDocEntityKeys({
    structuredDocJson: args.sourceVersion.structuredDocJson,
    subjectIdMap,
    sceneIdMap,
    shotIdMap,
  });

  const draftVersion = await args.db.plannerRefinementVersion.create({
    data: {
      plannerSessionId: args.sourceVersion.plannerSessionId,
      agentProfileId: args.sourceVersion.agentProfileId,
      subAgentProfileId: args.sourceVersion.subAgentProfileId,
      sourceRunId: args.sourceVersion.sourceRunId,
      sourceOutlineVersionId: args.sourceVersion.sourceOutlineVersionId,
      sourceRefinementVersionId: args.sourceVersion.id,
      versionNumber: (latestVersion?.versionNumber ?? 0) + 1,
      triggerType: 'create_draft',
      status: 'DRAFT',
      instruction: args.sourceVersion.instruction,
      assistantMessage: args.sourceVersion.assistantMessage,
      documentTitle: args.sourceVersion.documentTitle,
      generatedText: args.sourceVersion.generatedText,
      structuredDocJson: toNullableJsonInput(remappedStructuredDocJson),
      inputSnapshotJson: toNullableJsonInput(args.sourceVersion.inputSnapshotJson),
      modelSnapshotJson: toNullableJsonInput(args.sourceVersion.modelSnapshotJson),
      operationsJson: toNullableJsonInput(args.sourceVersion.operationsJson),
      isActive: true,
      isConfirmed: false,
      confirmedAt: null,
      createdById: args.createdById ?? args.sourceVersion.createdById,
    },
  });

  await args.db.plannerRefinementVersion.updateMany({
    where: {
      plannerSessionId: args.sourceVersion.plannerSessionId,
      id: { not: draftVersion.id },
      isActive: true,
    },
    data: {
      isActive: false,
    },
  });

  if (args.sourceVersion.stepAnalysis.length > 0) {
    await args.db.plannerStepAnalysis.createMany({
      data: args.sourceVersion.stepAnalysis.map((step) => ({
        refinementVersionId: draftVersion.id,
        stepKey: step.stepKey,
        title: step.title,
        status: step.status,
        detailJson: toNullableJsonInput(step.detailJson),
        sortOrder: step.sortOrder,
      })),
    });
  }

  if (args.sourceVersion.subjects.length > 0) {
    await args.db.plannerSubject.createMany({
      data: args.sourceVersion.subjects.map((subject) => ({
        id: subjectIdMap.get(subject.id),
        refinementVersionId: draftVersion.id,
        name: subject.name,
        role: subject.role,
        appearance: subject.appearance,
        personality: subject.personality,
        prompt: subject.prompt,
        negativePrompt: subject.negativePrompt,
        referenceAssetIdsJson: toNullableJsonInput(subject.referenceAssetIdsJson),
        generatedAssetIdsJson: toNullableJsonInput(subject.generatedAssetIdsJson),
        sortOrder: subject.sortOrder,
        editable: subject.editable,
      })),
    });
  }

  for (const scene of args.sourceVersion.scenes) {
    await args.db.plannerScene.create({
      data: {
        id: sceneIdMap.get(scene.id),
        refinementVersionId: draftVersion.id,
        name: scene.name,
        time: scene.time,
        locationType: scene.locationType,
        description: scene.description,
        prompt: scene.prompt,
        negativePrompt: scene.negativePrompt,
        referenceAssetIdsJson: toNullableJsonInput(scene.referenceAssetIdsJson),
        generatedAssetIdsJson: toNullableJsonInput(scene.generatedAssetIdsJson),
        sortOrder: scene.sortOrder,
        editable: scene.editable,
      },
    });
  }

  if (args.sourceVersion.shotScripts.length > 0) {
    await args.db.plannerShotScript.createMany({
      data: args.sourceVersion.shotScripts.map((shot) => ({
        id: shotIdMap.get(shot.id),
        refinementVersionId: draftVersion.id,
        sceneId: shot.sceneId ? sceneIdMap.get(shot.sceneId) ?? null : null,
        actKey: shot.actKey,
        actTitle: shot.actTitle,
        shotNo: shot.shotNo,
        title: shot.title,
        durationSeconds: shot.durationSeconds,
        targetModelFamilySlug: shot.targetModelFamilySlug,
        visualDescription: shot.visualDescription,
        composition: shot.composition,
        cameraMotion: shot.cameraMotion,
        voiceRole: shot.voiceRole,
        dialogue: shot.dialogue,
        subjectBindingsJson: toNullableJsonInput(remapAssetIdBindings(shot.subjectBindingsJson, subjectIdMap)),
        referenceAssetIdsJson: toNullableJsonInput(shot.referenceAssetIdsJson),
        generatedAssetIdsJson: toNullableJsonInput(shot.generatedAssetIdsJson),
        sortOrder: shot.sortOrder,
      })),
    });
  }

  await args.db.plannerMessage.create({
    data: {
      plannerSessionId: args.sourceVersion.plannerSessionId,
      refinementVersionId: draftVersion.id,
      role: 'ASSISTANT',
      messageType: 'SYSTEM_TRANSITION',
      contentJson: {
        action: 'draft_created',
        sourceRefinementVersionId: args.sourceVersion.id,
        refinementVersionId: draftVersion.id,
      } satisfies Prisma.InputJsonValue,
      createdById: args.createdById ?? args.sourceVersion.createdById,
    },
  });

  return draftVersion;
}

export const __testables = {
  toNullableJsonInput,
  remapAssetIdBindings,
  remapStructuredDocEntityKeys,
  isPlannerRefinementConfirmed,
};
