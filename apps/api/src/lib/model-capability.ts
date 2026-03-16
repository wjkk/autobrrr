import type { ModelFamily } from '@prisma/client';
import { z } from 'zod';

import { prisma } from './prisma.js';

const videoModelCapabilitySchema = z.object({
  supportsMultiShot: z.boolean().default(false),
  maxShotsPerGeneration: z.number().int().positive().max(12).default(1),
  timestampMeaning: z.enum(['narrative-hint', 'hard-constraint', 'ignored']).default('ignored'),
  audioDescStyle: z.enum(['inline', 'none']).default('none'),
  referenceImageSupport: z.enum(['none', 'style', 'character', 'full']).default('none'),
  maxReferenceImages: z.number().int().nonnegative().max(16).default(0),
  maxReferenceVideos: z.number().int().nonnegative().max(8).default(0),
  maxReferenceAudios: z.number().int().nonnegative().max(8).default(0),
  cameraVocab: z.enum(['chinese', 'english-cinematic', 'both']).default('chinese'),
  maxDurationSeconds: z.number().int().positive().max(120).nullable().default(null),
  maxResolution: z.string().trim().min(1).max(32).nullable().default(null),
  promptStyle: z.enum(['narrative', 'single-shot']).default('single-shot'),
  qualityNote: z.string().trim().min(1).max(500).optional(),
  knownIssues: z.array(z.string().trim().min(1).max(200)).max(8).default([]),
  integrationStatus: z.enum(['active', 'planned']).optional(),
});

export type VideoModelCapability = z.infer<typeof videoModelCapabilitySchema>;

export interface VideoModelCapabilityRecord {
  familyId: string;
  familySlug: string;
  familyName: string;
  capability: VideoModelCapability;
}

function assertVideoFamily(family: Pick<ModelFamily, 'slug' | 'name' | 'modelKind' | 'capabilityJson'>) {
  if (family.modelKind !== 'VIDEO') {
    throw new Error(`Model family "${family.slug}" is not a video family.`);
  }
}

export function parseVideoModelCapability(input: unknown, familySlug = 'unknown'): VideoModelCapability {
  const parsed = videoModelCapabilitySchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(`Invalid video model capability for family "${familySlug}".`);
  }

  return parsed.data;
}

export function readVideoModelCapabilityFromFamily(
  family: Pick<ModelFamily, 'id' | 'slug' | 'name' | 'modelKind' | 'capabilityJson'>,
): VideoModelCapabilityRecord {
  assertVideoFamily(family);

  return {
    familyId: family.id,
    familySlug: family.slug,
    familyName: family.name,
    capability: parseVideoModelCapability(family.capabilityJson, family.slug),
  };
}

export async function getVideoModelCapability(familySlug: string): Promise<VideoModelCapabilityRecord> {
  const family = await prisma.modelFamily.findUnique({
    where: { slug: familySlug },
    select: {
      id: true,
      slug: true,
      name: true,
      modelKind: true,
      capabilityJson: true,
    },
  });

  if (!family) {
    throw new Error(`Video model family "${familySlug}" not found.`);
  }

  return readVideoModelCapabilityFromFamily(family);
}

function describePromptStyle(capability: VideoModelCapability) {
  return capability.promptStyle === 'narrative' ? '输出连贯叙事段落' : '按单镜头分别输出';
}

function describeAudio(capability: VideoModelCapability) {
  return capability.audioDescStyle === 'inline' ? '将音效描述自然融入正文' : '忽略音效描述';
}

function describeCameraVocab(capability: VideoModelCapability) {
  switch (capability.cameraVocab) {
    case 'english-cinematic':
      return '运镜词优先使用英文电影术语';
    case 'both':
      return '运镜词中英文均可';
    default:
      return '运镜词优先使用中文镜头语言';
  }
}

function describeTimestampMeaning(capability: VideoModelCapability) {
  switch (capability.timestampMeaning) {
    case 'narrative-hint':
      return '时间码仅作为叙事节奏提示，不是硬切片';
    case 'hard-constraint':
      return '时间码需要按硬约束理解';
    default:
      return '忽略时间码表达，专注文字叙事';
  }
}

export function summarizeVideoModelCapabilityForPlanner(input: {
  familySlug: string;
  familyName?: string;
  capability: VideoModelCapability;
}) {
  const familyLabel = input.familyName ?? input.familySlug;
  const multiShotLine = input.capability.supportsMultiShot
    ? `支持单次多镜头叙事，最多可合并 ${input.capability.maxShotsPerGeneration} 个连续分镜`
    : '单次只适合生成单镜头内容，不要把多个分镜合并到同一条 prompt';

  const lines = [
    `目标视频模型：${familyLabel}（${input.familySlug}）`,
    multiShotLine,
    describePromptStyle(input.capability),
    describeAudio(input.capability),
    describeCameraVocab(input.capability),
    describeTimestampMeaning(input.capability),
  ];

  if (input.capability.maxDurationSeconds) {
    lines.push(`单次最长时长约 ${input.capability.maxDurationSeconds} 秒`);
  }

  if (input.capability.qualityNote) {
    lines.push(`质量提示：${input.capability.qualityNote}`);
  }

  return lines.join('；') + '。';
}
