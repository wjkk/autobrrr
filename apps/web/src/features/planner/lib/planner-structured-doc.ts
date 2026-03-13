import type { SekoActDraft, SekoImageCard, SekoPlanData } from './seko-plan-data';

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
