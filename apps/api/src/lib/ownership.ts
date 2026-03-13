import { prisma } from './prisma.js';

export async function findOwnedProject(projectId: string, userId: string) {
  return prisma.project.findFirst({
    where: {
      id: projectId,
      createdById: userId,
    },
  });
}

export async function findOwnedEpisode(projectId: string, episodeId: string, userId: string) {
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
        },
      },
    },
  });
}

export async function findOwnedShot(projectId: string, shotId: string, userId: string) {
  return prisma.shot.findFirst({
    where: {
      id: shotId,
      projectId,
      project: {
        createdById: userId,
      },
    },
    include: {
      episode: {
        select: {
          id: true,
          episodeNo: true,
          title: true,
          status: true,
        },
      },
      activeVersion: {
        select: {
          id: true,
          label: true,
          mediaKind: true,
          status: true,
        },
      },
    },
  });
}

export async function findOwnedRun(runId: string, userId: string) {
  return prisma.run.findFirst({
    where: {
      id: runId,
      project: {
        createdById: userId,
      },
    },
  });
}
