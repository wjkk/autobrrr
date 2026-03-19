import { z } from 'zod';
import { sanitizePlannerDisplayText } from './display-text.js';

const outlineCharacterSchema = z.object({
  id: z.string().trim().min(1).max(120).default('character-1'),
  name: z.string().trim().min(1).max(120),
  role: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(1000),
});

const outlineStoryArcSchema = z.object({
  episodeNo: z.number().int().positive().max(99),
  title: z.string().trim().min(1).max(255),
  summary: z.string().trim().min(1).max(2000),
});

export const plannerOutlineDocSchema = z.object({
  projectTitle: z.string().trim().min(1).max(255),
  contentType: z.enum(['drama', 'mv', 'knowledge']).default('drama'),
  subtype: z.string().trim().min(1).max(64),
  format: z.enum(['single', 'series']).default('single'),
  episodeCount: z.number().int().positive().max(24).default(1),
  targetDurationSeconds: z.number().int().positive().max(3600).optional(),
  genre: z.string().trim().min(1).max(255),
  toneStyle: z.array(z.string().trim().min(1).max(255)).min(1).max(12),
  premise: z.string().trim().min(1).max(3000),
  mainCharacters: z.array(outlineCharacterSchema).min(1).max(12),
  storyArc: z.array(outlineStoryArcSchema).min(1).max(24),
  constraints: z.array(z.string().trim().min(1).max(500)).max(12).default([]),
  openQuestions: z.array(z.string().trim().min(1).max(500)).max(12).default([]),
});

export type PlannerOutlineDoc = z.infer<typeof plannerOutlineDocSchema>;
export interface PlannerOutlineRefinementHints {
  characterHints: string[];
  locationHints: string[];
  structureHints: string[];
}

export function sanitizePlannerOutlineDoc(doc: PlannerOutlineDoc): PlannerOutlineDoc {
  return {
    ...doc,
    premise: sanitizePlannerDisplayText(doc.premise),
    mainCharacters: doc.mainCharacters.map((character) => ({
      ...character,
      description: sanitizePlannerDisplayText(character.description),
    })),
    storyArc: doc.storyArc.map((arc) => ({
      ...arc,
      summary: sanitizePlannerDisplayText(arc.summary),
    })),
    constraints: doc.constraints.map(sanitizePlannerDisplayText),
    openQuestions: doc.openQuestions.map(sanitizePlannerDisplayText),
  };
}

function clipHint(text: string, max: number) {
  const normalized = sanitizePlannerDisplayText(text).trim();
  if (normalized.length <= max) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

function dedupeHints(items: string[], max: number) {
  const seen = new Set<string>();
  const next: string[] = [];

  for (const item of items) {
    const normalized = item.trim();
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    next.push(normalized);
    if (next.length >= max) {
      break;
    }
  }

  return next;
}

export function buildPlannerOutlineRefinementHints(value: unknown): PlannerOutlineRefinementHints | null {
  const parsed = plannerOutlineDocSchema.safeParse(value);
  if (!parsed.success) {
    return null;
  }

  const doc = sanitizePlannerOutlineDoc(parsed.data);
  const characterHints = dedupeHints(
    doc.mainCharacters.map((character) => clipHint(`${character.name}：${character.role}，${character.description}`, 500)),
    8,
  );
  const locationHints = dedupeHints(
    doc.storyArc.map((arc) => clipHint(`${arc.title}：${arc.summary}`, 500)),
    8,
  );
  const structureHints = dedupeHints(
    [
      doc.format === 'series' ? `叙事形式：系列，共 ${doc.episodeCount} 集` : `叙事形式：单集，共 ${doc.episodeCount} 集`,
      `题材类型：${doc.genre}`,
      `整体风格：${doc.toneStyle.join('、')}`,
      `剧情结构：${doc.storyArc.map((arc) => arc.title).join(' -> ')}`,
      ...doc.constraints.map((constraint) => `约束：${clipHint(constraint, 300)}`),
    ],
    8,
  );

  return {
    characterHints,
    locationHints,
    structureHints,
  };
}

function stripCodeFence(text: string) {
  const trimmed = text.trim();
  if (!trimmed.startsWith('```')) {
    return trimmed;
  }

  return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
}

function extractJsonCandidate(text: string) {
  const stripped = stripCodeFence(text);
  const start = stripped.indexOf('{');
  if (start === -1) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaping = false;

  for (let index = start; index < stripped.length; index += 1) {
    const char = stripped[index];

    if (escaping) {
      escaping = false;
      continue;
    }

    if (char === '\\') {
      escaping = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === '{') {
      depth += 1;
      continue;
    }

    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return stripped.slice(start, index + 1);
      }
    }
  }

  return null;
}

function normalizeContentType(value: string) {
  if (value === '音乐MV') {
    return 'mv' as const;
  }

  if (value === '知识分享') {
    return 'knowledge' as const;
  }

  return 'drama' as const;
}

export function buildFallbackPlannerOutlineDoc(args: {
  userPrompt: string;
  projectTitle: string;
  contentType: string;
  subtype: string;
  contentMode?: string | null;
  rawText: string;
}) {
  const summarizedRawText = args.rawText ? sanitizePlannerDisplayText(args.rawText) : '';

  return sanitizePlannerOutlineDoc(plannerOutlineDocSchema.parse({
    projectTitle: args.projectTitle,
    contentType: normalizeContentType(args.contentType),
    subtype: args.subtype,
    format: args.contentMode?.toLowerCase() === 'series' ? 'series' : 'single',
    episodeCount: args.contentMode?.toLowerCase() === 'series' ? 6 : 1,
    genre: args.subtype || args.contentType,
    toneStyle: ['情绪明确', '结构清晰', '便于后续细化分镜'],
    premise: summarizedRawText || `围绕“${args.userPrompt}”生成可确认的剧本大纲。`,
    mainCharacters: [
      {
        id: 'character-1',
        name: '主角',
        role: '核心角色',
        description: `${args.userPrompt}，承担主要叙事推进。`,
      },
    ],
    storyArc: [
      {
        episodeNo: 1,
        title: args.projectTitle,
        summary: summarizedRawText || `围绕“${args.userPrompt}”展开主要剧情。`,
      },
    ],
    constraints: ['当前输出应可确认并进入细化阶段。'],
    openQuestions: [],
  }));
}

export function parsePlannerOutlineDoc(args: {
  rawText: string;
  userPrompt: string;
  projectTitle: string;
  contentType: string;
  subtype: string;
  contentMode?: string | null;
}) {
  const candidate = extractJsonCandidate(args.rawText);
  if (!candidate) {
    return buildFallbackPlannerOutlineDoc(args);
  }

  try {
    const parsed = JSON.parse(candidate) as unknown;
    return sanitizePlannerOutlineDoc(plannerOutlineDocSchema.parse(parsed));
  } catch {
    return buildFallbackPlannerOutlineDoc(args);
  }
}
