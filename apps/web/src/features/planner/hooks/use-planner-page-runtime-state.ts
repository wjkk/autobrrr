'use client';

import { useCallback } from 'react';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

import type { ApiPlannerWorkspace, PlannerRuntimeApiContext } from '../lib/planner-api';
import type { PlannerPageData } from '../lib/planner-page-data';
import { SCENE_IMAGE_POOL, SUBJECT_IMAGE_POOL } from '../lib/planner-defaults';
import { outlineToPreviewStructuredPlannerDoc } from '../lib/planner-structured-doc';

import { buildPlannerDebugSearch } from '@/features/planner-debug/lib/planner-debug-runtime';

interface UsePlannerPageRuntimeStateOptions {
  studio: PlannerPageData;
  runtimeApi?: PlannerRuntimeApiContext;
  runtimeWorkspace: ApiPlannerWorkspace | null;
  displayTitle: string;
  router: AppRouterInstance;
}

export function usePlannerPageRuntimeState(options: UsePlannerPageRuntimeStateOptions) {
  const runtimeActiveOutline = options.runtimeWorkspace?.activeOutline ?? null;
  const runtimeActiveRefinement = options.runtimeWorkspace?.activeRefinement ?? null;
  const workspaceStepAnalysis = runtimeActiveRefinement?.stepAnalysis ?? [];
  const latestPlannerExecutionMode = options.runtimeWorkspace?.latestPlannerRun?.executionMode ?? null;

  const activeEpisodeRuntimeId = options.runtimeApi?.episodeId ?? options.runtimeWorkspace?.episode.id ?? null;
  const plannerDebugSearch = buildPlannerDebugSearch({
    projectId: options.runtimeApi?.projectId ?? null,
    episodeId: activeEpisodeRuntimeId,
    projectTitle: options.displayTitle || options.studio.project.title,
    episodeTitle: options.runtimeWorkspace?.episode.title ?? null,
  });
  const activeDebugApplySource = runtimeActiveRefinement?.debugApplySource ?? null;

  const openDebugRun = useCallback((debugRunId: string) => {
    options.router.push(`/admin/planner-debug/runs/${encodeURIComponent(debugRunId)}${plannerDebugSearch}`);
  }, [options.router, plannerDebugSearch]);

  const openAgentDebug = useCallback(() => {
    options.router.push(`/admin/planner-debug${plannerDebugSearch}`);
  }, [options.router, plannerDebugSearch]);

  const backToExplore = useCallback(() => {
    options.router.push('/explore');
  }, [options.router]);

  return {
    workspaceStepAnalysis,
    runtimeActiveOutline,
    runtimeActiveRefinement,
    latestPlannerExecutionMode,
    activeDebugApplySource,
    openDebugRun,
    openAgentDebug,
    backToExplore,
    subjectImagePool: SUBJECT_IMAGE_POOL,
    sceneImagePool: SCENE_IMAGE_POOL,
    outlineToPreviewStructuredPlannerDoc,
  };
}
