import type { Asset, Run, Shot } from '@prisma/client';

export function readRunExecutionMode(outputJson: unknown): 'live' | 'fallback' | null {
  const output =
    outputJson && typeof outputJson === 'object' && !Array.isArray(outputJson)
      ? (outputJson as Record<string, unknown>)
      : null;
  const direct = typeof output?.executionMode === 'string' ? output.executionMode.trim().toLowerCase() : null;
  if (direct === 'live' || direct === 'fallback') {
    return direct;
  }

  const providerData =
    output?.providerData && typeof output.providerData === 'object' && !Array.isArray(output.providerData)
      ? (output.providerData as Record<string, unknown>)
      : null;
  if (providerData && 'mocked' in providerData) {
    return providerData.mocked === true ? 'fallback' : 'live';
  }

  return null;
}

export function mapAsset(asset: Asset) {
  return {
    id: asset.id,
    ownerUserId: asset.ownerUserId,
    projectId: asset.projectId,
    episodeId: asset.episodeId,
    mediaKind: asset.mediaKind.toLowerCase(),
    sourceKind: asset.sourceKind.toLowerCase(),
    fileName: asset.fileName,
    mimeType: asset.mimeType,
    fileSizeBytes: asset.fileSizeBytes,
    width: asset.width,
    height: asset.height,
    durationMs: asset.durationMs,
    storageKey: asset.storageKey,
    sourceUrl: asset.sourceUrl,
    metadata: asset.metadataJson,
    createdAt: asset.createdAt.toISOString(),
    updatedAt: asset.updatedAt.toISOString(),
  };
}

export function mapRun(run: Run) {
  return {
    id: run.id,
    projectId: run.projectId,
    episodeId: run.episodeId,
    modelFamilyId: run.modelFamilyId,
    modelProviderId: run.modelProviderId,
    modelEndpointId: run.modelEndpointId,
    runType: run.runType.toLowerCase(),
    resourceType: run.resourceType,
    resourceId: run.resourceId,
    status: run.status.toLowerCase(),
    executorType: run.executorType.toLowerCase(),
    input: run.inputJson,
    output: run.outputJson,
    executionMode: readRunExecutionMode(run.outputJson),
    errorCode: run.errorCode,
    errorMessage: run.errorMessage,
    idempotencyKey: run.idempotencyKey,
    providerJobId: run.providerJobId,
    providerStatus: run.providerStatus,
    nextPollAt: run.nextPollAt?.toISOString() ?? null,
    lastPolledAt: run.lastPolledAt?.toISOString() ?? null,
    pollAttemptCount: run.pollAttemptCount,
    startedAt: run.startedAt?.toISOString() ?? null,
    finishedAt: run.finishedAt?.toISOString() ?? null,
    createdAt: run.createdAt.toISOString(),
  };
}

export const __testables = {
  readRunExecutionMode,
};

export function mapShot(shot: Shot & { activeVersion?: { id: string; label: string; mediaKind: string; status: string } | null }) {
  return {
    id: shot.id,
    projectId: shot.projectId,
    episodeId: shot.episodeId,
    sequenceNo: shot.sequenceNo,
    title: shot.title,
    subtitleText: shot.subtitleText,
    narrationText: shot.narrationText,
    imagePrompt: shot.imagePrompt,
    motionPrompt: shot.motionPrompt,
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
    createdAt: shot.createdAt.toISOString(),
    updatedAt: shot.updatedAt.toISOString(),
  };
}
