import { prisma } from './prisma.js';

export async function requireOwnedEpisode(projectId: string, episodeId: string, userId: string) {
  return prisma.episode.findFirst({
    where: {
      id: episodeId,
      projectId,
      project: {
        createdById: userId,
      },
    },
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
}
