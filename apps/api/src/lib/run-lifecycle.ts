import { Prisma } from '@prisma/client';
import type { Run } from '@prisma/client';

import { downloadGeneratedAssetToLocal } from './asset-storage.js';
import { finalizePlannerConversation } from './planner/orchestration/orchestrator.js';
import { extractPlannerText, findStringDeep } from './planner/text-extraction.js';
import { syncPlannerRefinementProjection } from './planner/refinement/projection.js';
import { prisma } from './prisma.js';
import { buildRunFailureLogEntry } from './run-observability.js';
import {
  finalizePlannerEntityGeneratedRun,
  finalizeShotGeneratedRun,
  type SupportedMediaKind,
} from './run-generated-finalizer.js';
export type { SupportedMediaKind } from './run-generated-finalizer.js';

interface RunLifecycleDeps {
  prisma: typeof prisma;
  downloadGeneratedAssetToLocal: typeof downloadGeneratedAssetToLocal;
  finalizePlannerConversation: typeof finalizePlannerConversation;
  syncPlannerRefinementProjection: typeof syncPlannerRefinementProjection;
}

const defaultRunLifecycleDeps: RunLifecycleDeps = {
  prisma,
  downloadGeneratedAssetToLocal,
  finalizePlannerConversation,
  syncPlannerRefinementProjection,
};

export type RunLifecycleAction =
  | { runId: string; status: string; action: 'processed'; assetId?: string; shotVersionId?: string }
  | { runId: string; status: string; action: 'failed' };

export function inferMediaKindFromRunType(runType: string): SupportedMediaKind | null {
  if (runType === 'IMAGE_GENERATION') {
    return 'IMAGE';
  }

  if (runType === 'VIDEO_GENERATION') {
    return 'VIDEO';
  }

  return null;
}

import { readObject } from './json-helpers.js';

async function finalizePlannerRunWithDeps(run: Run, deps: RunLifecycleDeps): Promise<RunLifecycleAction> {
  if (run.resourceType !== 'planner_session' || !run.resourceId || !run.projectId || !run.episodeId) {
    return failRunWithDeps(run.id, 'RUN_RESOURCE_INVALID', 'Run is missing planner session/project/episode linkage.', deps);
  }

  const plannerSession = await deps.prisma.plannerSession.findUnique({
    where: { id: run.resourceId },
  });

  if (!plannerSession) {
    return failRunWithDeps(run.id, 'PLANNER_SESSION_NOT_FOUND', 'Planner session not found for run resource.', deps);
  }

  const input = readObject(run.inputJson);
  const output = readObject(run.outputJson);
  const rawPrompt = typeof input.rawPrompt === 'string' ? input.rawPrompt : '未命名策划';
  const generatedText = extractPlannerText(output.providerData, rawPrompt);
  await deps.finalizePlannerConversation({
    run,
    plannerSession,
    generatedText,
    createdById: plannerSession.createdById,
  });

  return {
    runId: run.id,
    status: 'completed',
    action: 'processed',
  };
}

async function failRunWithDeps(runId: string, errorCode: string, errorMessage: string, deps: Pick<RunLifecycleDeps, 'prisma'>): Promise<RunLifecycleAction> {
  console.error(JSON.stringify(buildRunFailureLogEntry({
    runId,
    errorCode,
    errorMessage,
  })));
  const failedRun = await deps.prisma.run.update({
    where: { id: runId },
    data: {
      status: 'FAILED',
      errorCode,
      errorMessage,
      finishedAt: new Date(),
      nextPollAt: null,
    },
  });

  return {
    runId: failedRun.id,
    status: failedRun.status.toLowerCase(),
    action: 'failed',
  };
}

export async function failRun(runId: string, errorCode: string, errorMessage: string): Promise<RunLifecycleAction> {
  return failRunWithDeps(runId, errorCode, errorMessage, defaultRunLifecycleDeps);
}

async function finalizeGeneratedRunWithDeps(run: Run, mediaKind: SupportedMediaKind, deps: RunLifecycleDeps): Promise<RunLifecycleAction> {
  if (!run.resourceType || !run.resourceId || !run.projectId || !run.episodeId) {
    return failRunWithDeps(run.id, 'RUN_RESOURCE_INVALID', 'Run is missing resource/project/episode linkage.', deps);
  }

  const projectId = run.projectId;
  const episodeId = run.episodeId;
  const resourceId = run.resourceId;

  if (run.resourceType !== 'shot' && mediaKind !== 'IMAGE') {
    return failRunWithDeps(run.id, 'RUN_RESOURCE_INVALID', 'Planner entities currently only support image generation.', deps);
  }

  if (run.resourceType === 'planner_subject' || run.resourceType === 'planner_scene' || run.resourceType === 'planner_shot_script') {
    try {
      const result = await finalizePlannerEntityGeneratedRun(run, resourceId, deps);

      return {
        runId: run.id,
        status: 'completed',
        action: 'processed',
        assetId: result.assetId,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Planner entity image finalization failed.';
      const errorCode =
        message === 'Provider output did not include a downloadable image URL.'
          ? 'PROVIDER_OUTPUT_URL_MISSING'
          : 'PLANNER_ENTITY_IMAGE_FINALIZE_FAILED';
      return failRunWithDeps(run.id, errorCode, message, deps);
    }
  }

  if (run.resourceType !== 'shot') {
    return failRunWithDeps(run.id, 'RUN_RESOURCE_INVALID', 'Unsupported generated run resource type.', deps);
  }

  try {
    const result = await finalizeShotGeneratedRun(run, mediaKind, deps);

    return {
      runId: run.id,
      status: 'completed',
      action: 'processed',
      assetId: result.assetId,
      shotVersionId: result.shotVersionId,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Generated asset finalization failed.';
    const errorCode =
      message === 'Shot not found for run resource.'
        ? 'SHOT_NOT_FOUND'
        : message.startsWith('Provider output did not include a downloadable')
          ? 'PROVIDER_OUTPUT_URL_MISSING'
          : 'SHOT_GENERATED_ASSET_FINALIZE_FAILED';
    return failRunWithDeps(run.id, errorCode, message, deps);
  }
}

export async function finalizePlannerRun(run: Run): Promise<RunLifecycleAction> {
  return finalizePlannerRunWithDeps(run, defaultRunLifecycleDeps);
}

export async function finalizeGeneratedRun(run: Run, mediaKind: SupportedMediaKind): Promise<RunLifecycleAction> {
  return finalizeGeneratedRunWithDeps(run, mediaKind, defaultRunLifecycleDeps);
}

export const __testables = {
  finalizePlannerRunWithDeps,
  finalizeGeneratedRunWithDeps,
  failRunWithDeps,
};
