import { z } from 'zod';
import { sanitizePlannerDisplayText } from './planner-display-text.js';
import { buildPlannerEntityFingerprint } from './planner-entity-fingerprint.js';

const plannerAssetIdListSchema = z.array(z.string().trim().min(1).max(191)).max(16).default([]);
const plannerEntityBindingListSchema = z.array(z.string().trim().min(1).max(191)).max(8).default([]);
export const plannerEntityTypeSchema = z.enum(['subject', 'scene']);
export type PlannerEntityType = z.infer<typeof plannerEntityTypeSchema>;

const plannerShotSchema = z.object({
  entityKey: z.string().trim().min(1).max(191).optional(),
  title: z.string().trim().min(1).max(120),
  visual: z.string().trim().min(1).max(2000),
  composition: z.string().trim().min(1).max(1000),
  motion: z.string().trim().min(1).max(1000),
  voice: z.string().trim().min(1).max(120),
  line: z.string().trim().min(1).max(1000),
  targetModelFamilySlug: z.string().trim().min(1).max(120).optional(),
  subjectBindings: plannerEntityBindingListSchema.optional(),
  referenceAssetIds: plannerAssetIdListSchema.optional(),
  generatedAssetIds: plannerAssetIdListSchema.optional(),
});

const plannerActSchema = z.object({
  title: z.string().trim().min(1).max(120),
  time: z.string().trim().max(120).default(''),
  location: z.string().trim().max(120).default(''),
  shots: z.array(plannerShotSchema).min(1).max(12),
});

