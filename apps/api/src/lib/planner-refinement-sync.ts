import { Prisma } from '@prisma/client';

import type { PlannerStructuredDoc } from './planner-doc.js';
import { buildPlannerEntityFingerprint, scorePlannerEntitySimilarity } from './planner-entity-fingerprint.js';

type PlannerDbClient = Prisma.TransactionClient;

interface PreviousPlannerAssetProjection {
  subjects?: Array<{
    entityKey?: string;
    semanticFingerprint?: string;
    title?: string;
    prompt?: string;
    referenceAssetIds?: string[];
    generatedAssetIds?: string[];
  }>;
  scenes?: Array<{
    entityKey?: string;
    semanticFingerprint?: string;
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
      subjectBindings?: string[];
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

function uniqueIds(values: string[]) {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)));
}

function buildSubjectAliasCandidates(title: string) {
  const rawTitle = title.trim();
  const aliases = new Set<string>();

  if (rawTitle.length > 0) {
    aliases.add(rawTitle);
  }

  for (const part of rawTitle.split(/[-/:：·•()（）[\]【】\s,，、]+/u)) {
    const alias = part.trim();
    if (alias.length >= 2) {
      aliases.add(alias);
    }
  }

  return Array.from(aliases).sort((left, right) => right.length - left.length);
}

function scoreSubjectMatchInShotText(text: string, aliases: string[]) {
  let score = 0;

  for (const [index, alias] of aliases.entries()) {
    if (!alias || !text.includes(alias)) {
      continue;
    }

    score += alias.length * 3;
    if (index === 0) {
      score += 12;
    }
  }

  return score;
}

interface SubjectBindingResolutionSubject {
  id: string;
  entityKey: string | null;
  title: string;
  prompt: string;
}

interface PreviousEntityAssetCandidate {
  matchKey: string;
  entityKey: string | null;
  semanticFingerprint: string;
  title: string;
  prompt: string;
  referenceAssetIds: string[];
  generatedAssetIds: string[];
}

function resolveSubjectBindingIds(args: {
  bindings?: string[];
  subjects: SubjectBindingResolutionSubject[];
}) {
  if (!args.bindings?.length) {
    return [];
  }

  const byEntityKey = new Map<string, string>();
  const byNormalizedTitle = new Map<string, string>();
  const byNormalizedPrompt = new Map<string, string>();

  for (const subject of args.subjects) {
    if (subject.entityKey) {
      byEntityKey.set(subject.entityKey, subject.id);
    }
    byNormalizedTitle.set(normalizeKey(subject.title), subject.id);
    byNormalizedPrompt.set(normalizeKey(subject.prompt), subject.id);
  }

  return uniqueIds(
    args.bindings
      .map((binding) => {
        const normalized = binding.trim();
        if (!normalized) {
          return null;
        }

        return byEntityKey.get(normalized)
          ?? byNormalizedTitle.get(normalizeKey(normalized))
          ?? byNormalizedPrompt.get(normalizeKey(normalized))
          ?? null;
      })
      .filter((value): value is string => typeof value === 'string' && value.length > 0),
  );
}

function inferShotSubjectBindings(args: {
  shot: PlannerStructuredDoc['acts'][number]['shots'][number];
  subjects: SubjectBindingResolutionSubject[];
  previousBindings?: string[];
}) {
  const explicitBindings = resolveSubjectBindingIds({
    bindings: args.shot.subjectBindings,
    subjects: args.subjects,
  });
  if (explicitBindings.length > 0) {
    return explicitBindings;
  }

  const shotText = [
    args.shot.title,
    args.shot.visual,
    args.shot.composition,
    args.shot.motion,
    args.shot.voice,
    args.shot.line,
  ].join('\n');

  const inferredBindings = args.subjects
    .map((subject) => ({
      id: subject.id,
      score: scoreSubjectMatchInShotText(shotText, buildSubjectAliasCandidates(subject.title)),
    }))
    .filter((subject) => subject.score > 0)
    .sort((left, right) => right.score - left.score)
    .map((subject) => subject.id);

  if (inferredBindings.length > 0) {
    return uniqueIds(inferredBindings);
  }

  const previousBindings = resolveSubjectBindingIds({
    bindings: args.previousBindings,
    subjects: args.subjects,
  });
  if (previousBindings.length > 0) {
    return previousBindings;
  }

  if (args.subjects.length === 1) {
    return [args.subjects[0].id];
  }

  return [];
}

