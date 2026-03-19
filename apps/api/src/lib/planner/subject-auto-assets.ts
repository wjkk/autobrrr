import { Prisma } from '@prisma/client';

import { prisma } from '../prisma.js';
import { syncPlannerRefinementProjection } from './refinement/projection.js';
import { generatePlannerSubjectAutoImageForUser } from './subject-auto-image.js';

const AUTO_SUBJECT_IMAGE_WIDTH = 1152;
const AUTO_SUBJECT_IMAGE_HEIGHT = 1536;

function readAssetIds(value: Prisma.JsonValue | null | undefined) {
  return Array.isArray(value)
    ? value.filter((assetId): assetId is string => typeof assetId === 'string' && assetId.trim().length > 0)
    : [];
}

function inferPlannerSubjectType(text: string): 'human' | 'animal' | 'creature' | 'object' {
  const normalized = text.toLowerCase();

  if (['猫', '狗', '狐狸', '狼', '熊', '兔', '鸟', '鱼', '龙猫', '马', '虎', '狮', '熊猫', '鹿', '牛', '羊', '鹤', '鹰', '孔雀'].some((keyword) => normalized.includes(keyword))) {
    return 'animal';
  }

  if (['精灵', '恶魔', '天使', '怪兽', '魔王', '魔女', '巫师', '巫女', '兽人', '龙', '妖', '仙', '赛博生物'].some((keyword) => normalized.includes(keyword))) {
    return 'creature';
  }

  if (['机器人', '玩偶', '机甲', '汽车', '手机', '相机', '书本', '杯子', '乐器', '飞船', '头盔'].some((keyword) => normalized.includes(keyword))) {
    return 'object';
  }

  return 'human';
}

function buildAssetFileName(subjectId: string) {
  return `planner-subject-auto-${subjectId}.png`;
}

export interface PlannerAutoSubjectImageSummaryItem {
  subjectId: string;
  name: string;
  status: 'created' | 'skipped' | 'failed';
  reason?: string;
  assetId?: string;
  imageUrl?: string;
}

export interface PlannerAutoSubjectImageSummary {
  refinementVersionId: string;
  attempted: number;
  created: number;
  skipped: number;
  failed: number;
  items: PlannerAutoSubjectImageSummaryItem[];
}