const plannerAssetSchema = z.object({
  entityKey: z.string().trim().min(1).max(191).optional(),
  entityType: plannerEntityTypeSchema.optional(),
  semanticFingerprint: z.string().trim().min(1).max(500).optional(),
  title: z.string().trim().min(1).max(120),
  prompt: z.string().trim().min(1).max(2000),
  referenceAssetIds: plannerAssetIdListSchema.optional(),
  generatedAssetIds: plannerAssetIdListSchema.optional(),
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

function isGenericSceneTitle(title: string) {
  const normalized = title.trim();
  return /^核心场景$/u.test(normalized)
    || /^过渡场景$/u.test(normalized)
    || /^场景(?:\d+|[一二三四五六七八九十]+)$/u.test(normalized);
}

function isGenericActTitle(title: string) {
  const normalized = title.trim();
  return /^第(?:\d+|[一二三四五六七八九十]+)幕$/u.test(normalized);
}

function isGenericShotTitle(title: string) {
  const normalized = title.trim();
  return /^分镜\d+(?:-\d+)?$/u.test(normalized)
    || /^镜头\d+(?:-\d+)?$/u.test(normalized)
    || /^\d+(?:-\d+)?$/u.test(normalized);
}

function readSemanticTitleSeed(...values: Array<string | null | undefined>) {
  for (const value of values) {
    if (!value) {
      continue;
    }

    const normalized = value
      .trim()
      .replace(/（[^）]*）/gu, '')
      .replace(/\([^)]*\)/g, '')
      .replace(/^第(?:\d+|[一二三四五六七八九十]+)幕[:：-]*/u, '')
      .split(/[：:，,。！？!?；;\n]/u)[0]
      ?.trim();

    if (!normalized || normalized.length < 2) {
      continue;
    }

    if (/^(无对白|旁白|动作和氛围推进)/u.test(normalized)) {
      continue;
    }

    if (/^(请基于当前|围绕“)/u.test(normalized)) {
      continue;
    }

    return clipText(normalized, 18);
  }

  return null;
}

function countKeywordMatches(text: string, keywords: string[]) {
  return keywords.reduce((count, keyword) => count + (text.includes(keyword) ? 1 : 0), 0);
}

const plannerSceneKeywords = [
  '场景', '工位', '办公室', '档案室', '仓库', '工厂', '地下室', '街角', '街头', '走廊', '客厅', '房间', '写字楼',
  '大厅', '楼道', '楼顶', '天台', '报社', '学校', '教室', '医院', '仓间', '巷', '车站', '地铁', '公园', '屋',
  '室内', '室外', '门口', '停车场', '酒吧', '居民楼', '地下', '废弃', '化工厂', 'warehouse', 'office', 'room',
  'hall', 'factory', 'street', 'corridor', 'station',
];

const plannerSubjectKeywords = [
  '记者', '秘书', '警察', '学生', '老师', '母亲', '父亲', '老板', '医生', '主角', '配角', '角色', '侦探',
  '男人', '女人', '少年', '少女', '老人', '小孩', '匿名寄件人', '寄件人', '穿', '身着', '眼神', '手持',
  '肖像', 'person', 'character', 'woman', 'man', 'girl', 'boy',
];

const plannerSceneTitlePatterns = [
  /(场景|办公室|档案室|仓库|工厂|地下室|街角|街头|走廊|客厅|房间|写字楼|大厅|楼道|楼顶|天台|报社|学校|教室|医院|车站|地铁|公园|停车场|酒吧|居民楼|化工厂)$/u,
  /(室|厅|楼|层|库|厂|街|巷|站|园|校|院|屋|店|吧|桥|道|口)$/u,
];

const plannerSubjectTitlePatterns = [
  /(记者|秘书|警察|学生|老师|母亲|父亲|老板|医生|主角|配角|角色|侦探|寄件人|男人|女人|少年|少女|老人|小孩)$/u,
  /^[\p{Script=Han}A-Za-z][\p{Script=Han}A-Za-z0-9·_-]{1,11}$/u,
];

function matchesAnyPattern(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

function scoreSceneAsset(title: string, prompt: string) {
  const normalizedTitle = title.trim().toLowerCase();
  const normalizedPrompt = prompt.trim().toLowerCase();
  return countKeywordMatches(normalizedTitle, plannerSceneKeywords) * 2
    + countKeywordMatches(normalizedPrompt, plannerSceneKeywords)
    + (matchesAnyPattern(normalizedTitle, plannerSceneTitlePatterns) ? 3 : 0);
}

function scoreSubjectAsset(title: string, prompt: string) {
  const normalizedTitle = title.trim().toLowerCase();
  const normalizedPrompt = prompt.trim().toLowerCase();
  return countKeywordMatches(normalizedTitle, plannerSubjectKeywords) * 2
    + countKeywordMatches(normalizedPrompt, plannerSubjectKeywords)
    + (matchesAnyPattern(normalizedTitle, plannerSubjectTitlePatterns) ? 1 : 0);
}

function looksLikeSceneAsset(title: string, prompt: string) {
  const sceneScore = scoreSceneAsset(title, prompt);
  const subjectScore = scoreSubjectAsset(title, prompt);
  return sceneScore >= 3 && sceneScore > subjectScore;
}

function looksLikeSubjectAsset(title: string, prompt: string) {
  const subjectScore = scoreSubjectAsset(title, prompt);
  const sceneScore = scoreSceneAsset(title, prompt);
  return subjectScore >= 2 && subjectScore > sceneScore;
}

function readPlannerEntityType(value: string | undefined | null) {
  return value === 'subject' || value === 'scene' ? value : null;
}

function resolvePlannerAssetEntityType(args: {
  declaredType?: string | null;
  title: string;
  prompt: string;
  fallbackType: PlannerEntityType;
}): PlannerEntityType {
  const declaredType = readPlannerEntityType(args.declaredType);
  const sceneLike = looksLikeSceneAsset(args.title, args.prompt);
  const subjectLike = looksLikeSubjectAsset(args.title, args.prompt);

  if (declaredType === 'subject') {
    return sceneLike && !subjectLike ? 'scene' : 'subject';
  }

  if (declaredType === 'scene') {
    return subjectLike && !sceneLike ? 'subject' : 'scene';
  }

  if (sceneLike && !subjectLike) {
    return 'scene';
  }

  if (subjectLike && !sceneLike) {
    return 'subject';
  }

  return args.fallbackType;
}

function isGenericSubjectBullet(text: string) {
  const normalized = text.trim();
  return /^(主角|配角|主体|人物|角色)(?:[:：].*)?$/u.test(normalized)
    || /^(主角|配角|主体)(承担|负责)/u.test(normalized);
}

function dedupePlannerAssets<T extends { title: string; prompt: string }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.title}::${item.prompt}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function sanitizePlannerStructuredDoc(doc: PlannerStructuredDoc): PlannerStructuredDoc {
  const sanitizedSubjects = doc.subjects.map((subject) => ({
    ...subject,
    entityType: resolvePlannerAssetEntityType({
      declaredType: subject.entityType,
      title: subject.title,
      prompt: subject.prompt,
      fallbackType: 'subject',
    }),
    title: sanitizePlannerDisplayText(subject.title),
    prompt: sanitizePlannerDisplayText(subject.prompt),
    semanticFingerprint: subject.semanticFingerprint ?? buildPlannerEntityFingerprint({
      title: subject.title,
      prompt: subject.prompt,
    }),
  }));
  const sanitizedScenes = doc.scenes.map((scene, index) => {
    const title = sanitizePlannerDisplayText(scene.title);
    const prompt = sanitizePlannerDisplayText(scene.prompt);
    const nextTitle = isGenericSceneTitle(title)
      ? readSemanticTitleSeed(prompt, doc.sceneBullets[index] ?? null) ?? title
      : title;

    return {
      ...scene,
      entityType: resolvePlannerAssetEntityType({
        declaredType: scene.entityType,
        title,
        prompt,
        fallbackType: 'scene',
      }),
      title: nextTitle,
      prompt,
      semanticFingerprint: scene.semanticFingerprint ?? buildPlannerEntityFingerprint({
        title: nextTitle,
        prompt,
      }),
    };
  });

  const subjectAssets = sanitizedSubjects.filter((subject) => subject.entityType === 'subject');
  const sceneAssetsFromSubjects = sanitizedSubjects.filter((subject) => subject.entityType === 'scene');
  const sceneAssets = sanitizedScenes.filter((scene) => scene.entityType === 'scene');
  const subjectAssetsFromScenes = sanitizedScenes.filter((scene) => scene.entityType === 'subject');

  const normalizedSubjects = dedupePlannerAssets([
    ...subjectAssets,
    ...subjectAssetsFromScenes,
  ]).slice(0, 8);
  const normalizedScenes = dedupePlannerAssets([
    ...sceneAssets,
    ...sceneAssetsFromSubjects,
  ]).slice(0, 8);

  const finalSubjects = normalizedSubjects.length > 0 ? normalizedSubjects : sanitizedSubjects;
  const finalScenes = normalizedScenes.length > 0 ? normalizedScenes : sanitizedScenes;

  const normalizedActs = doc.acts.map((act, actIndex) => {
    const normalizedShots = act.shots.map((shot, shotIndex) => {
      const title = sanitizePlannerDisplayText(shot.title);
      const visual = sanitizePlannerDisplayText(shot.visual);
      const composition = sanitizePlannerDisplayText(shot.composition);
      const motion = sanitizePlannerDisplayText(shot.motion);
      const voice = sanitizePlannerDisplayText(shot.voice);
      const line = sanitizePlannerDisplayText(shot.line);
      const semanticSeed = readSemanticTitleSeed(line, visual, voice);
      const nextTitle = isGenericShotTitle(title)
        ? clipText(`分镜${actIndex + 1}-${shotIndex + 1}${semanticSeed ? `-${semanticSeed}` : ''}`, 120)
        : title;

      return {
        ...shot,
        title: nextTitle,
        visual,
        composition,
        motion,
        voice,
        line,
      };
    });

    const title = sanitizePlannerDisplayText(act.title);
    const time = sanitizePlannerDisplayText(act.time);
    const location = sanitizePlannerDisplayText(act.location);
    const semanticSeed = readSemanticTitleSeed(
      normalizedShots[0]?.line,
      normalizedShots[0]?.visual,
      location,
      finalScenes[actIndex]?.title,
    );
    const nextTitle = isGenericActTitle(title)
      ? clipText(`第${actIndex + 1}幕${semanticSeed ? `：${semanticSeed}` : ''}`, 120)
      : title;

    return {
      ...act,
      title: nextTitle,
      time,
      location,
      shots: normalizedShots,
    };
  });

  return {
    ...doc,
    summaryBullets: doc.summaryBullets.map(sanitizePlannerDisplayText),
    highlights: doc.highlights.map((item) => ({
      ...item,
      title: sanitizePlannerDisplayText(item.title),
      description: sanitizePlannerDisplayText(item.description),
    })),
    styleBullets: doc.styleBullets.map(sanitizePlannerDisplayText),
    subjectBullets: doc.subjectBullets.map((bullet, index) => {
      const normalized = sanitizePlannerDisplayText(bullet);
      if (isGenericSubjectBullet(normalized) && finalSubjects.length > 0) {
        return finalSubjects[index] ? `${finalSubjects[index].title}：${finalSubjects[index].prompt}` : normalized;
      }
      return normalized;
    }),
    subjects: finalSubjects,
    sceneBullets: doc.sceneBullets.map((bullet, index) => {
      const normalized = sanitizePlannerDisplayText(bullet);
      return isGenericSceneTitle(normalized) && finalScenes[index]?.title
        ? finalScenes[index].title
        : normalized;
    }),
    scenes: finalScenes,
    scriptSummary: doc.scriptSummary.map(sanitizePlannerDisplayText),
    acts: normalizedActs,
  };
}

export function buildPlannerStructuredDocSchemaExample(args: {
  projectTitle: string;
  episodeTitle: string;
  targetVideoModelFamilySlug?: string | null;
}) {
  return {
    projectTitle: args.projectTitle,
    episodeTitle: args.episodeTitle,
    episodeCount: 1,
    pointCost: 38,
    summaryBullets: ['一句或多句故事梗概'],
    highlights: [{ title: '亮点标题', description: '亮点说明' }],
    styleBullets: ['美术风格描述'],
    subjectBullets: ['主体描述'],
    subjects: [{ entityType: 'subject', title: '主体名称', prompt: '主体生图提示词' }],
    sceneBullets: ['场景描述'],
    scenes: [{ entityType: 'scene', title: '场景名称', prompt: '场景生图提示词' }],
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
            ...(args.targetVideoModelFamilySlug ? { targetModelFamilySlug: args.targetVideoModelFamilySlug } : {}),
          },
        ],
      },
    ],
  } satisfies PlannerStructuredDoc;
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

