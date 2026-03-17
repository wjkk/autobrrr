'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

import { finalizePlannerRefinement, type ApiPlannerWorkspace, type PlannerRuntimeApiContext } from '../lib/planner-api';
import { resolvePlannerCreationActionState } from '../lib/planner-creation-flow-logic';
import type { SekoActDraft } from '../lib/seko-plan-data';

const BOOT_PROGRESS_STEPS = [28, 49, 67, 85, 100];

interface UsePlannerCreationFlowOptions {
  router: AppRouterInstance;
  runtimeApi?: PlannerRuntimeApiContext;
  runtimeWorkspace: ApiPlannerWorkspace | null;
  runtimeActiveRefinement: ApiPlannerWorkspace['activeRefinement'];
  displayVersionStatus: string | null;
  displayScriptActs: SekoActDraft[];
  remainingPoints: number;
  pointCost: number;
  storyboardModelId: string;
  studioProjectId: string;
  refreshPlannerWorkspace: () => Promise<ApiPlannerWorkspace | null>;
  setNotice: (message: string | null) => void;
}

export function usePlannerCreationFlow(options: UsePlannerCreationFlowOptions) {
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const [booting, setBooting] = useState(false);
  const [bootProgress, setBootProgress] = useState(0);

  const clearPendingTimers = useCallback(() => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      clearPendingTimers();
    };
  }, [clearPendingTimers]);

  const {
    creationReady,
    hasReadyShots,
    hasSufficientPoints,
    shouldFinalizeBeforeNavigate,
    creationActionLabel,
    creationActionDisabled,
  } = resolvePlannerCreationActionState({
    runtimeApi: options.runtimeApi,
    runtimeWorkspace: options.runtimeWorkspace,
    runtimeActiveRefinement: options.runtimeActiveRefinement,
    displayVersionStatus: options.displayVersionStatus,
    displayScriptActs: options.displayScriptActs,
    remainingPoints: options.remainingPoints,
    pointCost: options.pointCost,
    storyboardModelId: options.storyboardModelId,
    booting,
  });

  const startCreation = useCallback(async () => {
    if (!creationReady) {
      options.setNotice('请先完成剧情细化后再生成分镜。');
      return;
    }

    if (!hasReadyShots) {
      options.setNotice('当前还没有可生成的分镜草稿。');
      return;
    }

    if (!hasSufficientPoints) {
      options.setNotice('积分不足，无法生成分镜。');
      return;
    }

    clearPendingTimers();
    setBooting(true);
    setBootProgress(12);

    BOOT_PROGRESS_STEPS.forEach((value, index) => {
      const timer = setTimeout(() => setBootProgress(value), index * 160);
      timersRef.current.push(timer);
    });

    if (!options.runtimeApi || !options.runtimeActiveRefinement) {
      const navigationTimer = setTimeout(() => {
        options.router.push(`/projects/${options.studioProjectId}/creation`);
      }, BOOT_PROGRESS_STEPS.length * 160 + 160);
      timersRef.current.push(navigationTimer);
      return;
    }

    try {
      if (shouldFinalizeBeforeNavigate) {
        await finalizePlannerRefinement({
          projectId: options.runtimeApi.projectId,
          episodeId: options.runtimeApi.episodeId,
          targetVideoModelFamilySlug: options.storyboardModelId,
        });
        await options.refreshPlannerWorkspace().catch(() => null);
        options.setNotice('已确认策划并同步到创作工作区。');
      } else {
        options.setNotice('策划内容已同步，可直接进入创作。');
      }

      const navigationTimer = setTimeout(() => {
        options.router.push(`/projects/${options.studioProjectId}/creation`);
      }, BOOT_PROGRESS_STEPS.length * 160 + 160);
      timersRef.current.push(navigationTimer);
    } catch (error) {
      clearPendingTimers();
      setBooting(false);
      setBootProgress(0);
      options.setNotice(error instanceof Error ? error.message : '确认策划并进入创作失败。');
    }
  }, [clearPendingTimers, creationReady, hasReadyShots, hasSufficientPoints, options, shouldFinalizeBeforeNavigate]);

  return {
    booting,
    bootProgress,
    creationActionDisabled,
    creationActionLabel,
    startCreation,
  };
}
