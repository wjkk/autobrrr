import { Prisma } from '@prisma/client';

import { prisma } from './prisma.js';

type CatalogScope = 'all' | 'public' | 'personal';
type SubjectGenderTag = 'all' | 'unknown' | 'female' | 'male' | 'child';
type CatalogVisibility = 'public' | 'personal';
type CatalogSubjectType = 'human' | 'animal' | 'creature' | 'object';
type CatalogStoredVisibility = 'PUBLIC' | 'PERSONAL';
type CatalogStoredSubjectType = 'HUMAN' | 'ANIMAL' | 'CREATURE' | 'OBJECT';
type CatalogStoredGenderTag = 'UNKNOWN' | 'FEMALE' | 'MALE' | 'CHILD';

export interface CatalogSubjectInput {
  slug: string;
  name: string;
  visibility: CatalogVisibility;
  subjectType: CatalogSubjectType;
  genderTag: Exclude<SubjectGenderTag, 'all'>;
  previewImageUrl: string;
  referenceImageUrl?: string;
  description?: string;
  promptTemplate?: string;
  negativePrompt?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  enabled: boolean;
  sortOrder: number;
}

export interface CatalogStyleInput {
  slug: string;
  name: string;
  visibility: CatalogVisibility;
  previewImageUrl: string;
  description?: string;
  promptTemplate?: string;
  negativePrompt?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  enabled: boolean;
  sortOrder: number;
}

function mapSubject(subject: {
  id: string;
  slug: string;
  name: string;
  visibility: string;
  subjectType: string;
  genderTag: string;
  previewImageUrl: string;
  referenceImageUrl: string | null;
  description: string | null;
  promptTemplate: string | null;
  negativePrompt: string | null;
  tagsJson: unknown;
  metadataJson: unknown;
  enabled: boolean;
  sortOrder: number;
  ownerUserId: string | null;
}) {
  return {
    id: subject.id,
    slug: subject.slug,
    name: subject.name,
    visibility: subject.visibility.toLowerCase(),
    subjectType: subject.subjectType.toLowerCase(),
    genderTag: subject.genderTag.toLowerCase(),
    imageUrl: subject.previewImageUrl,
    referenceImageUrl: subject.referenceImageUrl,
    description: subject.description,
    promptTemplate: subject.promptTemplate,
    negativePrompt: subject.negativePrompt,
    tags: subject.tagsJson,
    metadata: subject.metadataJson,
    enabled: subject.enabled,
    sortOrder: subject.sortOrder,
    ownerUserId: subject.ownerUserId,
  };
}

function mapStyle(style: {
  id: string;
  slug: string;
  name: string;
  visibility: string;
  previewImageUrl: string;
  description: string | null;
  promptTemplate: string | null;
  negativePrompt: string | null;
  tagsJson: unknown;
  metadataJson: unknown;
  enabled: boolean;
  sortOrder: number;
  ownerUserId: string | null;
}) {
  return {
    id: style.id,
    slug: style.slug,
    name: style.name,
    visibility: style.visibility.toLowerCase(),
    imageUrl: style.previewImageUrl,
    description: style.description,
    promptTemplate: style.promptTemplate,
    negativePrompt: style.negativePrompt,
    tags: style.tagsJson,
    metadata: style.metadataJson,
    enabled: style.enabled,
    sortOrder: style.sortOrder,
    ownerUserId: style.ownerUserId,
  };
}