function clipText(text: string, max: number) {
  const trimmed = text.trim();
  if (trimmed.length <= max) {
    return trimmed;
  }

  return `${trimmed.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

export function buildPlannerGenerationPrompt(args: {
  userPrompt: string;
  projectTitle: string;
  episodeTitle: string;
  targetVideoModelFamilySlug?: string | null;
}) {
  return [
    '你是短片策划助手。',
    '请根据用户需求生成严格的 JSON，不要输出解释，不要输出 markdown，不要输出代码块。',
    '字段必须完整，必须使用中文。',
    'JSON schema:',
    JSON.stringify(buildPlannerStructuredDocSchemaExample({
      projectTitle: args.projectTitle,
      episodeTitle: args.episodeTitle,
      targetVideoModelFamilySlug: args.targetVideoModelFamilySlug ?? null,
    })),
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
  const summarizedRawText = args.rawText ? sanitizePlannerDisplayText(args.rawText) : '';
  const fallbackSummary = clipText(summarizedRawText || `围绕“${args.userPrompt}”生成单集短片策划。`, 2000);
  const fallbackPrompt = clipText(`${args.userPrompt}，主体角色设定清晰，形象统一。`, 2000);
  const fallbackSecondaryPrompt = clipText(`${args.userPrompt}，补充关键配角和辅助元素。`, 2000);
  const fallbackScenePrompt = clipText(`${args.userPrompt}，电影感场景设计，氛围明确。`, 2000);
  const fallbackTransitionScenePrompt = clipText(`${args.userPrompt}，用于镜头衔接和节奏过渡。`, 2000);
  const fallbackVisual = clipText(args.userPrompt, 2000);
  const fallbackLine = clipText(summarizedRawText || `围绕“${args.userPrompt}”展开开场叙事。`, 1000);

  return sanitizePlannerStructuredDoc(plannerStructuredDocSchema.parse({
    projectTitle: args.projectTitle,
    episodeTitle: args.episodeTitle,
    episodeCount: 1,
    pointCost: 38,
    summaryBullets: [fallbackSummary],
    highlights: [
      { title: '亮点1', description: '强调人物、场景与情绪的递进关系。' },
      { title: '亮点2', description: '通过镜头变化建立节奏与反差。' },
    ],
    styleBullets: ['整体保持角色一致性、镜头清晰、氛围统一。'],
    subjectBullets: ['主角承担情绪推进，配角负责冲突与信息补充。'],
    subjects: [
      { entityType: 'subject', title: '主角', prompt: fallbackPrompt },
      { entityType: 'subject', title: '配角', prompt: fallbackSecondaryPrompt },
    ],
    sceneBullets: ['场景先建立空间，再推进动作和情绪变化。'],
    scenes: [
      { entityType: 'scene', title: '核心场景', prompt: fallbackScenePrompt },
      { entityType: 'scene', title: '过渡场景', prompt: fallbackTransitionScenePrompt },
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
            visual: fallbackVisual,
            composition: '中景，主体明确，空间关系清晰。',
            motion: '缓慢推进，建立氛围。',
            voice: '旁白',
            line: fallbackLine,
          },
        ],
      },
    ],
  }));
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
    return sanitizePlannerStructuredDoc(plannerStructuredDocSchema.parse(parsed));
  } catch {
    return buildFallbackPlannerStructuredDoc(args);
  }
}
