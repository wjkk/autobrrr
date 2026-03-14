import type { PlannerStructuredDoc } from './planner-doc.js';

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function mergeShotOnlyDoc(args: {
  previousDoc: PlannerStructuredDoc;
  nextDoc: PlannerStructuredDoc;
  targetEntity: Record<string, unknown>;
}) {
  const targetShotTitle =
    (typeof args.targetEntity.title === 'string' && args.targetEntity.title.trim()) ||
    (typeof args.targetEntity.shotNo === 'string' && args.targetEntity.shotNo.trim()) ||
    '';

  if (!targetShotTitle) {
    return args.previousDoc;
  }

  const replacementShot = args.nextDoc.acts
    .flatMap((act) => act.shots)
    .find((shot) => shot.title === targetShotTitle);

  if (!replacementShot) {
    return args.previousDoc;
  }

  return {
    ...args.previousDoc,
    acts: args.previousDoc.acts.map((act) => ({
      ...act,
      shots: act.shots.map((shot) => (shot.title === targetShotTitle ? replacementShot : shot)),
    })),
  };
}

export function buildPartialDiffSummary(args: {
  previousDoc: PlannerStructuredDoc | null;
  nextDoc: PlannerStructuredDoc;
  input: Record<string, unknown>;
}) {
  const scope = readString(args.input.scope);
  const targetEntity = readObject(args.input.targetEntity);
  const previousDoc = args.previousDoc;

  if (!scope || !previousDoc) {
    return [] as string[];
  }

  if (scope === 'subject_only') {
    const targetName = readString(targetEntity.name) ?? readString(targetEntity.title) ?? '目标主体';
    const previousSubject = previousDoc.subjects.find((subject) => subject.title === targetName);
    const nextSubject = args.nextDoc.subjects.find((subject) => subject.title === targetName) ?? args.nextDoc.subjects[0];
    if (!nextSubject) {
      return [`已尝试更新主体：${targetName}`];
    }

    const summary = [`已局部更新主体：${targetName}`];
    if (previousSubject?.prompt !== nextSubject.prompt) {
      summary.push('主体设定提示词已更新');
    }
    if (!previousSubject) {
      summary.push('主体列表已重新同步');
    }
    return summary;
  }

  if (scope === 'scene_only') {
    const targetName = readString(targetEntity.name) ?? readString(targetEntity.title) ?? '目标场景';
    const previousScene = previousDoc.scenes.find((scene) => scene.title === targetName);
    const nextScene = args.nextDoc.scenes.find((scene) => scene.title === targetName) ?? args.nextDoc.scenes[0];
    if (!nextScene) {
      return [`已尝试更新场景：${targetName}`];
    }

    const summary = [`已局部更新场景：${targetName}`];
    if (previousScene?.prompt !== nextScene.prompt) {
      summary.push('场景描述与提示词已更新');
    }
    if (!previousScene) {
      summary.push('场景列表已重新同步');
    }
    return summary;
  }

  if (scope === 'shots_only') {
    const targetTitle = readString(targetEntity.title) ?? readString(targetEntity.shotNo) ?? '目标分镜';
    const previousShot = previousDoc.acts.flatMap((act) => act.shots).find((shot) => shot.title === targetTitle);
    const nextShot = args.nextDoc.acts.flatMap((act) => act.shots).find((shot) => shot.title === targetTitle);
    if (!previousShot || !nextShot) {
      return [`已局部重写分镜：${targetTitle}`];
    }

    const summary = [`已局部重写分镜：${targetTitle}`];
    if (previousShot.visual !== nextShot.visual) {
      summary.push('画面描述已调整');
    }
    if (previousShot.composition !== nextShot.composition) {
      summary.push('构图设计已调整');
    }
    if (previousShot.motion !== nextShot.motion) {
      summary.push('运镜调度已调整');
    }
    if (previousShot.line !== nextShot.line) {
      summary.push('台词内容已调整');
    }
    return summary;
  }

  return [];
}

export function applyPartialRerunScope(args: {
  previousDoc: PlannerStructuredDoc | null;
  nextDoc: PlannerStructuredDoc;
  input: Record<string, unknown>;
}) {
  const previousDoc = args.previousDoc;
  if (!previousDoc) {
    return args.nextDoc;
  }

  const scope = readString(args.input.scope);
  const targetEntity = readObject(args.input.targetEntity);

  if (scope === 'subject_only') {
    return {
      ...previousDoc,
      subjectBullets: args.nextDoc.subjectBullets,
      subjects: args.nextDoc.subjects,
    } satisfies PlannerStructuredDoc;
  }

  if (scope === 'scene_only') {
    return {
      ...previousDoc,
      sceneBullets: args.nextDoc.sceneBullets,
      scenes: args.nextDoc.scenes,
    } satisfies PlannerStructuredDoc;
  }

  if (scope === 'shots_only') {
    return mergeShotOnlyDoc({
      previousDoc,
      nextDoc: args.nextDoc,
      targetEntity,
    });
  }

  return args.nextDoc;
}
