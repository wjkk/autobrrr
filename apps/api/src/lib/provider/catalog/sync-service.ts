import { Prisma } from '@prisma/client';
import type { ModelKind } from '@prisma/client';

import { prisma } from '../../prisma.js';

export type SyncCatalogModelKind = 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO';

export interface SyncCatalogDiscoveredModel {
  id: string;
  modelKind: SyncCatalogModelKind;
  label: string;
}

export interface SyncCatalogFamilyDefinition {
  slug: string;
  name: string;
  capabilityJson: Record<string, unknown>;
}

export interface SyncCatalogResult {
  totalCount: number;
  byKind: Record<SyncCatalogModelKind, number>;
}

async function ensureFamily(modelKind: SyncCatalogModelKind, definition: SyncCatalogFamilyDefinition) {
  return prisma.modelFamily.upsert({
    where: { slug: definition.slug },
    update: {
      name: definition.name,
      modelKind: modelKind as ModelKind,
      capabilityJson: definition.capabilityJson as Prisma.InputJsonValue,
    },
    create: {
      slug: definition.slug,
      name: definition.name,
      modelKind: modelKind as ModelKind,
      capabilityJson: definition.capabilityJson as Prisma.InputJsonValue,
    },
  });
}

export async function syncDiscoveredModelCatalog(args: {
  providerId: string;
  discoveredModels: SyncCatalogDiscoveredModel[];
  familyDefinitions: Partial<Record<SyncCatalogModelKind, SyncCatalogFamilyDefinition>>;
  defaultModels: Partial<Record<SyncCatalogModelKind, string>>;
  defaultParamsByKind: Partial<Record<SyncCatalogModelKind, Record<string, unknown>>>;
  endpointSlugPrefix: string;
}) {
  const activeKinds = Object.keys(args.familyDefinitions) as SyncCatalogModelKind[];
  const familyEntries = await Promise.all(
    activeKinds.map(async (modelKind) => [modelKind, await ensureFamily(modelKind, args.familyDefinitions[modelKind]!)] as const),
  );
  const familyByKind = new Map(familyEntries);

  const existingEndpoints = await prisma.modelEndpoint.findMany({
    where: {
      providerId: args.providerId,
    },
    select: {
      id: true,
      slug: true,
      remoteModelKey: true,
      familyId: true,
    },
  });

  const existingByRemoteModel = new Map(existingEndpoints.map((endpoint) => [endpoint.remoteModelKey, endpoint]));
  const usedSlugs = new Set(existingEndpoints.map((endpoint) => endpoint.slug));
  const discoveredRemoteModelKeys = new Set(args.discoveredModels.map((model) => model.id));
  const counts: Record<SyncCatalogModelKind, number> = {
    TEXT: 0,
    IMAGE: 0,
    VIDEO: 0,
    AUDIO: 0,
  };

  await Promise.all(
    args.discoveredModels.map(async (model, index) => {
      counts[model.modelKind] += 1;

      const existing = existingByRemoteModel.get(model.id);
      const baseSlug = `${args.endpointSlugPrefix}-${slugifyCatalogModelId(model.id)}`;
      let slug = existing?.slug ?? baseSlug;
      let suffix = 2;
      while (!existing && usedSlugs.has(slug)) {
        slug = `${baseSlug}-${suffix}`;
        suffix += 1;
      }
      usedSlugs.add(slug);

      await prisma.modelEndpoint.upsert({
        where: { slug },
        update: {
          familyId: familyByKind.get(model.modelKind)!.id,
          providerId: args.providerId,
          remoteModelKey: model.id,
          label: model.label,
          status: 'ACTIVE',
          priority: buildCatalogPriority(model.id, index, args.defaultModels[model.modelKind]),
          isDefault: model.id === args.defaultModels[model.modelKind],
          defaultParamsJson: (args.defaultParamsByKind[model.modelKind] ?? {}) as Prisma.InputJsonValue,
        },
        create: {
          slug,
          familyId: familyByKind.get(model.modelKind)!.id,
          providerId: args.providerId,
          remoteModelKey: model.id,
          label: model.label,
          status: 'ACTIVE',
          priority: buildCatalogPriority(model.id, index, args.defaultModels[model.modelKind]),
          isDefault: model.id === args.defaultModels[model.modelKind],
          defaultParamsJson: (args.defaultParamsByKind[model.modelKind] ?? {}) as Prisma.InputJsonValue,
        },
      });
    }),
  );

  await prisma.modelEndpoint.updateMany({
    where: {
      providerId: args.providerId,
      familyId: {
        in: activeKinds.map((modelKind) => familyByKind.get(modelKind)!.id),
      },
      remoteModelKey: {
        notIn: [...discoveredRemoteModelKeys],
      },
    },
    data: {
      status: 'DISABLED',
    },
  });

  return {
    totalCount: args.discoveredModels.length,
    byKind: counts,
  } satisfies SyncCatalogResult;
}

function buildCatalogPriority(modelId: string, index: number, defaultModelId?: string) {
  if (defaultModelId && modelId === defaultModelId) {
    return 5;
  }

  return 100 + index;
}

export function slugifyCatalogModelId(modelId: string) {
  return modelId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}
