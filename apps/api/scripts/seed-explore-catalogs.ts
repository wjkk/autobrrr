import { readFile } from 'node:fs/promises';

import { prisma } from '../src/lib/prisma.js';

interface SeedSubjectItem {
  slug: string;
  name: string;
  visibility: 'PUBLIC' | 'PERSONAL';
  subjectType: 'HUMAN' | 'ANIMAL' | 'CREATURE' | 'OBJECT';
  genderTag: 'UNKNOWN' | 'FEMALE' | 'MALE' | 'CHILD';
  previewImageUrl: string;
  referenceImageUrl?: string;
  description?: string;
  promptTemplate?: string;
  negativePrompt?: string;
  sortOrder: number;
  metadata?: Record<string, unknown>;
}

interface SeedStyleItem {
  slug: string;
  name: string;
  visibility: 'PUBLIC' | 'PERSONAL';
  previewImageUrl: string;
  description?: string;
  promptTemplate?: string;
  negativePrompt?: string;
  sortOrder: number;
  metadata?: Record<string, unknown>;
}

async function readSeedFile<T>(relativePath: string) {
  const content = await readFile(new URL(relativePath, import.meta.url), 'utf8');
  return JSON.parse(content) as T;
}

async function main() {
  const [subjects, styles] = await Promise.all([
    readSeedFile<SeedSubjectItem[]>('./data/explore-subjects.json'),
    readSeedFile<SeedStyleItem[]>('./data/explore-styles.json'),
  ]);

  await prisma.subjectProfile.deleteMany({
    where: {
      visibility: 'PUBLIC',
      slug: {
        notIn: subjects.map((item) => item.slug),
      },
    },
  });

  await prisma.stylePreset.deleteMany({
    where: {
      visibility: 'PUBLIC',
      slug: {
        notIn: styles.map((item) => item.slug),
      },
    },
  });

  for (const subject of subjects) {
    await prisma.subjectProfile.upsert({
      where: { slug: subject.slug },
      update: {
        name: subject.name,
        visibility: subject.visibility,
        subjectType: subject.subjectType,
        genderTag: subject.genderTag,
        previewImageUrl: subject.previewImageUrl,
        referenceImageUrl: subject.referenceImageUrl ?? null,
        description: subject.description ?? null,
        promptTemplate: subject.promptTemplate ?? null,
        negativePrompt: subject.negativePrompt ?? null,
        sortOrder: subject.sortOrder,
        metadataJson: subject.metadata,
        enabled: true,
      },
      create: {
        slug: subject.slug,
        name: subject.name,
        visibility: subject.visibility,
        subjectType: subject.subjectType,
        genderTag: subject.genderTag,
        previewImageUrl: subject.previewImageUrl,
        referenceImageUrl: subject.referenceImageUrl ?? null,
        description: subject.description ?? null,
        promptTemplate: subject.promptTemplate ?? null,
        negativePrompt: subject.negativePrompt ?? null,
        sortOrder: subject.sortOrder,
        metadataJson: subject.metadata,
        enabled: true,
      },
    });
  }

  for (const style of styles) {
    await prisma.stylePreset.upsert({
      where: { slug: style.slug },
      update: {
        name: style.name,
        visibility: style.visibility,
        previewImageUrl: style.previewImageUrl,
        description: style.description ?? null,
        promptTemplate: style.promptTemplate ?? null,
        negativePrompt: style.negativePrompt ?? null,
        sortOrder: style.sortOrder,
        metadataJson: style.metadata,
        enabled: true,
      },
      create: {
        slug: style.slug,
        name: style.name,
        visibility: style.visibility,
        previewImageUrl: style.previewImageUrl,
        description: style.description ?? null,
        promptTemplate: style.promptTemplate ?? null,
        negativePrompt: style.negativePrompt ?? null,
        sortOrder: style.sortOrder,
        metadataJson: style.metadata,
        enabled: true,
      },
    });
  }

  console.log('[seed-explore-catalogs] ok');
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    console.error(`[seed-explore-catalogs] failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
