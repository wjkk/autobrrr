import type { PlannerRefinementVersion, PlannerScene, PlannerShotScript, PlannerSubject, Prisma } from '@prisma/client';

import { buildFallbackPlannerStructuredDoc, plannerStructuredDocSchema, type PlannerStructuredDoc } from './planner-doc.js';

type PlannerDbClient = Prisma.TransactionClient;

interface ProjectionInput {
  refinementVersion: Pick<PlannerRefinementVersion, 'id' | 'sourceRunId'> & {
    structuredDocJson: Prisma.JsonValue | null;
  };
  subjects: Array<
    Pick<PlannerSubject, 'id' | 'name' | 'appearance' | 'prompt' | 'sortOrder'> & {
      referenceAssetIdsJson?: Prisma.JsonValue | null;
      generatedAssetIdsJson?: Prisma.JsonValue | null;
    }
  >;
  scenes: Array<
    Pick<PlannerScene, 'id' | 'name' | 'time' | 'description' | 'prompt' | 'sortOrder'> & {
      referenceAssetIdsJson?: Prisma.JsonValue | null;
      generatedAssetIdsJson?: Prisma.JsonValue | null;
    }
  >;
  shotScripts: Array<
    Pick<
      PlannerShotScript,
      'id' | 'sceneId' | 'actKey' | 'actTitle' | 'shotNo' | 'title' | 'targetModelFamilySlug' | 'visualDescription' | 'composition' | 'cameraMotion' | 'voiceRole' | 'dialogue' | 'sortOrder'
    >
    & {
      referenceAssetIdsJson?: Prisma.JsonValue | null;
      generatedAssetIdsJson?: Prisma.JsonValue | null;
    }
  >;
}

function readAssetIds(value: Prisma.JsonValue | null | undefined) {
  return Array.isArray(value)
    ? value.filter((assetId): assetId is string => typeof assetId === 'string' && assetId.length > 0)
    : [];
}

function readBaseDoc(value: Prisma.JsonValue | null) {
  const parsed = plannerStructuredDocSchema.safeParse(value);
  if (parsed.success) {
    return parsed.data;
  }

  return buildFallbackPlannerStructuredDoc({
    userPrompt: '根据当前实体数据恢复策划文档',
    projectTitle: '未命名项目',
    episodeTitle: '第1集',
    rawText: '当前 refinement 文档缺失，已根据主体、场景和分镜实体恢复基础结构。',
  });
}

export function rebuildPlannerStructuredDocFromProjection(input: ProjectionInput): PlannerStructuredDoc {
  const baseDoc = readBaseDoc(input.refinementVersion.structuredDocJson);
  const subjects = input.subjects.slice().sort((left, right) => left.sortOrder - right.sortOrder);
  const scenes = input.scenes.slice().sort((left, right) => left.sortOrder - right.sortOrder);
  const shots = input.shotScripts.slice().sort((left, right) => left.sortOrder - right.sortOrder);
  const scenesById = new Map(scenes.map((scene) => [scene.id, scene]));
  const actsByKey = new Map<
    string,
    {
      title: string;
      time: string;
      location: string;
      shots: PlannerStructuredDoc['acts'][number]['shots'];
    }
  >();

  for (const shot of shots) {
    const scene = shot.sceneId ? scenesById.get(shot.sceneId) : null;
    const act =
      actsByKey.get(shot.actKey)
      ?? {
        title: shot.actTitle,
        time: scene?.time ?? '',
        location: scene?.name ?? '',
        shots: [],
      };

    act.shots.push({
      entityKey: shot.id,
      title: shot.title || shot.shotNo,
      visual: shot.visualDescription,
      composition: shot.composition,
      motion: shot.cameraMotion,
      voice: shot.voiceRole,
      line: shot.dialogue,
      targetModelFamilySlug: shot.targetModelFamilySlug ?? undefined,
      referenceAssetIds: readAssetIds(shot.referenceAssetIdsJson),
      generatedAssetIds: readAssetIds(shot.generatedAssetIdsJson),
    });
    actsByKey.set(shot.actKey, act);
  }

  const rebuiltDoc: PlannerStructuredDoc = {
    ...baseDoc,
    subjectBullets: subjects.map((subject) => `${subject.name}：${subject.appearance || subject.prompt}`),
    subjects: subjects.map((subject) => ({
      entityKey: subject.id,
      title: subject.name,
      prompt: subject.prompt,
      referenceAssetIds: readAssetIds(subject.referenceAssetIdsJson),
      generatedAssetIds: readAssetIds(subject.generatedAssetIdsJson),
    })),
    sceneBullets: scenes.map((scene) => scene.description || scene.prompt),
    scenes: scenes.map((scene) => ({
      entityKey: scene.id,
      title: scene.name,
      prompt: scene.prompt,
      referenceAssetIds: readAssetIds(scene.referenceAssetIdsJson),
      generatedAssetIds: readAssetIds(scene.generatedAssetIdsJson),
    })),
    scriptSummary: shots.length > 0
      ? [`分镜数量：${shots.length}`, `场景数量：${scenes.length}`, `主体数量：${subjects.length}`]
      : baseDoc.scriptSummary,
    acts: Array.from(actsByKey.values()),
  };

  return plannerStructuredDocSchema.parse(rebuiltDoc);
}