function buildPreviousEntityAssetCandidates(items: Array<{
  entityKey?: string;
  semanticFingerprint?: string;
  title?: string;
  prompt?: string;
  referenceAssetIds?: string[];
  generatedAssetIds?: string[];
}>) {
  return items.map((item) => ({
    matchKey: readProjectionKey(item.entityKey)
      ?? item.semanticFingerprint?.trim()
      ?? normalizeKey(item.title ?? item.prompt ?? ''),
    entityKey: readProjectionKey(item.entityKey),
    semanticFingerprint:
      item.semanticFingerprint?.trim()
      || buildPlannerEntityFingerprint({
        title: item.title ?? null,
        prompt: item.prompt ?? null,
      }),
    title: item.title?.trim() ?? '',
    prompt: item.prompt?.trim() ?? '',
    referenceAssetIds: toAssetIdList(item.referenceAssetIds),
    generatedAssetIds: toAssetIdList(item.generatedAssetIds),
  }));
}

function resolvePreviousEntityAssetCandidate(args: {
  entityKey: string | null;
  semanticFingerprint: string;
  title: string;
  prompt: string;
  candidates: PreviousEntityAssetCandidate[];
  usedMatchKeys: Set<string>;
}) {
  const directKeyMatch =
    args.entityKey
      ? args.candidates.find((candidate) => candidate.entityKey === args.entityKey)
      : null;
  if (directKeyMatch) {
    args.usedMatchKeys.add(directKeyMatch.matchKey);
    return directKeyMatch;
  }

  const exactFingerprintMatch = args.candidates.find(
    (candidate) =>
      !args.usedMatchKeys.has(candidate.matchKey)
      && candidate.semanticFingerprint.length > 0
      && candidate.semanticFingerprint === args.semanticFingerprint,
  );
  if (exactFingerprintMatch) {
    args.usedMatchKeys.add(exactFingerprintMatch.matchKey);
    return exactFingerprintMatch;
  }

  let bestCandidate: PreviousEntityAssetCandidate | null = null;
  let bestScore = 0;

  for (const candidate of args.candidates) {
    if (args.usedMatchKeys.has(candidate.matchKey)) {
      continue;
    }

    const score = scorePlannerEntitySimilarity({
      currentTitle: args.title,
      currentPrompt: args.prompt,
      currentFingerprint: args.semanticFingerprint,
      previousTitle: candidate.title,
      previousPrompt: candidate.prompt,
      previousFingerprint: candidate.semanticFingerprint,
    });

    if (score > bestScore) {
      bestScore = score;
      bestCandidate = candidate;
    }
  }

  if (bestCandidate && bestScore >= 8) {
    args.usedMatchKeys.add(bestCandidate.matchKey);
    return bestCandidate;
  }

  return null;
}

export const __testables = {
  normalizeKey,
  readProjectionKey,
  toAssetIdList,
  inferSceneTime,
  inferLocationType,
  buildSubjectAliasCandidates,
  resolveSubjectBindingIds,
  inferShotSubjectBindings,
  buildPreviousEntityAssetCandidates,
  resolvePreviousEntityAssetCandidate,
};

