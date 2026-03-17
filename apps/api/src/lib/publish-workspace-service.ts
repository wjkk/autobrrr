import { prisma } from './prisma.js';
import { requireOwnedEpisode } from './workspace-shared.js';

function mapPublishSummary(shots: Array<{
  activeVersion: {
    status: string;
  } | null;
}>) {
  const publishableShots = shots.filter((shot) => shot.activeVersion && shot.activeVersion.status === 'ACTIVE');
  return {
    totalShots: shots.length,
    publishableShotCount: publishableShots.length,
    readyToPublish: shots.length > 0 && publishableShots.length === shots.length,
  };
}

function mapPublishActiveVersion(activeVersion: {
  id: string;
  label: string;
  mediaKind: string;
  status: string;
} | null) {
  if (!activeVersion) {
    return null;
  }

  return {
    id: activeVersion.id,
    label: activeVersion.label,
    mediaKind: activeVersion.mediaKind.toLowerCase(),
    status: activeVersion.status.toLowerCase(),
  };
}

export async function getPublishWorkspace(args: {
  projectId: string;
  episodeId: string;
  userId: string;
}) {
  const episode = await requireOwnedEpisode(args.projectId, args.episodeId, args.userId);
  if (!episode) {
    return null;
  }

  const shots = await prisma.shot.findMany({
    where: { episodeId: episode.id },
    orderBy: { sequenceNo: 'asc' },
    include: {
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

  return {
    project: {
      id: episode.project.id,
      title: episode.project.title,
      status: episode.project.status.toLowerCase(),
    },
    episode: {
      id: episode.id,
      episodeNo: episode.episodeNo,
      title: episode.title,
      status: episode.status.toLowerCase(),
    },
    summary: mapPublishSummary(shots),
    shots: shots.map((shot) => ({
      id: shot.id,
      sequenceNo: shot.sequenceNo,
      title: shot.title,
      status: shot.status.toLowerCase(),
      activeVersionId: shot.activeVersionId,
      activeVersion: mapPublishActiveVersion(shot.activeVersion),
    })),
  };
}

export const __testables = {
  mapPublishSummary,
  mapPublishActiveVersion,
};
