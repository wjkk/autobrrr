import { prisma } from './prisma.js';
import { requireOwnedEpisode } from './workspace-shared.js';

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

  const publishableShots = shots.filter((shot) => {
    return shot.activeVersion && shot.activeVersion.status === 'ACTIVE';
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
    summary: {
      totalShots: shots.length,
      publishableShotCount: publishableShots.length,
      readyToPublish: shots.length > 0 && publishableShots.length === shots.length,
    },
    shots: shots.map((shot) => ({
      id: shot.id,
      sequenceNo: shot.sequenceNo,
      title: shot.title,
      status: shot.status.toLowerCase(),
      activeVersionId: shot.activeVersionId,
      activeVersion: shot.activeVersion
        ? {
            id: shot.activeVersion.id,
            label: shot.activeVersion.label,
            mediaKind: shot.activeVersion.mediaKind.toLowerCase(),
            status: shot.activeVersion.status.toLowerCase(),
          }
        : null,
    })),
  };
}
