import { Prisma, type PrismaClient } from '@prisma/client';

import { generateShotPrompts } from './shot-prompt-generator.js';
import type { ResolvedPlannerTargetVideoModel } from './planner-target-video-model.js';

type PlannerDb = Prisma.TransactionClient | PrismaClient;

function readAssetIds(value: Prisma.JsonValue | null | undefined) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
}

function buildImagePrompt(args: {
  shot: {
    visualDescription: string;
    composition: string;
    cameraMotion: string;
  };
  sceneName: string | null;
}) {
  return [
    args.sceneName,
    args.shot.visualDescription,
    args.shot.composition,
    args.shot.cameraMotion,
  ]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join('，');
}

function uniqueAssetIds(values: string[]) {
  return Array.from(new Set(values.filter((item) => item.trim().length > 0)));
}

interface PlannerFinalizeSubject {
  id: string;
  generatedAssetIdsJson: Prisma.JsonValue | null;
  referenceAssetIdsJson: Prisma.JsonValue | null;
}

interface PlannerFinalizeScene {
  id: string;
  name: string;
  generatedAssetIdsJson: Prisma.JsonValue | null;
  referenceAssetIdsJson: Prisma.JsonValue | null;
}

interface PlannerFinalizeShotScript {
  id: string;
  sceneId: string | null;
  actKey: string;
  actTitle: string;
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
}

interface PlannerFinalizePromptPayload {
  refinementVersionId: string;
  plannerShotScriptId: string;
  modelFamilySlug: string;
  groupId: string;
  shotIds: string[];
  mode: 'multi-shot' | 'single-shot';
  promptText: string;
  promptPayload: {
    familySlug: string;
    supportsMultiShot: boolean;
    shotCount: number;
    audioDescStyle: 'inline' | 'none';
    cameraVocab: 'chinese' | 'english-cinematic' | 'both';
  };
  materialBindingIds: string[];
  generatedAt: string;
}

function buildMaterialBindingIds(args: {
  shot: PlannerFinalizeShotScript;
  scene: PlannerFinalizeScene | null;
  subjectsById: Map<string, PlannerFinalizeSubject>;
}) {
  const subjectBindingIds = Array.isArray(args.shot.subjectBindingsJson)
    ? args.shot.subjectBindingsJson.filter((value): value is string => typeof value === 'string')
    : [];

  const subjectAssets = subjectBindingIds.flatMap((subjectId) => {
    const subject = args.subjectsById.get(subjectId);
    if (!subject) {
      return [];
    }
    return [...readAssetIds(subject.generatedAssetIdsJson), ...readAssetIds(subject.referenceAssetIdsJson)];
  });

  const sceneAssets = args.scene
    ? [...readAssetIds(args.scene.generatedAssetIdsJson), ...readAssetIds(args.scene.referenceAssetIdsJson)]
    : [];

  const shotAssets = [...readAssetIds(args.shot.generatedAssetIdsJson), ...readAssetIds(args.shot.referenceAssetIdsJson)];

  return uniqueAssetIds([...subjectAssets, ...sceneAssets, ...shotAssets]);
}

