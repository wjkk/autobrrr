import { Prisma } from '@prisma/client';

import { prisma } from './prisma.js';

const ownedEpisodeQuery = Prisma.validator<Prisma.EpisodeFindFirstArgs>()({
  include: {
    project: {
      select: {
        id: true,
        title: true,
        status: true,
        contentMode: true,
        currentEpisodeId: true,
        creationConfig: {
          select: {
            selectedTab: true,
            selectedSubtype: true,
          },
        },
      },
    },
  },
});

type OwnedEpisodeQuery = Prisma.EpisodeFindFirstArgs;
type OwnedEpisodeRecord = Prisma.EpisodeGetPayload<typeof ownedEpisodeQuery> | null;

async function requireOwnedEpisodeWithDeps(
  projectId: string,
  episodeId: string,
  userId: string,
  deps: {
    findEpisode: (args: OwnedEpisodeQuery) => Promise<OwnedEpisodeRecord>;
  },
) {
  return deps.findEpisode({
    where: {
      id: episodeId,
      projectId,
      project: {
        createdById: userId,
      },
    },
    include: ownedEpisodeQuery.include,
  });
}

export async function requireOwnedEpisode(projectId: string, episodeId: string, userId: string) {
  return requireOwnedEpisodeWithDeps(projectId, episodeId, userId, {
    findEpisode: async (args) => prisma.episode.findFirst(args) as Promise<OwnedEpisodeRecord>,
  });
}

export const __testables = {
  requireOwnedEpisodeWithDeps,
};
