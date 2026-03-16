import type { SekoActDraft, SekoImageCard, SekoPlanData } from './seko-plan-data';
import type { PlannerOutlineDoc } from './planner-outline-doc';

interface RuntimePlannerSubject {
  id: string;
  name: string;
  prompt: string;
  referenceAssetIds?: string[];
  generatedAssetIds?: string[];
  referenceAssets?: Array<{ sourceUrl: string | null; sourceKind?: string; createdAt?: string }>;
  generatedAssets?: Array<{ sourceUrl: string | null; sourceKind?: string; createdAt?: string }>;
}

interface RuntimePlannerScene {
  id: string;
  name: string;
  prompt: string;
  referenceAssetIds?: string[];
  generatedAssetIds?: string[];
  referenceAssets?: Array<{ sourceUrl: string | null; sourceKind?: string; createdAt?: string }>;
  generatedAssets?: Array<{ sourceUrl: string | null; sourceKind?: string; createdAt?: string }>;
}

interface RuntimePlannerShotScript {
  id: string;
  sceneId: string | null;
  actKey: string;
  actTitle: string;
  shotNo: string;
  title: string;
  targetModelFamilySlug?: string | null;
  visualDescription: string;
  composition: string;
  cameraMotion: string;
  voiceRole: string;
  dialogue: string;
  sortOrder: number;
  referenceAssetIds?: string[];
  generatedAssetIds?: string[];
  referenceAssets?: Array<{ sourceUrl: string | null; sourceKind?: string; createdAt?: string }>;
  generatedAssets?: Array<{ sourceUrl: string | null; sourceKind?: string; createdAt?: string }>;
}

export function plannerAssetPriority(sourceKind: string | undefined) {
  switch ((sourceKind ?? '').toLowerCase()) {
    case 'generated':
      return 0;
    case 'upload':
      return 1;
    case 'reference':
      return 2;
    case 'imported':
      return 3;
    default:
      return 4;
  }
}

export function choosePlannerAssetUrl(
  assets: Array<{ sourceUrl: string | null; sourceKind?: string; createdAt?: string }> | undefined,
) {
  return (assets ?? [])
    .filter((asset): asset is { sourceUrl: string; sourceKind?: string; createdAt?: string } => typeof asset.sourceUrl === 'string' && asset.sourceUrl.length > 0)
    .slice()
    .sort((left, right) => {
      const priorityDiff = plannerAssetPriority(left.sourceKind) - plannerAssetPriority(right.sourceKind);
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
      const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
      return rightTime - leftTime;
    })[0]?.sourceUrl;
}

export interface PlannerStructuredDoc {
  projectTitle: string;
  episodeTitle: string;
  episodeCount: number;
  pointCost: number;
  summaryBullets: string[];
  highlights: Array<{ title: string; description: string }>;
  styleBullets: string[];
  subjectBullets: string[];
  subjects: Array<{
    entityKey?: string;
    title: string;
    prompt: string;
    referenceAssetIds?: string[];
    generatedAssetIds?: string[];
  }>;
  sceneBullets: string[];
  scenes: Array<{
    entityKey?: string;
    title: string;
    prompt: string;
    referenceAssetIds?: string[];
    generatedAssetIds?: string[];
  }>;
  scriptSummary: string[];
  acts: Array<{
    title: string;
    time: string;
    location: string;
    shots: Array<{
      entityKey?: string;
      title: string;
      visual: string;
      composition: string;
      motion: string;
      voice: string;
      line: string;
      targetModelFamilySlug?: string;
      referenceAssetIds?: string[];
      generatedAssetIds?: string[];
    }>;
  }>;
}

