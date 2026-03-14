import type { SekoActDraft, SekoImageCard, SekoPlanData } from './seko-plan-data';
import type { PlannerOutlineDoc } from './planner-outline-doc';

interface RuntimePlannerSubject {
  id: string;
  name: string;
  prompt: string;
}

interface RuntimePlannerScene {
  id: string;
  name: string;
  prompt: string;
}

interface RuntimePlannerShotScript {
  id: string;
  sceneId: string | null;
  actKey: string;
  actTitle: string;
  shotNo: string;
  title: string;
  visualDescription: string;
  composition: string;
  cameraMotion: string;
  voiceRole: string;
  dialogue: string;
  sortOrder: number;
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
  subjects: Array<{ title: string; prompt: string }>;
  sceneBullets: string[];
  scenes: Array<{ title: string; prompt: string }>;
  scriptSummary: string[];
  acts: Array<{
    title: string;
    time: string;
    location: string;
    shots: Array<{
      title: string;
      visual: string;
      composition: string;
      motion: string;
      voice: string;
      line: string;
    }>;
  }>;
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

export function toStructuredPlannerDoc(seed: SekoPlanData): PlannerStructuredDoc {
  return {
    projectTitle: seed.projectTitle,
    episodeTitle: seed.episodeTitle,
    episodeCount: seed.episodeCount,
    pointCost: seed.pointCost,
    summaryBullets: seed.summaryBullets,
    highlights: seed.highlights,
    styleBullets: seed.styleBullets,
    subjectBullets: seed.subjectBullets,
    subjects: seed.subjects.map((item) => ({
      title: item.title,
      prompt: item.prompt,
    })),
    sceneBullets: seed.sceneBullets,
    scenes: seed.scenes.map((item) => ({
      title: item.title,
      prompt: item.prompt,
    })),
    scriptSummary: seed.scriptSummary,
    acts: seed.acts.map((act) => ({
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
    })),
    sceneBullets: outline.storyArc.map((item) => item.summary),
    scenes: outline.storyArc.slice(0, 4).map((item) => ({
      title: item.title,
      prompt: item.summary,
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
    image: fallbackImages[index % fallbackImages.length] ?? '',
  }));
}

export function runtimeScenesToImageCards(scenes: RuntimePlannerScene[], fallbackImages: string[]): SekoImageCard[] {
  return scenes.map((scene, index) => ({
    id: scene.id,
    title: scene.name,
    prompt: scene.prompt,
    image: fallbackImages[index % fallbackImages.length] ?? '',
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
      visual: shot.visualDescription,
      composition: shot.composition,
      motion: shot.cameraMotion,
      voice: shot.voiceRole,
      line: shot.dialogue,
    });

    if (!existingAct) {
      acts.set(shot.actKey, act);
    }
  }

  return Array.from(acts.values());
}
