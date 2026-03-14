import { z } from 'zod';

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
  const end = stripped.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  return stripped.slice(start, end + 1);
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
  return plannerOutlineDocSchema.parse({
    projectTitle: args.projectTitle,
    contentType: normalizeContentType(args.contentType),
    subtype: args.subtype,
    format: args.contentMode?.toLowerCase() === 'series' ? 'series' : 'single',
    episodeCount: args.contentMode?.toLowerCase() === 'series' ? 6 : 1,
    genre: args.subtype || args.contentType,
    toneStyle: ['情绪明确', '结构清晰', '便于后续细化分镜'],
    premise: args.rawText || `围绕“${args.userPrompt}”生成可确认的剧本大纲。`,
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
        summary: args.rawText || `围绕“${args.userPrompt}”展开主要剧情。`,
      },
    ],
    constraints: ['当前输出应可确认并进入细化阶段。'],
    openQuestions: [],
  });
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
    return plannerOutlineDocSchema.parse(parsed);
  } catch {
    return buildFallbackPlannerOutlineDoc(args);
  }
}
