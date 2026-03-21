import { prisma } from './prisma.js';

export async function getStudioProject(userId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      createdById: userId,
    },
    include: {
      episodes: {
        orderBy: { episodeNo: 'asc' },
        select: {
          id: true,
          episodeNo: true,
          title: true,
          status: true,
        },
      },
      creationConfig: {
        include: {
          imageModelEndpoint: {
            select: {
              id: true,
              slug: true,
              label: true,
            },
          },
          subjectProfile: {
            select: {
              id: true,
              slug: true,
              name: true,
            },
          },
          stylePreset: {
            select: {
              id: true,
              slug: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!project) {
    return null;
  }

  return {
    id: project.id,
    title: project.title,
    brief: project.brief,
    contentMode: project.contentMode.toLowerCase(),
    status: project.status.toLowerCase(),
    currentEpisodeId: project.currentEpisodeId,
    creationConfig: project.creationConfig
      ? {
          selectedTab: project.creationConfig.selectedTab,
          selectedSubtype: project.creationConfig.selectedSubtype,
          scriptSourceName: project.creationConfig.scriptSourceName,
          hasScriptContent: Boolean(project.creationConfig.scriptContent),
          imageModelEndpoint: project.creationConfig.imageModelEndpoint,
          subjectProfile: project.creationConfig.subjectProfile,
          stylePreset: project.creationConfig.stylePreset,
          settings: project.creationConfig.settingsJson,
        }
      : null,
    episodes: project.episodes.map((episode) => ({
      id: episode.id,
      episodeNo: episode.episodeNo,
      title: episode.title,
      status: episode.status.toLowerCase(),
    })),
  };
}
