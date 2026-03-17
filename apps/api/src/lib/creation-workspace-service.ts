import { prisma } from './prisma.js';
import { requireOwnedEpisode } from './workspace-shared.js';

function mapWorkspaceAsset(asset: {
  id: string;
  sourceUrl: string | null;
  fileName: string | null;
  mediaKind: string;
  sourceKind: string;
  createdAt: Date;
}) {
  return {
    id: asset.id,
    sourceUrl: asset.sourceUrl,
    fileName: asset.fileName,
    mediaKind: asset.mediaKind.toLowerCase(),
    sourceKind: asset.sourceKind.toLowerCase(),
    createdAt: asset.createdAt.toISOString(),
  };
}

function buildMaterialBindings(
  materialBindingsJson: unknown,
  materialAssetMap: Map<string, {
    id: string;
    sourceUrl: string | null;
    fileName: string | null;
    mediaKind: string;
    sourceKind: string;
    createdAt: Date;
  }>,
) {
  if (!Array.isArray(materialBindingsJson)) {
    return [];
  }

  return materialBindingsJson
    .filter((assetId): assetId is string => typeof assetId === 'string')
    .map((assetId) => materialAssetMap.get(assetId))
    .filter((asset): asset is NonNullable<typeof asset> => Boolean(asset))
    .map(mapWorkspaceAsset);
}

function buildLatestRunByShotId(runs: Array<{
  id: string;
  resourceId: string | null;
  runType: string;
  status: string;
  modelEndpoint: {
    id: string;
    slug: string;
    label: string;
  } | null;
}>) {
  const latestRunByShotId = new Map<string, (typeof runs)[number]>();
  for (const run of runs) {
    if (!run.resourceId || latestRunByShotId.has(run.resourceId)) {
      continue;
    }
    latestRunByShotId.set(run.resourceId, run);
  }
  return latestRunByShotId;
}

function mapLatestGenerationRun(run: {
  id: string;
  runType: string;
  status: string;
  modelEndpoint: {
    id: string;
    slug: string;
    label: string;
  } | null;
} | undefined) {
  if (!run) {
    return null;
  }

  return {
    id: run.id,
    runType: run.runType.toLowerCase(),
    status: run.status.toLowerCase(),
    modelEndpoint: run.modelEndpoint
      ? {
          id: run.modelEndpoint.id,
          slug: run.modelEndpoint.slug,
          label: run.modelEndpoint.label,
        }
      : null,
  };
}

function mapActiveVersion(activeVersion: {
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

export async function getCreationWorkspace(args: {
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

  const materialAssetIds = new Set<string>();
  for (const shot of shots) {
    if (!Array.isArray(shot.materialBindingsJson)) {
      continue;
    }
    for (const assetId of shot.materialBindingsJson) {
      if (typeof assetId === 'string' && assetId.trim().length > 0) {
        materialAssetIds.add(assetId);
      }
    }
  }

  const materialAssets = materialAssetIds.size > 0
    ? await prisma.asset.findMany({
        where: {
          id: {
            in: Array.from(materialAssetIds),
          },
        },
        select: {
          id: true,
          sourceUrl: true,
          fileName: true,
          mediaKind: true,
          sourceKind: true,
          createdAt: true,
        },
      })
    : [];
  const materialAssetMap = new Map(materialAssets.map((asset) => [asset.id, asset]));

  const runs = await prisma.run.findMany({
    where: {
      episodeId: episode.id,
      resourceType: 'shot',
      runType: {
        in: ['IMAGE_GENERATION', 'VIDEO_GENERATION'],
      },
    },
    include: {
      modelEndpoint: {
        select: {
          id: true,
          slug: true,
          label: true,
        },
      },
    },
    orderBy: [{ createdAt: 'desc' }],
  });

  const latestRunByShotId = buildLatestRunByShotId(runs);

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
    shots: shots.map((shot) => ({
      id: shot.id,
      sequenceNo: shot.sequenceNo,
      title: shot.title,
      subtitleText: shot.subtitleText,
      narrationText: shot.narrationText,
      imagePrompt: shot.imagePrompt,
      motionPrompt: shot.motionPrompt,
      promptJson:
        shot.promptJson && typeof shot.promptJson === 'object' && !Array.isArray(shot.promptJson)
          ? shot.promptJson
          : null,
      targetVideoModelFamilySlug: shot.targetVideoModelFamilySlug,
      materialBindings: buildMaterialBindings(shot.materialBindingsJson, materialAssetMap),
      finalizedAt: shot.finalizedAt?.toISOString() ?? null,
      status: shot.status.toLowerCase(),
      latestGenerationRun: mapLatestGenerationRun(latestRunByShotId.get(shot.id)),
      activeVersionId: shot.activeVersionId,
      activeVersion: mapActiveVersion(shot.activeVersion),
    })),
  };
}

export const __testables = {
  buildMaterialBindings,
  buildLatestRunByShotId,
  mapLatestGenerationRun,
  mapActiveVersion,
};
