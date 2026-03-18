import { plannerStructuredDocSchema, type PlannerStructuredDoc } from './planner-doc.js';
import { getPlannerRerunScopeUserLabel, type PlannerRerunScope } from './planner-rerun-scope.js';
import type { PlannerRerunPromptContext } from './planner-prompt-builder.js';

export type PlannerPartialRerunTarget =
  | Record<string, unknown>
  | Array<Record<string, unknown>>;

function readString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function parseStructuredDoc(value: unknown): PlannerStructuredDoc | null {
  const parsed = plannerStructuredDocSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function pickTargetRecords(targetEntity: PlannerPartialRerunTarget) {
  return Array.isArray(targetEntity) ? targetEntity : [targetEntity];
}

function buildActKey(index: number) {
  return `act-${index + 1}`;
}

function buildActSnapshot(act: PlannerStructuredDoc['acts'][number], index: number) {
  return {
    actKey: buildActKey(index),
    title: act.title,
    time: act.time,
    location: act.location,
    shots: act.shots.map((shot) => ({
      title: shot.title,
      visual: shot.visual,
      composition: shot.composition,
      motion: shot.motion,
      voice: shot.voice,
      line: shot.line,
    })),
  };
}

export function buildPlannerRerunPromptContext(args: {
  scope: PlannerRerunScope;
  targetEntity: PlannerPartialRerunTarget;
  structuredDoc: unknown;
}): PlannerRerunPromptContext {
  const structuredDoc = parseStructuredDoc(args.structuredDoc);
  const targetRecords = pickTargetRecords(args.targetEntity).map((item) => JSON.parse(JSON.stringify(item)) as Record<string, unknown>);
  const fallbackSummary = getPlannerRerunScopeUserLabel(args.scope);

  if (!structuredDoc) {
    return {
      scopeType: args.scope.type,
      targetSummary: fallbackSummary,
      entityContext: {
        scopeType: args.scope.type,
        targetEntity: Array.isArray(args.targetEntity) ? targetRecords : targetRecords[0] ?? {},
      },
    };
  }

  if (args.scope.type === 'subject') {
    const targetName = readString(targetRecords[0]?.name) ?? readString(targetRecords[0]?.title) ?? null;
    const targetSubject = structuredDoc.subjects.find((subject) => subject.title === targetName) ?? structuredDoc.subjects[0] ?? null;
    const relatedShots = targetSubject
      ? structuredDoc.acts.flatMap((act, actIndex) =>
          act.shots
            .filter((shot) => [shot.title, shot.visual, shot.line, shot.voice].some((field) => field.includes(targetSubject.title)))
            .map((shot) => ({
              actKey: buildActKey(actIndex),
              actTitle: act.title,
              shotTitle: shot.title,
            })))
      : [];

    return {
      scopeType: 'subject',
      targetSummary: targetSubject ? `主体：${targetSubject.title}` : fallbackSummary,
      entityContext: {
        scopeType: 'subject',
        targetSubject,
        relatedSubjectBullets: structuredDoc.subjectBullets
          .filter((bullet) => !targetSubject || bullet.includes(targetSubject.title))
          .slice(0, 4),
        relatedShots: relatedShots.slice(0, 6),
        targetEntity: targetRecords[0] ?? {},
      },
    };
  }

  if (args.scope.type === 'scene') {
    const targetName = readString(targetRecords[0]?.name) ?? readString(targetRecords[0]?.title) ?? null;
    const targetScene = structuredDoc.scenes.find((scene) => scene.title === targetName) ?? structuredDoc.scenes[0] ?? null;
    const relatedActs = targetScene
      ? structuredDoc.acts
        .map((act, index) => ({ act, index }))
        .filter(({ act }) => act.location.includes(targetScene.title) || act.title.includes(targetScene.title))
        .map(({ act, index }) => ({
          actKey: buildActKey(index),
          title: act.title,
          location: act.location,
        }))
      : [];

    return {
      scopeType: 'scene',
      targetSummary: targetScene ? `场景：${targetScene.title}` : fallbackSummary,
      entityContext: {
        scopeType: 'scene',
        targetScene,
        relatedSceneBullets: structuredDoc.sceneBullets
          .filter((bullet) => !targetScene || bullet.includes(targetScene.title))
          .slice(0, 4),
        relatedActs: relatedActs.slice(0, 4),
        targetEntity: targetRecords[0] ?? {},
      },
    };
  }

  if (args.scope.type === 'shot') {
    const targetTitles = targetRecords
      .map((item) => readString(item.title) ?? readString(item.shotNo))
      .filter((value): value is string => value !== null);
    const scopedShots = structuredDoc.acts.flatMap((act, actIndex) =>
      act.shots.flatMap((shot, shotIndex) => {
        if (!targetTitles.includes(shot.title)) {
          return [];
        }

        return [{
          actKey: buildActKey(actIndex),
          actTitle: act.title,
          location: act.location,
          shot,
          previousShotTitle: shotIndex > 0 ? act.shots[shotIndex - 1]?.title ?? null : null,
          nextShotTitle: shotIndex < act.shots.length - 1 ? act.shots[shotIndex + 1]?.title ?? null : null,
        }];
      }));

    return {
      scopeType: 'shot',
      targetSummary: scopedShots.length > 0
        ? `分镜：${scopedShots.map((item) => item.shot.title).join('、')}`
        : fallbackSummary,
      entityContext: {
        scopeType: 'shot',
        targetShots: scopedShots.map((item) => ({
          actKey: item.actKey,
          actTitle: item.actTitle,
          location: item.location,
          title: item.shot.title,
          visual: item.shot.visual,
          composition: item.shot.composition,
          motion: item.shot.motion,
          voice: item.shot.voice,
          line: item.shot.line,
          previousShotTitle: item.previousShotTitle,
          nextShotTitle: item.nextShotTitle,
        })),
        targetEntity: targetRecords,
      },
    };
  }

  const targetActKey = readString(targetRecords[0]?.actKey) ?? args.scope.actId;
  const targetActIndex = structuredDoc.acts.findIndex((_, index) => buildActKey(index) === targetActKey);
  const targetAct = targetActIndex >= 0 ? structuredDoc.acts[targetActIndex] ?? null : null;

  return {
    scopeType: 'act',
    targetSummary: targetAct ? `幕：${targetAct.title}` : fallbackSummary,
    entityContext: {
      scopeType: 'act',
      targetAct: targetAct ? buildActSnapshot(targetAct, targetActIndex) : null,
      summaryBullets: structuredDoc.summaryBullets.slice(0, 4),
      scriptSummary: structuredDoc.scriptSummary.slice(0, 4),
      targetEntity: targetRecords[0] ?? {},
    },
  };
}
