import { Prisma } from '@prisma/client';

import type { PlannerStructuredDoc } from './planner-doc.js';

type PlannerDbClient = Prisma.TransactionClient;

interface PreviousPlannerAssetProjection {
  subjects?: Array<{
    entityKey?: string;
    title?: string;
    prompt?: string;
    referenceAssetIds?: string[];
    generatedAssetIds?: string[];
  }>;
  scenes?: Array<{
    entityKey?: string;
    title?: string;
    prompt?: string;
    referenceAssetIds?: string[];
    generatedAssetIds?: string[];
  }>;
  acts?: Array<{
    shots?: Array<{
      entityKey?: string;
      title?: string;
      visual?: string;
      targetModelFamilySlug?: string;
      referenceAssetIds?: string[];
      generatedAssetIds?: string[];
    }>;
  }>;
}

function normalizeKey(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function readProjectionKey(value: string | undefined) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function toAssetIdList(value: string[] | undefined) {
  return (value ?? []).filter((assetId) => typeof assetId === 'string' && assetId.trim().length > 0);
}

function inferSceneTime(doc: PlannerStructuredDoc, sceneTitle: string) {
  const matchedAct = doc.acts.find((act) => act.title.includes(sceneTitle) || act.location.includes(sceneTitle));
  return matchedAct?.time || '未设定';
}

function inferLocationType(text: string) {
  if (text.includes('室内')) {
    return 'indoor';
  }

  if (text.includes('室外')) {
    return 'outdoor';
  }

  return 'other';
}

export async function syncPlannerRefinementDerivedData(args: {
  db: PlannerDbClient;
  refinementVersionId: string;
  structuredDoc: PlannerStructuredDoc;
  previousProjection?: PreviousPlannerAssetProjection | null;
}) {
  const { db, refinementVersionId, structuredDoc, previousProjection } = args;

  const previousSubjectAssets = new Map(
    (previousProjection?.subjects ?? []).map((subject) => [
      readProjectionKey(subject.entityKey) ?? normalizeKey(subject.title ?? subject.prompt ?? ''),
      {
        referenceAssetIds: toAssetIdList(subject.referenceAssetIds),
        generatedAssetIds: toAssetIdList(subject.generatedAssetIds),
      },
    ]),
  );
  const previousSceneAssets = new Map(
    (previousProjection?.scenes ?? []).map((scene) => [
      readProjectionKey(scene.entityKey) ?? normalizeKey(scene.title ?? scene.prompt ?? ''),
      {
        referenceAssetIds: toAssetIdList(scene.referenceAssetIds),
        generatedAssetIds: toAssetIdList(scene.generatedAssetIds),
      },
    ]),
  );
  const previousShotAssets = new Map(
    (previousProjection?.acts ?? []).flatMap((act) => (act.shots ?? []).map((shot) => [
      readProjectionKey(shot.entityKey) ?? normalizeKey(`${shot.title ?? ''}::${shot.visual ?? ''}`),
      {
        targetModelFamilySlug: typeof shot.targetModelFamilySlug === 'string' && shot.targetModelFamilySlug.trim().length > 0
          ? shot.targetModelFamilySlug.trim()
          : null,
        referenceAssetIds: toAssetIdList(shot.referenceAssetIds),
        generatedAssetIds: toAssetIdList(shot.generatedAssetIds),
      },
    ] as const)),
  );

  await db.plannerShotScript.deleteMany({
    where: { refinementVersionId },
  });
  await db.plannerScene.deleteMany({
    where: { refinementVersionId },
  });
  await db.plannerSubject.deleteMany({
    where: { refinementVersionId },
  });

  const subjects = await Promise.all(
    structuredDoc.subjects.map((subject, index) => {
      const assetKey = readProjectionKey(subject.entityKey) ?? normalizeKey(subject.title || subject.prompt);
      return db.plannerSubject.create({
        data: {
          ...(readProjectionKey(subject.entityKey) ? { id: readProjectionKey(subject.entityKey)! } : {}),
          refinementVersionId,
          name: subject.title,
          role: index === 0 ? '主角' : '配角',
          appearance: subject.prompt,
          prompt: subject.prompt,
          referenceAssetIdsJson: (
            subject.referenceAssetIds?.length
              ? subject.referenceAssetIds
              : previousSubjectAssets.get(assetKey)?.referenceAssetIds ?? []
          ) as Prisma.InputJsonValue,
          generatedAssetIdsJson: (
            subject.generatedAssetIds?.length
              ? subject.generatedAssetIds
              : previousSubjectAssets.get(assetKey)?.generatedAssetIds ?? []
          ) as Prisma.InputJsonValue,
          sortOrder: index + 1,
          editable: true,
        },
      });
    }),
  );

  const scenes = await Promise.all(
    structuredDoc.scenes.map((scene, index) => {
      const assetKey = readProjectionKey(scene.entityKey) ?? normalizeKey(scene.title || scene.prompt);
      return db.plannerScene.create({
        data: {
          ...(readProjectionKey(scene.entityKey) ? { id: readProjectionKey(scene.entityKey)! } : {}),
          refinementVersionId,
          name: scene.title,
          time: inferSceneTime(structuredDoc, scene.title),
          locationType: inferLocationType(scene.prompt),
          description: scene.prompt,
          prompt: scene.prompt,
          referenceAssetIdsJson: (
            scene.referenceAssetIds?.length
              ? scene.referenceAssetIds
              : previousSceneAssets.get(assetKey)?.referenceAssetIds ?? []
          ) as Prisma.InputJsonValue,
          generatedAssetIdsJson: (
            scene.generatedAssetIds?.length
              ? scene.generatedAssetIds
              : previousSceneAssets.get(assetKey)?.generatedAssetIds ?? []
          ) as Prisma.InputJsonValue,
          sortOrder: index + 1,
          editable: true,
        },
      });
    }),
  );

  let shotSort = 1;
  for (const [actIndex, act] of structuredDoc.acts.entries()) {
    for (const [shotIndex, shot] of act.shots.entries()) {
      const scene = scenes[actIndex] ?? null;
      const assetKey = readProjectionKey(shot.entityKey) ?? normalizeKey(`${shot.title}::${shot.visual}`);
      await db.plannerShotScript.create({
        data: {
          ...(readProjectionKey(shot.entityKey) ? { id: readProjectionKey(shot.entityKey)! } : {}),
          refinementVersionId,
          sceneId: scene?.id ?? null,
          actKey: `act-${actIndex + 1}`,
          actTitle: act.title,
          shotNo: shot.title,
          title: shot.title,
          targetModelFamilySlug: shot.targetModelFamilySlug ?? previousShotAssets.get(assetKey)?.targetModelFamilySlug ?? null,
          visualDescription: shot.visual,
          composition: shot.composition,
          cameraMotion: shot.motion,
          voiceRole: shot.voice,
          dialogue: shot.line,
          subjectBindingsJson: subjects.map((subject: { id: string }) => subject.id),
          referenceAssetIdsJson: (
            shot.referenceAssetIds?.length
              ? shot.referenceAssetIds
              : previousShotAssets.get(assetKey)?.referenceAssetIds ?? []
          ) as Prisma.InputJsonValue,
          generatedAssetIdsJson: (
            shot.generatedAssetIds?.length
              ? shot.generatedAssetIds
              : previousShotAssets.get(assetKey)?.generatedAssetIds ?? []
          ) as Prisma.InputJsonValue,
          sortOrder: shotSort,
        },
      });
      shotSort += 1;
      if (shotIndex > 24) {
        break;
      }
    }
  }
}
