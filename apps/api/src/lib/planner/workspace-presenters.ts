import { mapAsset, readRunExecutionMode } from '../api-mappers.js';

export function readStringIds(value: unknown) {
  return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string' && id.length > 0) : [];
}

export function resolvePlannerStage(args: { outlineConfirmedAt: Date | null } | null, activeOutline: { id: string } | null) {
  return args?.outlineConfirmedAt ? 'refinement' : activeOutline ? 'outline' : 'idle';
}

export function resolvePlannerRuntimeStatus(args: {
  plannerSession: { outlineConfirmedAt: Date | null } | null;
  activeOutline: { id: string; status: string } | null;
  activeRefinement: { id: string; status: string } | null;
  latestPlannerRun: { status: string } | null;
}) {
  const stage = resolvePlannerStage(args.plannerSession, args.activeOutline);
  const latestRunStatus = args.latestPlannerRun?.status.toUpperCase() ?? null;
  if (latestRunStatus === 'QUEUED' || latestRunStatus === 'RUNNING') {
    return stage === 'refinement' ? 'refinement_running' : 'outline_running';
  }

  if (latestRunStatus === 'FAILED' || latestRunStatus === 'TIMED_OUT' || latestRunStatus === 'CANCELED') {
    if (stage === 'refinement' || args.activeRefinement) {
      return 'refinement_failed';
    }
    if (stage === 'outline' || args.activeOutline) {
      return 'outline_failed';
    }
    return 'idle';
  }

  if (stage === 'refinement' || args.activeRefinement) {
    return args.activeRefinement?.status.toUpperCase() === 'FAILED'
      ? 'refinement_failed'
      : args.activeRefinement
        ? 'refinement_ready'
        : 'refinement_running';
  }

  if (stage === 'outline' || args.activeOutline) {
    return args.activeOutline?.status.toUpperCase() === 'FAILED'
      ? 'outline_failed'
      : args.activeOutline
        ? 'outline_ready'
        : 'outline_running';
  }

  return 'idle';
}

export function collectPlannerAssetIds(
  subjects: Array<{ referenceAssetIdsJson: unknown; generatedAssetIdsJson: unknown }>,
  scenes: Array<{ referenceAssetIdsJson: unknown; generatedAssetIdsJson: unknown }>,
  shots: Array<{ referenceAssetIdsJson: unknown; generatedAssetIdsJson: unknown }>,
) {
  const assetIds = new Set<string>();

  for (const subject of subjects) {
    for (const assetId of readStringIds(subject.referenceAssetIdsJson)) {
      assetIds.add(assetId);
    }
    for (const assetId of readStringIds(subject.generatedAssetIdsJson)) {
      assetIds.add(assetId);
    }
  }

  for (const scene of scenes) {
    for (const assetId of readStringIds(scene.referenceAssetIdsJson)) {
      assetIds.add(assetId);
    }
    for (const assetId of readStringIds(scene.generatedAssetIdsJson)) {
      assetIds.add(assetId);
    }
  }

  for (const shot of shots) {
    for (const assetId of readStringIds(shot.referenceAssetIdsJson)) {
      assetIds.add(assetId);
    }
    for (const assetId of readStringIds(shot.generatedAssetIdsJson)) {
      assetIds.add(assetId);
    }
  }

  return Array.from(assetIds);
}

export function mapPlannerLatestRun(
  latestPlannerRun:
    | {
        id: string;
        status: string;
        providerStatus: string | null;
        outputJson: unknown;
        errorCode: string | null;
        errorMessage: string | null;
        createdAt: Date;
        finishedAt: Date | null;
      }
    | null,
) {
  if (!latestPlannerRun) {
    return null;
  }

  const outputJson =
    latestPlannerRun.outputJson && typeof latestPlannerRun.outputJson === 'object' && !Array.isArray(latestPlannerRun.outputJson)
      ? (latestPlannerRun.outputJson as Record<string, unknown>)
      : null;

  return {
    id: latestPlannerRun.id,
    status: latestPlannerRun.status.toLowerCase(),
    executionMode: readRunExecutionMode(latestPlannerRun.outputJson),
    providerStatus: latestPlannerRun.providerStatus,
    generatedText: (outputJson?.generatedText as string | undefined) ?? null,
    structuredDoc: (outputJson?.structuredDoc as Record<string, unknown> | undefined) ?? null,
    errorCode: latestPlannerRun.errorCode,
    errorMessage: latestPlannerRun.errorMessage,
    createdAt: latestPlannerRun.createdAt.toISOString(),
    finishedAt: latestPlannerRun.finishedAt?.toISOString() ?? null,
  };
}

export function readPlannerDebugApplySource(triggerType: string | null | undefined, inputSnapshotJson: unknown) {
  const inputSnapshot =
    inputSnapshotJson && typeof inputSnapshotJson === 'object' && !Array.isArray(inputSnapshotJson)
      ? (inputSnapshotJson as Record<string, unknown>)
      : null;
  const debugRunId =
    inputSnapshot && typeof inputSnapshot.appliedFromDebugRunId === 'string' && inputSnapshot.appliedFromDebugRunId.trim().length > 0
      ? inputSnapshot.appliedFromDebugRunId.trim()
      : null;
  const appliedAt =
    inputSnapshot && typeof inputSnapshot.appliedFromDebugRunAt === 'string' && inputSnapshot.appliedFromDebugRunAt.trim().length > 0
      ? inputSnapshot.appliedFromDebugRunAt.trim()
      : null;

  if ((triggerType ?? '').toLowerCase() !== 'debug_apply' && !debugRunId) {
    return null;
  }

  return {
    debugRunId,
    appliedAt,
  };
}

export function buildPlannerAssetMap(assets: Parameters<typeof mapAsset>[0][]) {
  return new Map(assets.map((asset) => [asset.id, mapAsset(asset)]));
}

export function resolvePlannerWorkspaceAssets(assetMap: ReturnType<typeof buildPlannerAssetMap>, ids: unknown[]) {
  return ids
    .filter((id): id is string => typeof id === 'string' && id.length > 0)
    .map((id) => assetMap.get(id))
    .filter((asset): asset is NonNullable<ReturnType<typeof mapAsset>> => Boolean(asset));
}