export async function syncPlannerRefinementProjection(args: {
  db: PlannerDbClient;
  refinementVersionId: string;
}) {
  const refinementVersion = await args.db.plannerRefinementVersion.findUnique({
    where: { id: args.refinementVersionId },
    select: {
      id: true,
      sourceRunId: true,
      structuredDocJson: true,
      documentTitle: true,
    },
  });

  if (!refinementVersion) {
    throw new Error('Planner refinement version not found.');
  }

  const [subjects, scenes, shotScripts] = await Promise.all([
    args.db.plannerSubject.findMany({
      where: { refinementVersionId: refinementVersion.id },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        appearance: true,
        prompt: true,
        referenceAssetIdsJson: true,
        generatedAssetIdsJson: true,
        sortOrder: true,
      },
    }),
    args.db.plannerScene.findMany({
      where: { refinementVersionId: refinementVersion.id },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        time: true,
        description: true,
        prompt: true,
        referenceAssetIdsJson: true,
        generatedAssetIdsJson: true,
        sortOrder: true,
      },
    }),
    args.db.plannerShotScript.findMany({
      where: { refinementVersionId: refinementVersion.id },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        sceneId: true,
        actKey: true,
        actTitle: true,
        shotNo: true,
        title: true,
        targetModelFamilySlug: true,
        visualDescription: true,
        composition: true,
        cameraMotion: true,
        voiceRole: true,
        dialogue: true,
        referenceAssetIdsJson: true,
        generatedAssetIdsJson: true,
        sortOrder: true,
      },
    }),
  ]);

  const structuredDoc = rebuildPlannerStructuredDocFromProjection({
    refinementVersion,
    subjects,
    scenes,
    shotScripts,
  });

  await args.db.plannerRefinementVersion.update({
    where: { id: refinementVersion.id },
    data: {
      documentTitle: structuredDoc.projectTitle,
      structuredDocJson: structuredDoc as Prisma.InputJsonValue,
      updatedAt: new Date(),
    },
  });

  if (refinementVersion.sourceRunId) {
    const sourceRun = await args.db.run.findUnique({
      where: { id: refinementVersion.sourceRunId },
      select: {
        id: true,
        outputJson: true,
      },
    });

    if (sourceRun) {
      const currentOutput =
        sourceRun.outputJson && typeof sourceRun.outputJson === 'object' && !Array.isArray(sourceRun.outputJson)
          ? (sourceRun.outputJson as Record<string, unknown>)
          : {};

      await args.db.run.update({
        where: { id: sourceRun.id },
        data: {
          outputJson: {
            ...currentOutput,
            structuredDoc: structuredDoc as Prisma.InputJsonValue,
          } satisfies Prisma.InputJsonValue,
        },
      });
    }
  }

  return structuredDoc;
}
