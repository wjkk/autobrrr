import { readObject, readObjectArray, readString } from '../../json-helpers.js';
import type { PlannerStructuredDoc } from '../doc/planner-doc.js';
import { parseStoredPlannerRerunScope } from '../rerun/scope.js';

function pickTargetEntityRecord(value: Record<string, unknown> | Record<string, unknown>[]) {
  return Array.isArray(value) ? value[0] ?? {} : value;
}

function mergeShotOnlyDoc(args: {
  previousDoc: PlannerStructuredDoc;
  nextDoc: PlannerStructuredDoc;
  targetEntity: Record<string, unknown> | Record<string, unknown>[];
}) {
  const targetShotTitles = (Array.isArray(args.targetEntity) ? args.targetEntity : [args.targetEntity])
    .map((item) => readString(item.title) ?? readString(item.shotNo) ?? '')
    .filter((value): value is string => value.length > 0);

  if (!targetShotTitles.length) {
    return args.previousDoc;
  }

  const replacementShotMap = new Map(
    args.nextDoc.acts
      .flatMap((act) => act.shots)
      .filter((shot) => targetShotTitles.includes(shot.title))
      .map((shot) => [shot.title, shot] as const),
  );

  if (replacementShotMap.size === 0) {
    return args.previousDoc;
  }

  return {
    ...args.previousDoc,
    acts: args.previousDoc.acts.map((act) => ({
      ...act,
      shots: act.shots.map((shot) => replacementShotMap.get(shot.title) ?? shot),
    })),
  };
}

export function buildPartialDiffSummary(args: {
  previousDoc: PlannerStructuredDoc | null;
  nextDoc: PlannerStructuredDoc;
  input: Record<string, unknown>;
}) {
  const scope = parseStoredPlannerRerunScope(args.input);
  const targetEntity = Array.isArray(args.input.targetEntity)
    ? readObjectArray(args.input.targetEntity)
    : readObject(args.input.targetEntity);
  const previousDoc = args.previousDoc;

  if (!scope || !previousDoc) {
    return [] as string[];
  }

  if (scope.type === 'subject') {
    const entity = pickTargetEntityRecord(targetEntity);
    const targetName = readString(entity.name) ?? readString(entity.title) ?? '目标主体';
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

  if (scope.type === 'scene') {
    const entity = pickTargetEntityRecord(targetEntity);
    const targetName = readString(entity.name) ?? readString(entity.title) ?? '目标场景';
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

  if (scope.type === 'shot') {
    const targetTitles = (Array.isArray(targetEntity) ? targetEntity : [targetEntity])
      .map((item) => readString(item.title) ?? readString(item.shotNo) ?? null)
      .filter((value): value is string => !!value);
    if (targetTitles.length === 0) {
      return ['已局部重写分镜'];
    }

    const summary = [`已局部重写分镜：${targetTitles.join('、')}`];
    for (const targetTitle of targetTitles) {
      const previousShot = previousDoc.acts.flatMap((act) => act.shots).find((shot) => shot.title === targetTitle);
      const nextShot = args.nextDoc.acts.flatMap((act) => act.shots).find((shot) => shot.title === targetTitle);
      if (!previousShot || !nextShot) {
        continue;
      }
      if (previousShot.visual !== nextShot.visual) {
        summary.push(`${targetTitle} 画面描述已调整`);
      }
      if (previousShot.composition !== nextShot.composition) {
        summary.push(`${targetTitle} 构图设计已调整`);
      }
      if (previousShot.motion !== nextShot.motion) {
        summary.push(`${targetTitle} 运镜调度已调整`);
      }
      if (previousShot.line !== nextShot.line) {
        summary.push(`${targetTitle} 台词内容已调整`);
      }
    }
    return summary;
  }

  if (scope.type === 'act') {
    const entity = pickTargetEntityRecord(targetEntity);
    const actKey = readString(entity.actKey) ?? scope.actId;
    return [`已局部重写幕：${actKey}`];
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

  const scope = parseStoredPlannerRerunScope(args.input);
  const targetEntity = Array.isArray(args.input.targetEntity)
    ? readObjectArray(args.input.targetEntity)
    : readObject(args.input.targetEntity);

  if (!scope) {
    return args.nextDoc;
  }

  if (scope.type === 'subject') {
    return {
      ...previousDoc,
      subjectBullets: args.nextDoc.subjectBullets,
      subjects: args.nextDoc.subjects,
    } satisfies PlannerStructuredDoc;
  }

  if (scope.type === 'scene') {
    return {
      ...previousDoc,
      sceneBullets: args.nextDoc.sceneBullets,
      scenes: args.nextDoc.scenes,
    } satisfies PlannerStructuredDoc;
  }

  if (scope.type === 'shot') {
    return mergeShotOnlyDoc({
      previousDoc,
      nextDoc: args.nextDoc,
      targetEntity,
    });
  }

  if (scope.type === 'act') {
    const targetActKey = readString(pickTargetEntityRecord(targetEntity).actKey) ?? scope.actId;
    return {
      ...previousDoc,
      acts: previousDoc.acts.map((act, index) => {
        const nextAct = args.nextDoc.acts[index];
        const actKey = `act-${index + 1}`;
        return actKey === targetActKey && nextAct ? nextAct : act;
      }),
    } satisfies PlannerStructuredDoc;
  }

  return args.nextDoc;
}