function buildCatalogScopeWhere(scope: CatalogScope, userId: string) {
  if (scope === 'public') {
    return { visibility: 'PUBLIC' as const };
  }

  if (scope === 'personal') {
    return {
      visibility: 'PERSONAL' as const,
      ownerUserId: userId,
    };
  }

  return {
    OR: [
      { visibility: 'PUBLIC' as const },
      {
        visibility: 'PERSONAL' as const,
        ownerUserId: userId,
      },
    ],
  };
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function toStoredVisibility(value: CatalogVisibility): CatalogStoredVisibility {
  return value.toUpperCase() as CatalogStoredVisibility;
}

function toStoredSubjectType(value: CatalogSubjectType): CatalogStoredSubjectType {
  return value.toUpperCase() as CatalogStoredSubjectType;
}

function toStoredGenderTag(value: Exclude<SubjectGenderTag, 'all'>): CatalogStoredGenderTag {
  return value.toUpperCase() as CatalogStoredGenderTag;
}

export async function listCatalogSubjects(args: {
  userId: string;
  scope: CatalogScope;
  genderTag: SubjectGenderTag;
}) {
  const subjects = await prisma.subjectProfile.findMany({
    where: {
      ...buildCatalogScopeWhere(args.scope, args.userId),
      enabled: true,
      ...(args.genderTag !== 'all' ? { genderTag: toStoredGenderTag(args.genderTag) } : {}),
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });

  return subjects.map(mapSubject);
}

export async function createCatalogSubject(userId: string, input: CatalogSubjectInput) {
  const subject = await prisma.subjectProfile.create({
    data: {
      slug: input.slug,
      name: input.name,
      visibility: toStoredVisibility(input.visibility),
      ...(input.visibility === 'personal'
        ? {
            ownerUser: {
              connect: { id: userId },
            },
          }
        : {}),
      subjectType: toStoredSubjectType(input.subjectType),
      genderTag: toStoredGenderTag(input.genderTag),
      previewImageUrl: input.previewImageUrl,
      referenceImageUrl: input.referenceImageUrl ?? null,
      description: input.description ?? null,
      promptTemplate: input.promptTemplate ?? null,
      negativePrompt: input.negativePrompt ?? null,
      ...(input.tags ? { tagsJson: toJsonValue(input.tags) } : {}),
      ...(input.metadata ? { metadataJson: toJsonValue(input.metadata) } : {}),
      enabled: input.enabled,
      sortOrder: input.sortOrder,
    },
  });

  return mapSubject(subject);
}

export async function updateCatalogSubject(args: {
  userId: string;
  itemId: string;
  patch: Partial<CatalogSubjectInput>;
}) {
  const existing = await prisma.subjectProfile.findFirst({
    where: {
      id: args.itemId,
      OR: [{ visibility: 'PUBLIC' }, { ownerUserId: args.userId }],
    },
  });
  if (!existing) {
    return null;
  }

  const updated = await prisma.subjectProfile.update({
    where: { id: existing.id },
    data: {
      ...(args.patch.slug ? { slug: args.patch.slug } : {}),
      ...(args.patch.name ? { name: args.patch.name } : {}),
      ...(args.patch.visibility
        ? {
            visibility: toStoredVisibility(args.patch.visibility),
            ownerUser:
              args.patch.visibility === 'personal'
                ? { connect: { id: args.userId } }
                : { disconnect: true },
          }
        : {}),
      ...(args.patch.subjectType ? { subjectType: toStoredSubjectType(args.patch.subjectType) } : {}),
      ...(args.patch.genderTag ? { genderTag: toStoredGenderTag(args.patch.genderTag) } : {}),
      ...(args.patch.previewImageUrl ? { previewImageUrl: args.patch.previewImageUrl } : {}),
      ...(args.patch.referenceImageUrl !== undefined ? { referenceImageUrl: args.patch.referenceImageUrl ?? null } : {}),
      ...(args.patch.description !== undefined ? { description: args.patch.description ?? null } : {}),
      ...(args.patch.promptTemplate !== undefined ? { promptTemplate: args.patch.promptTemplate ?? null } : {}),
      ...(args.patch.negativePrompt !== undefined ? { negativePrompt: args.patch.negativePrompt ?? null } : {}),
      ...(args.patch.tags !== undefined ? { tagsJson: toJsonValue(args.patch.tags) } : {}),
      ...(args.patch.metadata !== undefined ? { metadataJson: toJsonValue(args.patch.metadata) } : {}),
      ...(args.patch.enabled !== undefined ? { enabled: args.patch.enabled } : {}),
      ...(args.patch.sortOrder !== undefined ? { sortOrder: args.patch.sortOrder } : {}),
    },
  });

  return mapSubject(updated);
}

export async function listCatalogStyles(args: {
  userId: string;
  scope: CatalogScope;
}) {
  const styles = await prisma.stylePreset.findMany({
    where: {
      ...buildCatalogScopeWhere(args.scope, args.userId),
      enabled: true,
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });

  return styles.map(mapStyle);
}

export async function createCatalogStyle(userId: string, input: CatalogStyleInput) {
  const style = await prisma.stylePreset.create({
    data: {
      slug: input.slug,
      name: input.name,
      visibility: toStoredVisibility(input.visibility),
      ...(input.visibility === 'personal'
        ? {
            ownerUser: {
              connect: { id: userId },
            },
          }
        : {}),
      previewImageUrl: input.previewImageUrl,
      description: input.description ?? null,
      promptTemplate: input.promptTemplate ?? null,
      negativePrompt: input.negativePrompt ?? null,
      ...(input.tags ? { tagsJson: toJsonValue(input.tags) } : {}),
      ...(input.metadata ? { metadataJson: toJsonValue(input.metadata) } : {}),
      enabled: input.enabled,
      sortOrder: input.sortOrder,
    },
  });

  return mapStyle(style);
}

export async function updateCatalogStyle(args: {
  userId: string;
  itemId: string;
  patch: Partial<CatalogStyleInput>;
}) {
  const existing = await prisma.stylePreset.findFirst({
    where: {
      id: args.itemId,
      OR: [{ visibility: 'PUBLIC' }, { ownerUserId: args.userId }],
    },
  });
  if (!existing) {
    return null;
  }

  const updated = await prisma.stylePreset.update({
    where: { id: existing.id },
    data: {
      ...(args.patch.slug ? { slug: args.patch.slug } : {}),
      ...(args.patch.name ? { name: args.patch.name } : {}),
      ...(args.patch.visibility
        ? {
            visibility: toStoredVisibility(args.patch.visibility),
            ownerUser:
              args.patch.visibility === 'personal'
                ? { connect: { id: args.userId } }
                : { disconnect: true },
          }
        : {}),
      ...(args.patch.previewImageUrl ? { previewImageUrl: args.patch.previewImageUrl } : {}),
      ...(args.patch.description !== undefined ? { description: args.patch.description ?? null } : {}),
      ...(args.patch.promptTemplate !== undefined ? { promptTemplate: args.patch.promptTemplate ?? null } : {}),
      ...(args.patch.negativePrompt !== undefined ? { negativePrompt: args.patch.negativePrompt ?? null } : {}),
      ...(args.patch.tags !== undefined ? { tagsJson: toJsonValue(args.patch.tags) } : {}),
      ...(args.patch.metadata !== undefined ? { metadataJson: toJsonValue(args.patch.metadata) } : {}),
      ...(args.patch.enabled !== undefined ? { enabled: args.patch.enabled } : {}),
      ...(args.patch.sortOrder !== undefined ? { sortOrder: args.patch.sortOrder } : {}),
    },
  });

  return mapStyle(updated);
}
