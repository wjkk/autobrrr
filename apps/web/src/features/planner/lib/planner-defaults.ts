import type { SekoPlanData } from '@aiv/mock-data';

import type { PlannerPageData } from './planner-page-data';

function buildPlaceholderImage(label: string, fill: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 960"><rect width="640" height="960" fill="${fill}"/><circle cx="320" cy="360" r="120" fill="rgba(255,255,255,0.18)"/><rect x="160" y="560" width="320" height="180" rx="28" fill="rgba(255,255,255,0.12)"/><text x="320" y="820" text-anchor="middle" font-family="system-ui, sans-serif" font-size="42" fill="rgba(255,255,255,0.82)">${label}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export const DEFAULT_REFINEMENT_STEP_TITLES = [
  '细化故事主线与冲突',
  '整理视觉风格与基调',
  '整理主体设定与形象',
  '整理场景设定与空间氛围',
  '整理分镜节奏与镜头语言',
] as const;

export const DEFAULT_OUTLINE_TITLE = '剧本大纲';
export const DEFAULT_USER_PROMPT = '请根据项目简介生成一版可继续细化的策划大纲。';
export const DEFAULT_CONFIRM_PROMPT = '请确认当前大纲后继续细化。';
export const DEFAULT_REFINEMENT_REPLY = '已确认大纲，开始细化剧情内容。';
export const DEFAULT_ASSISTANT_SUMMARY = '我会先生成一版可确认的大纲，再继续细化主体、场景和分镜。';
export const DEFAULT_ASSISTANT_PROMPT = '请确认当前大纲方向，确认后会自动进入细化阶段。';

export const SUBJECT_IMAGE_POOL = [
  buildPlaceholderImage('主体参考 1', '#475569'),
  buildPlaceholderImage('主体参考 2', '#0f766e'),
  buildPlaceholderImage('主体参考 3', '#7c3aed'),
  buildPlaceholderImage('主体参考 4', '#b45309'),
];

export const SCENE_IMAGE_POOL = [
  buildPlaceholderImage('场景参考 1', '#1d4ed8'),
  buildPlaceholderImage('场景参考 2', '#0f766e'),
  buildPlaceholderImage('场景参考 3', '#9a3412'),
  buildPlaceholderImage('场景参考 4', '#4f46e5'),
];

export function createEmptyPlannerSeedData(studio: PlannerPageData): SekoPlanData {
  return {
    projectTitle: studio.project.title,
    episodeTitle: studio.episodes[0]?.title ?? studio.project.title,
    episodeCount: Math.max(1, studio.episodes.length),
    pointCost: studio.planner.pointCost > 0 ? studio.planner.pointCost : 38,
    summaryBullets: studio.project.brief ? [studio.project.brief] : [],
    highlights: [],
    styleBullets: [],
    subjectBullets: [],
    subjects: [],
    sceneBullets: [],
    scenes: [],
    scriptSummary: [],
    acts: [],
  };
}
