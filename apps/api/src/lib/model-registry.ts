import type { ModelEndpoint, ModelFamily, ModelProvider, Prisma } from '@prisma/client';

import { prisma } from './prisma.js';

export interface ResolvedModelSelection {
  family: ModelFamily;
  provider: ModelProvider;
  endpoint: ModelEndpoint;
}

export interface ResolveModelSelectionInput {
  modelKind: 'IMAGE' | 'VIDEO' | 'TEXT' | 'AUDIO' | 'LIPSYNC';
  familySlug?: string;
  endpointSlug?: string;
  strategy?: 'preferOfficial' | 'preferLowestCost' | 'preferFastest' | 'default';
}

function buildOrderBy(): Prisma.ModelEndpointOrderByWithRelationInput[] {
  return [{ isDefault: 'desc' }, { priority: 'asc' }, { createdAt: 'asc' }];
}

function rankEndpoint(
  endpoint: ModelEndpoint & { provider: ModelProvider },
  strategy: ResolveModelSelectionInput['strategy'],
) {
  if (strategy === 'preferOfficial') {
    return endpoint.provider.providerType === 'OFFICIAL' ? 0 : endpoint.provider.providerType === 'PROXY' ? 1 : 2;
  }

  return 0;
}

export async function resolveModelSelection(input: ResolveModelSelectionInput): Promise<ResolvedModelSelection | null> {
  if (input.endpointSlug) {
    const endpoint = await prisma.modelEndpoint.findFirst({
      where: {
        slug: input.endpointSlug,
        status: 'ACTIVE',
        family: input.familySlug
          ? {
              slug: input.familySlug,
              modelKind: input.modelKind,
            }
          : {
              modelKind: input.modelKind,
            },
        provider: {
          enabled: true,
        },
      },
      include: {
        family: true,
        provider: true,
      },
    });

    if (!endpoint) {
      return null;
    }

    return {
      family: endpoint.family,
      provider: endpoint.provider,
      endpoint,
    };
  }

  const endpoints = await prisma.modelEndpoint.findMany({
    where: {
      status: 'ACTIVE',
      family: input.familySlug
        ? {
            slug: input.familySlug,
            modelKind: input.modelKind,
          }
        : {
            modelKind: input.modelKind,
          },
      provider: {
        enabled: true,
      },
    },
    include: {
      family: true,
      provider: true,
    },
    orderBy: buildOrderBy(),
  });

  const [endpoint] = endpoints.sort((left, right) => {
    const strategyRank = rankEndpoint(left, input.strategy) - rankEndpoint(right, input.strategy);
    if (strategyRank !== 0) {
      return strategyRank;
    }

    if (left.isDefault !== right.isDefault) {
      return left.isDefault ? -1 : 1;
    }

    if (left.priority !== right.priority) {
      return left.priority - right.priority;
    }

    return left.createdAt.getTime() - right.createdAt.getTime();
  });

  if (!endpoint) {
    return null;
  }

  return {
    family: endpoint.family,
    provider: endpoint.provider,
    endpoint,
  };
}