async function autoGeneratePlannerSubjectAssetsForRefinementWithDeps(args: {
  userId: string;
  projectId: string;
  episodeId: string;
  refinementVersionId: string;
}, deps: {
  prisma: typeof prisma;
  generatePlannerSubjectAutoImageForUser: typeof generatePlannerSubjectAutoImageForUser;
  syncPlannerRefinementProjection: typeof syncPlannerRefinementProjection;
}) {
  const creationConfig = await deps.prisma.projectCreationConfig.findUnique({
    where: { projectId: args.projectId },
    select: {
      imageModelEndpoint: {
        select: {
          slug: true,
        },
      },
    },
  });

  const subjects = await deps.prisma.plannerSubject.findMany({
    where: {
      refinementVersionId: args.refinementVersionId,
      editable: true,
    },
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      name: true,
      prompt: true,
      generatedAssetIdsJson: true,
    },
  });

  if (!subjects.length) {
    return {
      refinementVersionId: args.refinementVersionId,
      attempted: 0,
      created: 0,
      skipped: 0,
      failed: 0,
      items: [],
    } satisfies PlannerAutoSubjectImageSummary;
  }

  const items: PlannerAutoSubjectImageSummaryItem[] = [];
  const generatedResults: Array<{
    subjectId: string;
    name: string;
    imageUrl: string;
    prompt: string;
    model: {
      family: string;
      endpoint: string;
      provider: string;
    };
  }> = [];

  for (const subject of subjects) {
    const existingGeneratedIds = readAssetIds(subject.generatedAssetIdsJson);
    if (existingGeneratedIds.length > 0) {
      items.push({
        subjectId: subject.id,
        name: subject.name,
        status: 'skipped',
        reason: '已有主体草图',
      });
      continue;
    }

    try {
      const description = subject.prompt.trim() || subject.name.trim();
      const result = await deps.generatePlannerSubjectAutoImageForUser({
        userId: args.userId,
        input: {
          name: subject.name,
          subjectType: inferPlannerSubjectType(`${subject.name} ${description}`),
          description,
          modelEndpoint: creationConfig?.imageModelEndpoint?.slug ?? undefined,
        },
      });

      generatedResults.push({
        subjectId: subject.id,
        name: subject.name,
        imageUrl: result.imageUrl,
        prompt: result.prompt,
        model: result.model,
      });
    } catch (error) {
      items.push({
        subjectId: subject.id,
        name: subject.name,
        status: 'failed',
        reason: error instanceof Error ? error.message : '自动生成主体图失败。',
      });
    }
  }

  if (generatedResults.length > 0) {
    const createdItems = await deps.prisma.$transaction(async (tx) => {
      const nextItems: PlannerAutoSubjectImageSummaryItem[] = [];

      for (const generated of generatedResults) {
        const subject = await tx.plannerSubject.findUnique({
          where: { id: generated.subjectId },
          select: {
            id: true,
            name: true,
            generatedAssetIdsJson: true,
          },
        });
        if (!subject) {
          nextItems.push({
            subjectId: generated.subjectId,
            name: generated.name,
            status: 'failed',
            reason: '主体不存在，无法回写自动生成结果。',
          });
          continue;
        }

        const asset = await tx.asset.create({
          data: {
            ownerUserId: args.userId,
            projectId: args.projectId,
            episodeId: args.episodeId,
            mediaKind: 'IMAGE',
            sourceKind: 'GENERATED',
            fileName: buildAssetFileName(subject.id),
            mimeType: 'image/png',
            width: AUTO_SUBJECT_IMAGE_WIDTH,
            height: AUTO_SUBJECT_IMAGE_HEIGHT,
            sourceUrl: generated.imageUrl,
            metadataJson: {
              generationSource: 'planner_subject_auto',
              plannerResourceType: 'planner_subject',
              plannerResourceId: subject.id,
              refinementVersionId: args.refinementVersionId,
              prompt: generated.prompt,
              model: generated.model,
              generatedAt: new Date().toISOString(),
            } satisfies Prisma.InputJsonValue,
          },
        });

        const nextGeneratedIds = Array.from(new Set([asset.id, ...readAssetIds(subject.generatedAssetIdsJson)])).slice(0, 16);
        await tx.plannerSubject.update({
          where: { id: subject.id },
          data: {
            generatedAssetIdsJson: nextGeneratedIds as Prisma.InputJsonValue,
          },
        });

        nextItems.push({
          subjectId: subject.id,
          name: subject.name,
          status: 'created',
          assetId: asset.id,
          imageUrl: asset.sourceUrl ?? generated.imageUrl,
        });
      }

      await deps.syncPlannerRefinementProjection({
        db: tx,
        refinementVersionId: args.refinementVersionId,
      });

      return nextItems;
    });

    items.push(...createdItems);
  }

  const created = items.filter((item) => item.status === 'created').length;
  const skipped = items.filter((item) => item.status === 'skipped').length;
  const failed = items.filter((item) => item.status === 'failed').length;

  return {
    refinementVersionId: args.refinementVersionId,
    attempted: subjects.length - skipped,
    created,
    skipped,
    failed,
    items,
  } satisfies PlannerAutoSubjectImageSummary;
}

export async function autoGeneratePlannerSubjectAssetsForRefinement(args: {
  userId: string;
  projectId: string;
  episodeId: string;
  refinementVersionId: string;
}) {
  return autoGeneratePlannerSubjectAssetsForRefinementWithDeps(args, {
    prisma,
    generatePlannerSubjectAutoImageForUser,
    syncPlannerRefinementProjection,
  });
}

export const __testables = {
  readAssetIds,
  inferPlannerSubjectType,
  buildAssetFileName,
  autoGeneratePlannerSubjectAssetsForRefinementWithDeps,
};