export async function syncPlannerRefinementDerivedData(args: {
  db: PlannerDbClient;
  refinementVersionId: string;
  structuredDoc: PlannerStructuredDoc;
  previousProjection?: PreviousPlannerAssetProjection | null;
}) {
  const { db, refinementVersionId, structuredDoc, previousProjection } = args;

  const previousSubjectAssets = buildPreviousEntityAssetCandidates(previousProjection?.subjects ?? []);
  const previousSceneAssets = buildPreviousEntityAssetCandidates(previousProjection?.scenes ?? []);
  const usedPreviousSubjectAssetKeys = new Set<string>();
  const usedPreviousSceneAssetKeys = new Set<string>();
  const previousShotAssets = new Map(
    (previousProjection?.acts ?? []).flatMap((act) => (act.shots ?? []).map((shot) => [
      readProjectionKey(shot.entityKey) ?? normalizeKey(`${shot.title ?? ''}::${shot.visual ?? ''}`),
      {
        targetModelFamilySlug: typeof shot.targetModelFamilySlug === 'string' && shot.targetModelFamilySlug.trim().length > 0
          ? shot.targetModelFamilySlug.trim()
          : null,
        subjectBindings: toAssetIdList(shot.subjectBindings),
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
      const entityKey = readProjectionKey(subject.entityKey);
      const semanticFingerprint = subject.semanticFingerprint?.trim() || buildPlannerEntityFingerprint({
        title: subject.title,
        prompt: subject.prompt,
      });
      const previousAssets = resolvePreviousEntityAssetCandidate({
        entityKey,
        semanticFingerprint,
        title: subject.title,
        prompt: subject.prompt,
        candidates: previousSubjectAssets,
        usedMatchKeys: usedPreviousSubjectAssetKeys,
      });
      return db.plannerSubject.create({
        data: {
          ...(entityKey ? { id: entityKey } : {}),
          refinementVersionId,
          name: subject.title,
          role: index === 0 ? '主角' : '配角',
          appearance: subject.prompt,
          prompt: subject.prompt,
          referenceAssetIdsJson: (
            subject.referenceAssetIds?.length
              ? subject.referenceAssetIds
              : previousAssets?.referenceAssetIds ?? []
          ) as Prisma.InputJsonValue,
          generatedAssetIdsJson: (
            subject.generatedAssetIds?.length
              ? subject.generatedAssetIds
              : previousAssets?.generatedAssetIds ?? []
          ) as Prisma.InputJsonValue,
          sortOrder: index + 1,
          editable: true,
        },
      }).then((createdSubject) => ({
        id: createdSubject.id,
        entityKey,
        title: subject.title,
        prompt: subject.prompt,
      }));
    }),
  );

  const scenes = await Promise.all(
    structuredDoc.scenes.map((scene, index) => {
      const entityKey = readProjectionKey(scene.entityKey);
      const semanticFingerprint = scene.semanticFingerprint?.trim() || buildPlannerEntityFingerprint({
        title: scene.title,
        prompt: scene.prompt,
      });
      const previousAssets = resolvePreviousEntityAssetCandidate({
        entityKey,
        semanticFingerprint,
        title: scene.title,
        prompt: scene.prompt,
        candidates: previousSceneAssets,
        usedMatchKeys: usedPreviousSceneAssetKeys,
      });
      return db.plannerScene.create({
        data: {
          ...(entityKey ? { id: entityKey } : {}),
          refinementVersionId,
          name: scene.title,
          time: inferSceneTime(structuredDoc, scene.title),
          locationType: inferLocationType(scene.prompt),
          description: scene.prompt,
          prompt: scene.prompt,
          referenceAssetIdsJson: (
            scene.referenceAssetIds?.length
              ? scene.referenceAssetIds
              : previousAssets?.referenceAssetIds ?? []
          ) as Prisma.InputJsonValue,
          generatedAssetIdsJson: (
            scene.generatedAssetIds?.length
              ? scene.generatedAssetIds
              : previousAssets?.generatedAssetIds ?? []
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
          subjectBindingsJson: inferShotSubjectBindings({
            shot,
            subjects: subjects.map((subject) => ({
              id: subject.id,
              entityKey: subject.entityKey,
              title: subject.title,
              prompt: subject.prompt,
            })),
            previousBindings: previousShotAssets.get(assetKey)?.subjectBindings,
          }) as Prisma.InputJsonValue,
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
