import { Prisma } from '@prisma/client';

import { mapAsset } from './api-mappers.js';
import { buildProjectTitleFromPrompt } from './project-title.js';
import { prisma } from './prisma.js';

function mapProjectStatus(status: string) {
  return status.toLowerCase();
}

function readAssetIds(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.length > 0) : [];
}

export interface CreateStudioProjectInput {
  prompt: string;
  contentMode: 'single' | 'series';
  creationConfig?: {
    selectedTab: '短剧漫剧' | '音乐MV' | '知识分享';
    selectedSubtype?: string;
    scriptSourceName?: string;
    scriptContent?: string;
    imageModelEndpointSlug?: string;
    subjectProfileSlug?: string;
    stylePresetSlug?: string;
    settings?: Record<string, unknown>;
  };
}

type CreateStudioProjectError =
  | 'INVALID_IMAGE_MODEL'
  | 'INVALID_SUBJECT_PROFILE'
  | 'INVALID_STYLE_PRESET';

export type CreateStudioProjectResult =
  | {
      ok: true;
      data: {
        projectId: string;
        redirectUrl: string;
        project: {
          id: string;
          title: string;
          contentMode: string;
          status: string;
        };
      };
    }
  | {
      ok: false;
      error: CreateStudioProjectError;
    };

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

  const previewAssetIds = new Set<string>();

  for (const project of projects) {
    const activeRefinement = project.plannerSessions[0]?.refinementVersions[0];
    for (const subject of activeRefinement?.subjects ?? []) {
      for (const assetId of [...readAssetIds(subject.generatedAssetIdsJson), ...readAssetIds(subject.referenceAssetIdsJson)]) {
        previewAssetIds.add(assetId);
      }
    }
    for (const scene of activeRefinement?.scenes ?? []) {
      for (const assetId of [...readAssetIds(scene.generatedAssetIdsJson), ...readAssetIds(scene.referenceAssetIdsJson)]) {
        previewAssetIds.add(assetId);
      }
    }
    for (const shot of activeRefinement?.shotScripts ?? []) {
      for (const assetId of [...readAssetIds(shot.generatedAssetIdsJson), ...readAssetIds(shot.referenceAssetIdsJson)]) {
        previewAssetIds.add(assetId);
      }
    }
  }

  const previewAssets = previewAssetIds.size
    ? await prisma.asset.findMany({
        where: {
          id: { in: Array.from(previewAssetIds) },
        },
      })
    : [];
  const previewAssetMap = new Map(previewAssets.map((asset) => [asset.id, mapAsset(asset)]));

  return projects.map((project) => {
    const activeRefinement = project.plannerSessions[0]?.refinementVersions[0];
    const prioritizedPreviewIds = [
      ...(activeRefinement?.subjects.flatMap((subject) => [...readAssetIds(subject.generatedAssetIdsJson), ...readAssetIds(subject.referenceAssetIdsJson)]) ?? []),
      ...(activeRefinement?.scenes.flatMap((scene) => [...readAssetIds(scene.generatedAssetIdsJson), ...readAssetIds(scene.referenceAssetIdsJson)]) ?? []),
      ...(activeRefinement?.shotScripts.flatMap((shot) => [...readAssetIds(shot.generatedAssetIdsJson), ...readAssetIds(shot.referenceAssetIdsJson)]) ?? []),
    ];
    const previewAsset =
      prioritizedPreviewIds
        .map((assetId) => previewAssetMap.get(assetId))
        .find((asset) => asset?.sourceUrl) ??
      project.assets
        .map((asset) => mapAsset(asset))
        .find((asset) => asset.sourceUrl);

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

export async function createStudioProject(userId: string, input: CreateStudioProjectInput): Promise<CreateStudioProjectResult> {
  const contentMode = input.contentMode === 'series' ? 'SERIES' : 'SINGLE';
  const title = buildProjectTitleFromPrompt(input.prompt);
  const creationConfig = input.creationConfig;

  const [imageModelEndpoint, subjectProfile, stylePreset] = await Promise.all([
    creationConfig?.imageModelEndpointSlug
      ? prisma.modelEndpoint.findFirst({
          where: {
            slug: creationConfig.imageModelEndpointSlug,
            status: 'ACTIVE',
            family: {
              modelKind: 'IMAGE',
            },
          },
          select: {
            id: true,
          },
        })
      : Promise.resolve(null),
    creationConfig?.subjectProfileSlug
      ? prisma.subjectProfile.findFirst({
          where: {
            slug: creationConfig.subjectProfileSlug,
            enabled: true,
            OR: [
              { visibility: 'PUBLIC' },
              {
                visibility: 'PERSONAL',
                ownerUserId: userId,
              },
            ],
          },
          select: {
            id: true,
          },
        })
      : Promise.resolve(null),
    creationConfig?.stylePresetSlug
      ? prisma.stylePreset.findFirst({
          where: {
            slug: creationConfig.stylePresetSlug,
            enabled: true,
            OR: [
              { visibility: 'PUBLIC' },
              {
                visibility: 'PERSONAL',
                ownerUserId: userId,
              },
            ],
          },
          select: {
            id: true,
          },
        })
      : Promise.resolve(null),
  ]);

  if (creationConfig?.imageModelEndpointSlug && !imageModelEndpoint) {
    return { ok: false, error: 'INVALID_IMAGE_MODEL' };
  }

  if (creationConfig?.subjectProfileSlug && !subjectProfile) {
    return { ok: false, error: 'INVALID_SUBJECT_PROFILE' };
  }

  if (creationConfig?.stylePresetSlug && !stylePreset) {
    return { ok: false, error: 'INVALID_STYLE_PRESET' };
  }

  const result = await prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        title,
        brief: input.prompt,
        contentMode,
        status: 'PLANNING',
        createdById: userId,
      },
    });

    if (creationConfig) {
      await tx.projectCreationConfig.create({
        data: {
          projectId: project.id,
          selectedTab: creationConfig.selectedTab,
          selectedSubtype: creationConfig.selectedSubtype ?? null,
          scriptSourceName: creationConfig.scriptSourceName ?? null,
          scriptContent: creationConfig.scriptContent ?? null,
          imageModelEndpointId: imageModelEndpoint?.id ?? null,
          subjectProfileId: subjectProfile?.id ?? null,
          stylePresetId: stylePreset?.id ?? null,
          ...(creationConfig.settings ? { settingsJson: creationConfig.settings as Prisma.InputJsonValue } : {}),
        },
      });
    }

    const episode = await tx.episode.create({
      data: {
        projectId: project.id,
        episodeNo: 1,
        title: '第1集',
        summary: input.prompt,
        status: 'PLANNING',
      },
    });

    const plannerSession = await tx.plannerSession.create({
      data: {
        projectId: project.id,
        episodeId: episode.id,
        status: 'IDLE',
        isActive: true,
        createdById: userId,
      },
    });

    await tx.episode.update({
      where: { id: episode.id },
      data: {
        activePlannerSessionId: plannerSession.id,
      },
    });

    return tx.project.update({
      where: { id: project.id },
      data: {
        currentEpisodeId: episode.id,
      },
    });
  });

  return {
    ok: true,
    data: {
      projectId: result.id,
      redirectUrl: `/projects/${result.id}/planner`,
      project: {
        id: result.id,
        title: result.title,
        contentMode: result.contentMode.toLowerCase(),
        status: mapProjectStatus(result.status),
      },
    },
  };
}

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
