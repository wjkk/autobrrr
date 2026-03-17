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
      },
    },
  },
});

const ownedShotQuery = Prisma.validator<Prisma.ShotFindFirstArgs>()({
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

type OwnedProjectQuery = Prisma.ProjectFindFirstArgs;
type OwnedProjectRecord = Prisma.ProjectGetPayload<OwnedProjectQuery> | null;
type OwnedEpisodeQuery = Prisma.EpisodeFindFirstArgs;
type OwnedEpisodeRecord = Prisma.EpisodeGetPayload<typeof ownedEpisodeQuery> | null;
type OwnedShotQuery = Prisma.ShotFindFirstArgs;
type OwnedShotRecord = Prisma.ShotGetPayload<typeof ownedShotQuery> | null;
type OwnedRunQuery = Prisma.RunFindFirstArgs;
type OwnedRunRecord = Prisma.RunGetPayload<OwnedRunQuery> | null;

async function findOwnedProjectWithDeps(
  projectId: string,
  userId: string,
  deps: {
    findProject: (args: OwnedProjectQuery) => Promise<OwnedProjectRecord>;
  },
) {
  return deps.findProject({
    where: {
      id: projectId,
      createdById: userId,
    },
  });
}

export async function findOwnedProject(projectId: string, userId: string) {
  return findOwnedProjectWithDeps(projectId, userId, {
    findProject: async (args) => prisma.project.findFirst(args) as Promise<OwnedProjectRecord>,
  });
}

async function findOwnedEpisodeWithDeps(
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

export async function findOwnedEpisode(projectId: string, episodeId: string, userId: string) {
  return findOwnedEpisodeWithDeps(projectId, episodeId, userId, {
    findEpisode: async (args) => prisma.episode.findFirst(args) as Promise<OwnedEpisodeRecord>,
  });
}

async function findOwnedShotWithDeps(
  projectId: string,
  shotId: string,
  userId: string,
  deps: {
    findShot: (args: OwnedShotQuery) => Promise<OwnedShotRecord>;
  },
) {
  return deps.findShot({
    where: {
      id: shotId,
      projectId,
      project: {
        createdById: userId,
      },
    },
    include: ownedShotQuery.include,
  });
}

export async function findOwnedShot(projectId: string, shotId: string, userId: string) {
  return findOwnedShotWithDeps(projectId, shotId, userId, {
    findShot: async (args) => prisma.shot.findFirst(args) as Promise<OwnedShotRecord>,
  });
}

async function findOwnedRunWithDeps(
  runId: string,
  userId: string,
  deps: {
    findRun: (args: OwnedRunQuery) => Promise<OwnedRunRecord>;
  },
) {
  return deps.findRun({
    where: {
      id: runId,
      project: {
        createdById: userId,
      },
    },
  });
}

export async function findOwnedRun(runId: string, userId: string) {
  return findOwnedRunWithDeps(runId, userId, {
    findRun: async (args) => prisma.run.findFirst(args) as Promise<OwnedRunRecord>,
  });
}

export const __testables = {
  findOwnedProjectWithDeps,
  findOwnedEpisodeWithDeps,
  findOwnedShotWithDeps,
  findOwnedRunWithDeps,
};
