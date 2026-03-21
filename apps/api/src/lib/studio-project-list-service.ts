import { prisma } from './prisma.js';
import {
  buildPreviewAssetMap,
  collectPreviewAssetIds,
  mapProjectStatus,
  resolveProjectPreviewAsset,
} from './studio-project-presenters.js';

export async function listStudioProjects(userId: string) {
  const projects = await prisma.project.findMany({
    where: { createdById: userId },
    orderBy: { updatedAt: 'desc' },
    include: {
      currentEpisode: {
        select: {
          id: true,
          title: true,
          status: true,
        },
      },
      assets: {
        where: {
          mediaKind: 'IMAGE',
        },
        orderBy: { createdAt: 'desc' },
        take: 4,
        select: {
          id: true,
          ownerUserId: true,
          projectId: true,
          episodeId: true,
          mediaKind: true,
          sourceKind: true,
          fileName: true,
          mimeType: true,
          fileSizeBytes: true,
          width: true,
          height: true,
          durationMs: true,
          storageKey: true,
          sourceUrl: true,
          metadataJson: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      creationConfig: {
        select: {
          selectedTab: true,
          selectedSubtype: true,
        },
      },
      episodes: {
        orderBy: { episodeNo: 'asc' },
        select: {
          id: true,
        },
      },
      plannerSessions: {
        where: {
          isActive: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          refinementVersions: {
            where: {
              isActive: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              subjects: {
                orderBy: { sortOrder: 'asc' },
                take: 2,
                select: {
                  generatedAssetIdsJson: true,
                  referenceAssetIdsJson: true,
                },
              },
              scenes: {
                orderBy: { sortOrder: 'asc' },
                take: 2,
                select: {
                  generatedAssetIdsJson: true,
                  referenceAssetIdsJson: true,
                },
              },
              shotScripts: {
                orderBy: { sortOrder: 'asc' },
                take: 2,
                select: {
                  generatedAssetIdsJson: true,
                  referenceAssetIdsJson: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const previewAssetIds = collectPreviewAssetIds(projects);

  const previewAssets = previewAssetIds.size
    ? await prisma.asset.findMany({
        where: {
          id: { in: Array.from(previewAssetIds) },
        },
      })
    : [];
  const previewAssetMap = buildPreviewAssetMap(previewAssets);

  return projects.map((project) => {
    const activeRefinement = project.plannerSessions[0]?.refinementVersions[0];
    const previewAsset = resolveProjectPreviewAsset({
      activeRefinement,
      assetMap: previewAssetMap,
      projectAssets: project.assets,
    });

    return {
      id: project.id,
      title: project.title,
      brief: project.brief,
      status: mapProjectStatus(project.status),
      contentMode: project.contentMode.toLowerCase(),
      currentEpisodeId: project.currentEpisodeId,
      currentEpisode: project.currentEpisode
        ? {
            id: project.currentEpisode.id,
            title: project.currentEpisode.title,
            status: project.currentEpisode.status.toLowerCase(),
          }
        : null,
      episodeCount: project.episodes.length,
      creationConfig: project.creationConfig
        ? {
            selectedTab: project.creationConfig.selectedTab,
            selectedSubtype: project.creationConfig.selectedSubtype,
          }
        : null,
      previewAsset: previewAsset
        ? {
            id: previewAsset.id,
            sourceUrl: previewAsset.sourceUrl,
            fileName: previewAsset.fileName,
            sourceKind: previewAsset.sourceKind,
          }
        : null,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    };
  });
}
