import { Prisma } from '@prisma/client';

import type { PlannerStructuredDoc } from './planner-doc.js';

type PlannerDbClient = Prisma.TransactionClient;

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
}) {
  const { db, refinementVersionId, structuredDoc } = args;

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
