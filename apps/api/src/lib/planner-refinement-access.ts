import { prisma } from './prisma.js';

export async function findOwnedActivePlannerRefinement(projectId: string, episodeId: string, userId: string) {
  return prisma.plannerRefinementVersion.findFirst({
    where: {
      isActive: true,
      plannerSession: {
        projectId,
        episodeId,
        isActive: true,
        project: {
          createdById: userId,
        },
      },
    },
    select: {
      id: true,
      isConfirmed: true,
      plannerSession: {
        select: {
          project: {
            select: {
              id: true,
              creationConfig: {
                include: {
                  imageModelEndpoint: {
                    select: {
                      id: true,
                      slug: true,
                      label: true,
                    },
                  },
                },
              },
            },
          },
          episode: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
    },
  });
}

export async function verifyOwnedPlannerImageAssets(args: {
  assetIds: string[];
  projectId: string;
  userId: string;
}) {
  if (args.assetIds.length === 0) {
    return true;
  }

  const ownedAssets = await prisma.asset.findMany({
    where: {
      id: { in: args.assetIds },
      projectId: args.projectId,
      ownerUserId: args.userId,
      mediaKind: 'IMAGE',
    },
    select: { id: true },
  });

  return ownedAssets.length === new Set(args.assetIds).size;
}
