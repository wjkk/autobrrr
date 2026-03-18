import type { Asset } from '@prisma/client';

interface PlannerRecommendationAssetOption {
  id: string;
  sourceUrl: string | null;
  fileName: string;
  mediaKind: string;
  sourceKind: string;
  createdAt: string;
}

export interface PlannerEntityAssetRecommendation {
  id: string;
  title: string;
  prompt: string;
  rationale: string;
  referenceAssetIds: string[];
  referenceAssets: PlannerRecommendationAssetOption[];
}

interface PlannerRecommendationAsset extends PlannerRecommendationAssetOption {}

interface PlannerSubjectRecommendationEntity {
  name: string;
  role: string | null;
  appearance: string | null;
  personality: string | null;
  prompt: string | null;
}

interface PlannerSceneRecommendationEntity {
  name: string;
  time: string | null;
  locationType: string | null;
  description: string | null;
  prompt: string | null;
}

function uniqueText(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const value of values) {
    const next = typeof value === 'string' ? value.trim() : '';
    if (!next) {
      continue;
    }

    const dedupeKey = next.toLowerCase();
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);
    normalized.push(next);
  }

  return normalized;
}

function joinPromptLines(values: Array<string | null | undefined>) {
  return uniqueText(values).join('\n');
}

function mapRecommendationAsset(asset: Pick<Asset, 'id' | 'sourceUrl' | 'fileName' | 'mediaKind' | 'sourceKind' | 'createdAt'>): PlannerRecommendationAsset {
  return {
    id: asset.id,
    sourceUrl: asset.sourceUrl,
    fileName: asset.fileName,
    mediaKind: asset.mediaKind.toLowerCase(),
    sourceKind: asset.sourceKind.toLowerCase(),
    createdAt: asset.createdAt.toISOString(),
  };
}

export function buildPlannerRecommendationReferenceAssets(args: {
  linkedAssets?: Array<Pick<Asset, 'id' | 'sourceUrl' | 'fileName' | 'mediaKind' | 'sourceKind' | 'createdAt'>>;
  recentAssets?: Array<Pick<Asset, 'id' | 'sourceUrl' | 'fileName' | 'mediaKind' | 'sourceKind' | 'createdAt'>>;
  limit?: number;
}) {
  const limit = args.limit ?? 3;
  const seen = new Set<string>();
  const items: PlannerRecommendationAsset[] = [];

  for (const asset of [...(args.linkedAssets ?? []), ...(args.recentAssets ?? [])]) {
    if (!asset.id || seen.has(asset.id)) {
      continue;
    }
    seen.add(asset.id);
    items.push(mapRecommendationAsset(asset));
    if (items.length >= limit) {
      break;
    }
  }

  return items;
}

export function buildPlannerSubjectAssetRecommendations(args: {
  entity: PlannerSubjectRecommendationEntity;
  referenceAssets: PlannerRecommendationAsset[];
}): PlannerEntityAssetRecommendation[] {
  const basePrompt = joinPromptLines([
    args.entity.prompt,
    args.entity.appearance,
    args.entity.role ? `角色定位：${args.entity.role}` : null,
    args.entity.personality ? `气质特征：${args.entity.personality}` : null,
  ]) || args.entity.name;

  const referenceAssetIds = args.referenceAssets.map((asset) => asset.id);

  return [
    {
      id: 'subject-hero-sheet',
      title: '定妆主视觉',
      prompt: joinPromptLines([
        basePrompt,
        `单人角色设定图，突出 ${args.entity.name} 的核心识别度，完整呈现发型、服装、体态和材质细节`,
        args.entity.role ? `画面要强化其“${args.entity.role}”的叙事身份` : null,
      ]),
      rationale: '先固定角色外观主识别，适合作为后续主体参考图的基准版本。',
      referenceAssetIds,
      referenceAssets: args.referenceAssets,
    },
    {
      id: 'subject-emotion-closeup',
      title: '情绪近景',
      prompt: joinPromptLines([
        basePrompt,
        '半身近景，面部表情清晰，眼神和微表情是画面重心',
        args.entity.personality ? `情绪层面突出 ${args.entity.personality}` : '强调情绪张力和角色状态变化',
      ]),
      rationale: '补齐表情与气质视角，适合做人物情绪镜头或封面候选。',
      referenceAssetIds,
      referenceAssets: args.referenceAssets,
    },
    {
      id: 'subject-full-body-pose',
      title: '动作全身像',
      prompt: joinPromptLines([
        basePrompt,
        '全身动态姿态，动作明确，保留清晰剪影和肢体张力',
        args.entity.role ? `动作设计应贴合 ${args.entity.role} 的职业与行为习惯` : null,
      ]),
      rationale: '补全动作和体态信息，方便后续分镜和主体绑定时保持一致。',
      referenceAssetIds,
      referenceAssets: args.referenceAssets,
    },
  ];
}

export function buildPlannerSceneAssetRecommendations(args: {
  entity: PlannerSceneRecommendationEntity;
  referenceAssets: PlannerRecommendationAsset[];
}): PlannerEntityAssetRecommendation[] {
  const basePrompt = joinPromptLines([
    args.entity.prompt,
    args.entity.description,
    args.entity.time ? `时间氛围：${args.entity.time}` : null,
    args.entity.locationType ? `空间类型：${args.entity.locationType}` : null,
  ]) || args.entity.name;

  const referenceAssetIds = args.referenceAssets.map((asset) => asset.id);

  return [
    {
      id: 'scene-establishing',
      title: '建立镜头',
      prompt: joinPromptLines([
        basePrompt,
        `广角建立镜头，先完整交代 ${args.entity.name} 的空间结构、入口出口、前中后景层次和整体氛围`,
      ]),
      rationale: '优先固定空间结构，后续分镜切换时不容易丢失场景布局。',
      referenceAssetIds,
      referenceAssets: args.referenceAssets,
    },
    {
      id: 'scene-atmosphere-detail',
      title: '氛围细节',
      prompt: joinPromptLines([
        basePrompt,
        '聚焦灯光、材质、天气、陈设和环境细节，用局部视角强化氛围',
        args.entity.time ? `画面应明显体现 ${args.entity.time} 的时间感` : null,
      ]),
      rationale: '补足材质和环境层信息，适合做场景气氛参考或补细节素材。',
      referenceAssetIds,
      referenceAssets: args.referenceAssets,
    },
    {
      id: 'scene-blocking',
      title: '机位调度参考',
      prompt: joinPromptLines([
        basePrompt,
        '保留明确的机位关系、人物可活动区域和镜头调度路径，适合作为分镜 blocking 参考',
      ]),
      rationale: '让场景不仅好看，还能支撑后续镜头设计和人物调度。',
      referenceAssetIds,
      referenceAssets: args.referenceAssets,
    },
  ];
}

export const __testables = {
  joinPromptLines,
  buildPlannerRecommendationReferenceAssets,
};
