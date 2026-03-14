import { Prisma } from '@prisma/client';

import type { PlannerStructuredDoc } from './planner-doc.js';

type PlannerDbClient = Prisma.TransactionClient;

interface PreviousPlannerAssetProjection {
  subjects?: Array<{
    title?: string;
    prompt?: string;
    referenceAssetIds?: string[];
    generatedAssetIds?: string[];
  }>;
  scenes?: Array<{
    title?: string;
    prompt?: string;
    referenceAssetIds?: string[];
    generatedAssetIds?: string[];
  }>;
  acts?: Array<{
    shots?: Array<{
      title?: string;
      visual?: string;
      referenceAssetIds?: string[];
      generatedAssetIds?: string[];
    }>;
  }>;
}

function normalizeKey(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
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
      normalizeKey(subject.title ?? subject.prompt ?? ''),
      {
        referenceAssetIds: toAssetIdList(subject.referenceAssetIds),
        generatedAssetIds: toAssetIdList(subject.generatedAssetIds),
      },
    ]),
  );
  const previousSceneAssets = new Map(
    (previousProjection?.scenes ?? []).map((scene) => [
      normalizeKey(scene.title ?? scene.prompt ?? ''),
      {
        referenceAssetIds: toAssetIdList(scene.referenceAssetIds),
        generatedAssetIds: toAssetIdList(scene.generatedAssetIds),
      },
    ]),
  );
  const previousShotAssets = new Map(
    (previousProjection?.acts ?? []).flatMap((act) => (act.shots ?? []).map((shot) => [
      normalizeKey(`${shot.title ?? ''}::${shot.visual ?? ''}`),
      {
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
    structuredDoc.subjects.map((subject, index) =>
      db.plannerSubject.create({
        data: {
          refinementVersionId,
          name: subject.title,
          role: index === 0 ? '主角' : '配角',
          appearance: subject.prompt,
          prompt: subject.prompt,
          referenceAssetIdsJson: (
            subject.referenceAssetIds?.length
              ? subject.referenceAssetIds
              : previousSubjectAssets.get(normalizeKey(subject.title || subject.prompt))?.referenceAssetIds ?? []
          ) as Prisma.InputJsonValue,
          generatedAssetIdsJson: (
            subject.generatedAssetIds?.length
              ? subject.generatedAssetIds
              : previousSubjectAssets.get(normalizeKey(subject.title || subject.prompt))?.generatedAssetIds ?? []
          ) as Prisma.InputJsonValue,
          sortOrder: index + 1,
          editable: true,
        },
      }),
    ),
  );

  const scenes = await Promise.all(
    structuredDoc.scenes.map((scene, index) =>
      db.plannerScene.create({
        data: {
          refinementVersionId,
          name: scene.title,
          time: inferSceneTime(structuredDoc, scene.title),
          locationType: inferLocationType(scene.prompt),
          description: scene.prompt,
          prompt: scene.prompt,
          referenceAssetIdsJson: (
            scene.referenceAssetIds?.length
              ? scene.referenceAssetIds
              : previousSceneAssets.get(normalizeKey(scene.title || scene.prompt))?.referenceAssetIds ?? []
          ) as Prisma.InputJsonValue,
          generatedAssetIdsJson: (
            scene.generatedAssetIds?.length
              ? scene.generatedAssetIds
              : previousSceneAssets.get(normalizeKey(scene.title || scene.prompt))?.generatedAssetIds ?? []
          ) as Prisma.InputJsonValue,
          sortOrder: index + 1,
          editable: true,
        },
      }),
    ),
  );

  let shotSort = 1;
  for (const [actIndex, act] of structuredDoc.acts.entries()) {
    for (const [shotIndex, shot] of act.shots.entries()) {
      const scene = scenes[actIndex] ?? null;
      await db.plannerShotScript.create({
        data: {
          refinementVersionId,
          sceneId: scene?.id ?? null,
          actKey: `act-${actIndex + 1}`,
          actTitle: act.title,
          shotNo: shot.title,
          title: shot.title,
          visualDescription: shot.visual,
          composition: shot.composition,
          cameraMotion: shot.motion,
          voiceRole: shot.voice,
          dialogue: shot.line,
          subjectBindingsJson: subjects.map((subject: { id: string }) => subject.id),
          referenceAssetIdsJson: (
            shot.referenceAssetIds?.length
              ? shot.referenceAssetIds
              : previousShotAssets.get(normalizeKey(`${shot.title}::${shot.visual}`))?.referenceAssetIds ?? []
          ) as Prisma.InputJsonValue,
          generatedAssetIdsJson: (
            shot.generatedAssetIds?.length
              ? shot.generatedAssetIds
              : previousShotAssets.get(normalizeKey(`${shot.title}::${shot.visual}`))?.generatedAssetIds ?? []
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