function inheritEntityKey(value: string | undefined) {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function normalizeImageCards(items: Array<{ title: string; prompt: string }>, pool: string[], prefix: string): SekoImageCard[] {
  return items.map((item, index) => ({
    id: `${prefix}-${index + 1}`,
    title: item.title,
    prompt: item.prompt,
    image: pool[index % pool.length] ?? '',
  }));
}

function normalizeActs(items: PlannerStructuredDoc['acts']): SekoActDraft[] {
  return items.map((act, actIndex) => ({
    id: `act-${actIndex + 1}`,
    title: act.title,
    time: act.time,
    location: act.location,
    shots: act.shots.map((shot, shotIndex) => ({
      id: `act-${actIndex + 1}-shot-${shotIndex + 1}`,
      title: shot.title,
      image: undefined,
      visual: shot.visual,
      composition: shot.composition,
      motion: shot.motion,
      voice: shot.voice,
      line: shot.line,
    })),
  }));
}

export function toPlannerSeedData(doc: PlannerStructuredDoc, fallback: SekoPlanData): SekoPlanData {
  return {
    projectTitle: doc.projectTitle || fallback.projectTitle,
    episodeTitle: doc.episodeTitle || fallback.episodeTitle,
    episodeCount: doc.episodeCount || fallback.episodeCount,
    pointCost: doc.pointCost || fallback.pointCost,
    summaryBullets: doc.summaryBullets.length ? doc.summaryBullets : fallback.summaryBullets,
    highlights: doc.highlights.length ? doc.highlights : fallback.highlights,
    styleBullets: doc.styleBullets.length ? doc.styleBullets : fallback.styleBullets,
    subjectBullets: doc.subjectBullets.length ? doc.subjectBullets : fallback.subjectBullets,
    subjects: normalizeImageCards(doc.subjects.length ? doc.subjects : fallback.subjects, fallback.subjects.map((item) => item.image), 'subject'),
    sceneBullets: doc.sceneBullets.length ? doc.sceneBullets : fallback.sceneBullets,
    scenes: normalizeImageCards(doc.scenes.length ? doc.scenes : fallback.scenes, fallback.scenes.map((item) => item.image), 'scene'),
    scriptSummary: doc.scriptSummary.length ? doc.scriptSummary : fallback.scriptSummary,
    acts: normalizeActs(doc.acts.length ? doc.acts : fallback.acts),
  };
}

export function toStructuredPlannerDoc(seed: SekoPlanData, previousDoc?: PlannerStructuredDoc | null): PlannerStructuredDoc {
  return {
    projectTitle: seed.projectTitle,
    episodeTitle: seed.episodeTitle,
    episodeCount: seed.episodeCount,
    pointCost: seed.pointCost,
    summaryBullets: seed.summaryBullets,
    highlights: seed.highlights,
    styleBullets: seed.styleBullets,
    subjectBullets: seed.subjectBullets,
    subjects: seed.subjects.map((item, index) => ({
      entityKey: inheritEntityKey(previousDoc?.subjects[index]?.entityKey),
      title: item.title,
      prompt: item.prompt,
      referenceAssetIds: [],
      generatedAssetIds: [],
    })),
    sceneBullets: seed.sceneBullets,
    scenes: seed.scenes.map((item, index) => ({
      entityKey: inheritEntityKey(previousDoc?.scenes[index]?.entityKey),
      title: item.title,
      prompt: item.prompt,
      referenceAssetIds: [],
      generatedAssetIds: [],
    })),
    scriptSummary: seed.scriptSummary,
    acts: seed.acts.map((act, actIndex) => ({
      title: act.title,
      time: act.time,
      location: act.location,
      shots: act.shots.map((shot, shotIndex) => ({
        entityKey: inheritEntityKey(previousDoc?.acts[actIndex]?.shots[shotIndex]?.entityKey),
        title: shot.title,
        visual: shot.visual,
        composition: shot.composition,
        motion: shot.motion,
        voice: shot.voice,
        line: shot.line,
        targetModelFamilySlug: previousDoc?.acts[actIndex]?.shots[shotIndex]?.targetModelFamilySlug,
        referenceAssetIds: [],
        generatedAssetIds: [],
      })),
    })),
  };
}

export function outlineToPreviewStructuredPlannerDoc(outline: PlannerOutlineDoc): PlannerStructuredDoc {
  return {
    projectTitle: outline.projectTitle,
    episodeTitle: outline.storyArc[0]?.title ?? `${outline.projectTitle}·大纲`,
    episodeCount: outline.episodeCount,
    pointCost: 38,
    summaryBullets: [outline.premise],
    highlights: outline.storyArc.slice(0, 3).map((item) => ({
      title: item.title,
      description: item.summary,
    })),
    styleBullets: outline.toneStyle,
    subjectBullets: outline.mainCharacters.map((item) => `${item.name}：${item.description}`),
    subjects: outline.mainCharacters.map((item) => ({
      title: item.name,
      prompt: `${item.role}，${item.description}`,
      referenceAssetIds: [],
      generatedAssetIds: [],
    })),
    sceneBullets: outline.storyArc.map((item) => item.summary),
    scenes: outline.storyArc.slice(0, 4).map((item) => ({
      title: item.title,
      prompt: item.summary,
      referenceAssetIds: [],
      generatedAssetIds: [],
    })),
    scriptSummary: outline.storyArc.map((item) => item.summary),
    acts: [],
  };
}

export function runtimeSubjectsToImageCards(subjects: RuntimePlannerSubject[], fallbackImages: string[]): SekoImageCard[] {
  return subjects.map((subject, index) => ({
    id: subject.id,
    title: subject.name,
    prompt: subject.prompt,
    image: choosePlannerAssetUrl([...(subject.generatedAssets ?? []), ...(subject.referenceAssets ?? [])]) ?? fallbackImages[index % fallbackImages.length] ?? '',
  }));
}

export function runtimeScenesToImageCards(scenes: RuntimePlannerScene[], fallbackImages: string[]): SekoImageCard[] {
  return scenes.map((scene, index) => ({
    id: scene.id,
    title: scene.name,
    prompt: scene.prompt,
    image: choosePlannerAssetUrl([...(scene.generatedAssets ?? []), ...(scene.referenceAssets ?? [])]) ?? fallbackImages[index % fallbackImages.length] ?? '',
  }));
}

export function runtimeShotScriptsToActs(
  shotScripts: RuntimePlannerShotScript[],
  scenes: RuntimePlannerScene[],
): SekoActDraft[] {
  const scenesById = new Map(scenes.map((scene) => [scene.id, scene]));
  const acts = new Map<string, SekoActDraft>();

  for (const shot of shotScripts.slice().sort((left, right) => left.sortOrder - right.sortOrder)) {
    const existingAct = acts.get(shot.actKey);
    const scene = shot.sceneId ? scenesById.get(shot.sceneId) : null;
    const act =
      existingAct
      ?? {
        id: shot.actKey,
        title: shot.actTitle,
        time: scene?.name ? '' : '',
        location: scene?.name ?? '',
        shots: [],
      };

    act.shots.push({
      id: shot.id,
      title: shot.title || shot.shotNo,
      image: choosePlannerAssetUrl([...(shot.generatedAssets ?? []), ...(shot.referenceAssets ?? [])]) ?? undefined,
      visual: shot.visualDescription,
      composition: shot.composition,
      motion: shot.cameraMotion,
      voice: shot.voiceRole,
      line: shot.dialogue,
      referenceAssetIds: shot.referenceAssetIds ?? [],
      generatedAssetIds: shot.generatedAssetIds ?? [],
    });

    if (!existingAct) {
      acts.set(shot.actKey, act);
    }
  }

  return Array.from(acts.values());
}
