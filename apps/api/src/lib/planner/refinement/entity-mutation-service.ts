import { syncPlannerRefinementProjection } from './projection.js';
import { prisma, requireEditableRefinement } from './entity-accessors.js';
import type { EntityResult, ScopedEntityArgs } from './entity-service-types.js';

export async function updatePlannerSubject(args: ScopedEntityArgs & {
  subjectId: string;
  patch: {
    name?: string;
    role?: string;
    appearance?: string;
    personality?: string | null;
    prompt?: string;
    negativePrompt?: string | null;
  };
}): Promise<EntityResult<{
  id: string;
  name: string;
  role: string | null;
  appearance: string | null;
  personality: string | null;
  prompt: string | null;
  negativePrompt: string | null;
}>> {
  const access = await requireEditableRefinement(args);
  if (!access.ok) {
    return access;
  }

  const subject = await prisma.plannerSubject.findFirst({
    where: {
      id: args.subjectId,
      refinementVersionId: access.activeRefinement.id,
    },
    select: { id: true },
  });
  if (!subject) {
    return { ok: false, error: 'SUBJECT_NOT_FOUND' };
  }

  const updated = await prisma.$transaction(async (tx) => {
    const nextSubject = await tx.plannerSubject.update({
      where: { id: subject.id },
      data: {
        ...(args.patch.name ? { name: args.patch.name } : {}),
        ...(args.patch.role ? { role: args.patch.role } : {}),
        ...(args.patch.appearance ? { appearance: args.patch.appearance } : {}),
        ...(args.patch.personality !== undefined ? { personality: args.patch.personality } : {}),
        ...(args.patch.prompt ? { prompt: args.patch.prompt } : {}),
        ...(args.patch.negativePrompt !== undefined ? { negativePrompt: args.patch.negativePrompt } : {}),
      },
    });

    await syncPlannerRefinementProjection({
      db: tx,
      refinementVersionId: access.activeRefinement.id,
    });

    return nextSubject;
  });

  return {
    ok: true,
    data: {
      id: updated.id,
      name: updated.name,
      role: updated.role,
      appearance: updated.appearance,
      personality: updated.personality,
      prompt: updated.prompt,
      negativePrompt: updated.negativePrompt,
    },
  };
}

export async function updatePlannerScene(args: ScopedEntityArgs & {
  sceneId: string;
  patch: {
    name?: string;
    time?: string;
    description?: string;
    prompt?: string;
    negativePrompt?: string | null;
  };
}): Promise<EntityResult<{
  id: string;
  name: string;
  time: string | null;
  description: string | null;
  prompt: string | null;
  negativePrompt: string | null;
}>> {
  const access = await requireEditableRefinement(args);
  if (!access.ok) {
    return access;
  }

  const scene = await prisma.plannerScene.findFirst({
    where: {
      id: args.sceneId,
      refinementVersionId: access.activeRefinement.id,
    },
    select: { id: true },
  });
  if (!scene) {
    return { ok: false, error: 'SCENE_NOT_FOUND' };
  }

  const updated = await prisma.$transaction(async (tx) => {
    const nextScene = await tx.plannerScene.update({
      where: { id: scene.id },
      data: {
        ...(args.patch.name ? { name: args.patch.name } : {}),
        ...(args.patch.time ? { time: args.patch.time } : {}),
        ...(args.patch.description ? { description: args.patch.description } : {}),
        ...(args.patch.prompt ? { prompt: args.patch.prompt } : {}),
        ...(args.patch.negativePrompt !== undefined ? { negativePrompt: args.patch.negativePrompt } : {}),
      },
    });

    await syncPlannerRefinementProjection({
      db: tx,
      refinementVersionId: access.activeRefinement.id,
    });

    return nextScene;
  });

  return {
    ok: true,
    data: {
      id: updated.id,
      name: updated.name,
      time: updated.time,
      description: updated.description,
      prompt: updated.prompt,
      negativePrompt: updated.negativePrompt,
    },
  };
}

export async function updatePlannerShot(args: ScopedEntityArgs & {
  shotScriptId: string;
  patch: {
    title?: string;
    visualDescription?: string;
    composition?: string;
    cameraMotion?: string;
    voiceRole?: string;
    dialogue?: string;
  };
}): Promise<EntityResult<{
  id: string;
  title: string;
  visualDescription: string | null;
  composition: string | null;
  cameraMotion: string | null;
  voiceRole: string | null;
  dialogue: string | null;
}>> {
  const access = await requireEditableRefinement(args);
  if (!access.ok) {
    return access;
  }

  const shot = await prisma.plannerShotScript.findFirst({
    where: {
      id: args.shotScriptId,
      refinementVersionId: access.activeRefinement.id,
    },
    select: { id: true },
  });
  if (!shot) {
    return { ok: false, error: 'SHOT_NOT_FOUND' };
  }

  const updated = await prisma.$transaction(async (tx) => {
    const nextShot = await tx.plannerShotScript.update({
      where: { id: shot.id },
      data: {
        ...(args.patch.title ? { title: args.patch.title, shotNo: args.patch.title } : {}),
        ...(args.patch.visualDescription ? { visualDescription: args.patch.visualDescription } : {}),
        ...(args.patch.composition ? { composition: args.patch.composition } : {}),
        ...(args.patch.cameraMotion ? { cameraMotion: args.patch.cameraMotion } : {}),
        ...(args.patch.voiceRole ? { voiceRole: args.patch.voiceRole } : {}),
        ...(args.patch.dialogue ? { dialogue: args.patch.dialogue } : {}),
      },
    });

    await syncPlannerRefinementProjection({
      db: tx,
      refinementVersionId: access.activeRefinement.id,
    });

    return nextShot;
  });

  return {
    ok: true,
    data: {
      id: updated.id,
      title: updated.title,
      visualDescription: updated.visualDescription,
      composition: updated.composition,
      cameraMotion: updated.cameraMotion,
      voiceRole: updated.voiceRole,
      dialogue: updated.dialogue,
    },
  };
}
