import { z } from 'zod';

const plannerShotSchema = z.object({
  title: z.string().trim().min(1).max(120),
  visual: z.string().trim().min(1).max(2000),
  composition: z.string().trim().min(1).max(1000),
  motion: z.string().trim().min(1).max(1000),
  voice: z.string().trim().min(1).max(120),
  line: z.string().trim().min(1).max(1000),
});

const plannerActSchema = z.object({
  title: z.string().trim().min(1).max(120),
  time: z.string().trim().max(120).default(''),
  location: z.string().trim().max(120).default(''),
  shots: z.array(plannerShotSchema).min(1).max(12),
});

const plannerAssetSchema = z.object({
  title: z.string().trim().min(1).max(120),
  prompt: z.string().trim().min(1).max(2000),
});

export const plannerStructuredDocSchema = z.object({
  projectTitle: z.string().trim().min(1).max(255),
  episodeTitle: z.string().trim().min(1).max(255),
  episodeCount: z.number().int().positive().max(24).default(1),
  pointCost: z.number().int().nonnegative().max(999).default(38),
  summaryBullets: z.array(z.string().trim().min(1).max(2000)).min(1).max(8),
  highlights: z.array(z.object({ title: z.string().trim().min(1).max(255), description: z.string().trim().min(1).max(2000) })).min(1).max(6),
  styleBullets: z.array(z.string().trim().min(1).max(2000)).min(1).max(8),
  subjectBullets: z.array(z.string().trim().min(1).max(2000)).min(1).max(12),
  subjects: z.array(plannerAssetSchema).min(1).max(8),
  sceneBullets: z.array(z.string().trim().min(1).max(2000)).min(1).max(12),
  scenes: z.array(plannerAssetSchema).min(1).max(8),
  scriptSummary: z.array(z.string().trim().min(1).max(500)).min(1).max(8),
  acts: z.array(plannerActSchema).min(1).max(8),
});

export type PlannerStructuredDoc = z.infer<typeof plannerStructuredDocSchema>;

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

export function buildPlannerGenerationPrompt(args: {
  userPrompt: string;
  projectTitle: string;
  episodeTitle: string;
}) {
  return [
    '你是短片策划助手。',
    '请根据用户需求生成严格的 JSON，不要输出解释，不要输出 markdown，不要输出代码块。',
    '字段必须完整，必须使用中文。',
    'JSON schema:',
    JSON.stringify({
      projectTitle: '项目标题',
      episodeTitle: '集标题',
      episodeCount: 1,
      pointCost: 38,
      summaryBullets: ['一句或多句故事梗概'],
      highlights: [{ title: '亮点标题', description: '亮点说明' }],
      styleBullets: ['美术风格描述'],
      subjectBullets: ['主体描述'],
      subjects: [{ title: '主体名称', prompt: '主体生图提示词' }],
      sceneBullets: ['场景描述'],
      scenes: [{ title: '场景名称', prompt: '场景生图提示词' }],
      scriptSummary: ['剧本摘要'],
      acts: [
        {
          title: '第1幕',
          time: '夜晚',
          location: '室内',
          shots: [
            {
              title: '分镜01-1',
              visual: '画面描述',
              composition: '构图设计',
              motion: '运镜调度',
              voice: '配音角色',
              line: '台词内容',
            },
          ],
        },
      ],
    }),
    `当前项目标题：${args.projectTitle}`,
    `当前集标题：${args.episodeTitle}`,
    `用户需求：${args.userPrompt}`,
  ].join('\n');
}

export function buildFallbackPlannerStructuredDoc(args: {
  userPrompt: string;
  projectTitle: string;
  episodeTitle: string;
  rawText: string;
}): PlannerStructuredDoc {
  return {
    projectTitle: args.projectTitle,
    episodeTitle: args.episodeTitle,
    episodeCount: 1,
    pointCost: 38,
    summaryBullets: [args.rawText || `围绕“${args.userPrompt}”生成单集短片策划。`],
    highlights: [
      { title: '亮点1', description: '强调人物、场景与情绪的递进关系。' },
      { title: '亮点2', description: '通过镜头变化建立节奏与反差。' },
    ],
    styleBullets: ['整体保持角色一致性、镜头清晰、氛围统一。'],
    subjectBullets: ['主角承担情绪推进，配角负责冲突与信息补充。'],
    subjects: [
      { title: '主角', prompt: `${args.userPrompt}，主体角色设定清晰，形象统一。` },
      { title: '配角', prompt: `${args.userPrompt}，补充关键配角和辅助元素。` },
    ],
    sceneBullets: ['场景先建立空间，再推进动作和情绪变化。'],
    scenes: [
      { title: '核心场景', prompt: `${args.userPrompt}，电影感场景设计，氛围明确。` },
      { title: '过渡场景', prompt: `${args.userPrompt}，用于镜头衔接和节奏过渡。` },
    ],
    scriptSummary: ['采用三段式叙事，控制镜头节奏与信息释放。'],
    acts: [
      {
        title: '第1幕',
        time: '夜晚',
        location: '主场景',
        shots: [
          {
            title: '分镜01-1',
            visual: args.userPrompt,
            composition: '中景，主体明确，空间关系清晰。',
            motion: '缓慢推进，建立氛围。',
            voice: '旁白',
            line: args.rawText || `围绕“${args.userPrompt}”展开开场叙事。`,
          },
        ],
      },
    ],
  };
}

export function parsePlannerStructuredDoc(args: {
  rawText: string;
  userPrompt: string;
  projectTitle: string;
  episodeTitle: string;
}) {
  const candidate = extractJsonCandidate(args.rawText);
  if (!candidate) {
    return buildFallbackPlannerStructuredDoc(args);
  }

  try {
    const parsed = JSON.parse(candidate) as unknown;
    return plannerStructuredDocSchema.parse(parsed);
  } catch {
    return buildFallbackPlannerStructuredDoc(args);
  }
}