export async function finalizePlannerRefinementToCreation(args: {
  db: PlannerDb;
  projectId: string;
  episodeId: string;
  refinementVersionId: string;
  targetVideoModel: ResolvedPlannerTargetVideoModel;
  subjects: PlannerFinalizeSubject[];
  scenes: PlannerFinalizeScene[];
  shotScripts: PlannerFinalizeShotScript[];
}) {
  const promptPackages = generateShotPrompts({
    modelFamilySlug: args.targetVideoModel.familySlug,
    capability: args.targetVideoModel.capability,
    shots: args.shotScripts.map((shot) => ({
      id: shot.id,
      sceneId: shot.sceneId,
      sceneName: args.scenes.find((scene) => scene.id === shot.sceneId)?.name ?? null,
      actKey: shot.actKey,
      actTitle: shot.actTitle,
      title: shot.title,
      durationSeconds: shot.durationSeconds,
      visualDescription: shot.visualDescription,
      composition: shot.composition,
      cameraMotion: shot.cameraMotion,
      voiceRole: shot.voiceRole,
      dialogue: shot.dialogue,
      sortOrder: shot.sortOrder,
    })),
  });

  const promptPackageByShotId = new Map<string, (typeof promptPackages)[number]>();
  for (const promptPackage of promptPackages) {
    for (const shotId of promptPackage.shotIds) {
      promptPackageByShotId.set(shotId, promptPackage);
    }
  }

  const scenesById = new Map(args.scenes.map((scene) => [scene.id, scene]));
  const subjectsById = new Map(args.subjects.map((subject) => [subject.id, subject]));
  const orderedShots = args.shotScripts.slice().sort((left, right) => left.sortOrder - right.sortOrder);

  const existingShots = await args.db.shot.findMany({
    where: {
      episodeId: args.episodeId,
    },
    orderBy: {
      sequenceNo: 'asc',
    },
    include: {
      versions: {
        select: {
          id: true,
        },
      },
    },
  });

  const obsoleteShots = existingShots.slice(orderedShots.length);
  const blockingObsoleteShots = obsoleteShots.filter((shot) => shot.activeVersionId || shot.versions.length > 0);
  if (blockingObsoleteShots.length > 0) {
    throw new Error('Finalize would remove existing Creation shots with generated history. Clean them up before re-finalizing.');
  }

  if (obsoleteShots.length > 0) {
    await args.db.shot.deleteMany({
      where: {
        id: {
          in: obsoleteShots.map((shot) => shot.id),
        },
      },
    });
  }

  const finalizedAt = new Date();
  const finalizedAtIso = finalizedAt.toISOString();

  for (const [index, shot] of orderedShots.entries()) {
    const scene = shot.sceneId ? scenesById.get(shot.sceneId) ?? null : null;
    const promptPackage = promptPackageByShotId.get(shot.id);
    if (!promptPackage) {
      throw new Error(`Missing prompt package for planner shot script ${shot.id}.`);
    }

    const materialBindingIds = buildMaterialBindingIds({
      shot,
      scene,
      subjectsById,
    });

    const promptJson = {
      refinementVersionId: args.refinementVersionId,
      plannerShotScriptId: shot.id,
      modelFamilySlug: args.targetVideoModel.familySlug,
      groupId: promptPackage.groupId,
      shotIds: promptPackage.shotIds,
      mode: promptPackage.mode,
      promptText: promptPackage.promptText,
      promptPayload: promptPackage.promptPayload,
      materialBindingIds,
      generatedAt: finalizedAtIso,
    } satisfies PlannerFinalizePromptPayload;

    const shotData = {
      projectId: args.projectId,
      episodeId: args.episodeId,
      sequenceNo: index + 1,
      title: shot.title,
      subtitleText: shot.dialogue,
      narrationText: shot.voiceRole,
      imagePrompt: buildImagePrompt({
        shot,
        sceneName: scene?.name ?? null,
      }),
      motionPrompt: promptPackage.promptText,
      promptJson: promptJson as Prisma.InputJsonValue,
      targetVideoModelFamilySlug: args.targetVideoModel.familySlug,
      materialBindingsJson: materialBindingIds as Prisma.InputJsonValue,
      plannerRefinementVersionId: args.refinementVersionId,
      plannerShotScriptId: shot.id,
      finalizedAt,
    };

    const existingShot = existingShots[index];
    if (existingShot) {
      await args.db.shot.update({
        where: { id: existingShot.id },
        data: shotData,
      });
      continue;
    }

    await args.db.shot.create({
      data: {
        ...shotData,
        status: 'PENDING',
      },
    });
  }

  await args.db.plannerRefinementVersion.update({
    where: { id: args.refinementVersionId },
    data: {
      isConfirmed: true,
      confirmedAt: finalizedAt,
      updatedAt: finalizedAt,
    },
  });

  await args.db.project.update({
    where: { id: args.projectId },
    data: {
      status: 'READY_FOR_STORYBOARD',
      currentEpisodeId: args.episodeId,
    },
  });

  await args.db.episode.update({
    where: { id: args.episodeId },
    data: {
      status: 'READY_FOR_STORYBOARD',
    },
  });

  return {
    promptPackages,
    finalizedShotCount: orderedShots.length,
    finalizedAt: finalizedAtIso,
  };
}
