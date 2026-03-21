import { mapAsset } from './api-mappers.js';

export function mapProjectStatus(status: string) {
  return status.toLowerCase();
}

export function readAssetIds(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.length > 0) : [];
}

export function collectPreviewAssetIds(projects: Array<{
  plannerSessions: Array<{
    refinementVersions: Array<{
      subjects: Array<{ generatedAssetIdsJson: unknown; referenceAssetIdsJson: unknown }>;
      scenes: Array<{ generatedAssetIdsJson: unknown; referenceAssetIdsJson: unknown }>;
      shotScripts: Array<{ generatedAssetIdsJson: unknown; referenceAssetIdsJson: unknown }>;
    }>;
  }>;
}>) {
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

  return previewAssetIds;
}

export function buildPreviewAssetMap(assets: Parameters<typeof mapAsset>[0][]) {
  return new Map(assets.map((asset) => [asset.id, mapAsset(asset)]));
}

export function resolveProjectPreviewAsset(args: {
  activeRefinement:
    | {
        subjects: Array<{ generatedAssetIdsJson: unknown; referenceAssetIdsJson: unknown }>;
        scenes: Array<{ generatedAssetIdsJson: unknown; referenceAssetIdsJson: unknown }>;
        shotScripts: Array<{ generatedAssetIdsJson: unknown; referenceAssetIdsJson: unknown }>;
      }
    | null
    | undefined;
  assetMap: ReturnType<typeof buildPreviewAssetMap>;
  projectAssets: Parameters<typeof mapAsset>[0][];
}) {
  const prioritizedPreviewIds = [
    ...(args.activeRefinement?.subjects.flatMap((subject) => [...readAssetIds(subject.generatedAssetIdsJson), ...readAssetIds(subject.referenceAssetIdsJson)]) ?? []),
    ...(args.activeRefinement?.scenes.flatMap((scene) => [...readAssetIds(scene.generatedAssetIdsJson), ...readAssetIds(scene.referenceAssetIdsJson)]) ?? []),
    ...(args.activeRefinement?.shotScripts.flatMap((shot) => [...readAssetIds(shot.generatedAssetIdsJson), ...readAssetIds(shot.referenceAssetIdsJson)]) ?? []),
  ];

  return (
    prioritizedPreviewIds
      .map((assetId) => args.assetMap.get(assetId))
      .find((asset) => asset?.sourceUrl) ??
    args.projectAssets
      .map((asset) => mapAsset(asset))
      .find((asset) => asset.sourceUrl)
  );
}
