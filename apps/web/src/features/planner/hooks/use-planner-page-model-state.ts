'use client';

import { useEffect, useMemo, type CSSProperties } from 'react';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

import type { ApiPlannerWorkspace, PlannerRuntimeApiContext } from '../lib/planner-api';
import { createEmptyPlannerSeedData, DEFAULT_REFINEMENT_STEP_TITLES } from '../lib/planner-defaults';
import type { PlannerPageData } from '../lib/planner-page-data';
import { ratioCardWidth, ratioToCssValue, type PlannerAssetRatio, type PlannerMode } from '../lib/planner-page-helpers';
import type { PlannerStructuredDoc } from '../lib/planner-structured-doc';
import { toPlannerSeedData } from '../lib/planner-structured-doc';
import { usePlannerDisplayState } from './use-planner-display-state';
import { usePlannerPageRuntimeState } from './use-planner-page-runtime-state';
import { usePlannerRefinement } from './use-planner-refinement';

export function usePlannerPageModelState(args: {
  studio: PlannerPageData;
  runtimeApi?: PlannerRuntimeApiContext;
  runtimeWorkspace: ApiPlannerWorkspace | null;
  initialGeneratedText?: string | null;
  initialPlannerReady?: boolean;
  structuredPlannerDoc: PlannerStructuredDoc | null;
  activeEpisodeId: string;
  setActiveEpisodeId: (value: string) => void;
  displayTitle: string;
    storyboardModelId: string;
    aspectRatio: PlannerAssetRatio;
    setOutlineConfirmed: (value: boolean) => void;
    router: AppRouterInstance;
    streamSteps: Array<{ title: string; status: string; detail: Record<string, unknown> | null }>;
  }) {
  const plannerMode: PlannerMode = args.studio.project.contentMode === 'series' ? 'series' : 'single';
  const emptyPlannerDoc = useMemo(() => createEmptyPlannerSeedData(args.studio), [args.studio]);
  const plannerDoc = useMemo(
    () => (args.structuredPlannerDoc ? toPlannerSeedData(args.structuredPlannerDoc, emptyPlannerDoc) : emptyPlannerDoc),
    [args.structuredPlannerDoc, emptyPlannerDoc],
  );

  const refinement = usePlannerRefinement({
    stepCount: DEFAULT_REFINEMENT_STEP_TITLES.length,
    seedSubjects: plannerDoc.subjects,
    seedScenes: plannerDoc.scenes,
    seedActs: plannerDoc.acts,
  });

  const runtimeState = usePlannerPageRuntimeState({
    studio: args.studio,
    runtimeApi: args.runtimeApi,
    runtimeWorkspace: args.runtimeWorkspace,
    displayTitle: args.displayTitle,
    router: args.router,
  });

  useEffect(() => {
    if (!args.initialPlannerReady || !args.initialGeneratedText || refinement.versions.length > 0) {
      return;
    }

    if (runtimeState.runtimeActiveRefinement) {
      args.setOutlineConfirmed(true);
      return;
    }

    if (runtimeState.runtimeActiveOutline) {
      args.setOutlineConfirmed(false);
      return;
    }

    args.setOutlineConfirmed(true);
    refinement.hydrateReadyVersion({
      trigger: 'confirm_outline',
      instruction: args.studio.planner.submittedRequirement || args.studio.project.brief,
    });
  }, [
    args.initialGeneratedText,
    args.initialPlannerReady,
    args.setOutlineConfirmed,
    args.studio.planner.submittedRequirement,
    args.studio.project.brief,
    refinement.hydrateReadyVersion,
    refinement.versions.length,
    runtimeState.runtimeActiveOutline,
    runtimeState.runtimeActiveRefinement,
  ]);

  const displayState = usePlannerDisplayState({
    studioTitle: args.studio.project.title,
    studioBrief: args.studio.project.brief,
    plannerMode,
    plannerDoc,
    runtimeWorkspace: args.runtimeWorkspace,
    runtimeActiveOutline: runtimeState.runtimeActiveOutline,
    runtimeActiveRefinement: runtimeState.runtimeActiveRefinement,
    streamSteps: args.streamSteps,
    activeEpisodeId: args.activeEpisodeId,
    storyboardModelId: args.storyboardModelId,
    activeVersion: refinement.activeVersion,
    activeVersionId: refinement.activeVersionId,
    versions: refinement.versions,
    subjectImagePool: runtimeState.subjectImagePool,
    sceneImagePool: runtimeState.sceneImagePool,
  });

  useEffect(() => {
    if (!displayState.plannerEpisodes.some((item) => item.id === args.activeEpisodeId)) {
      args.setActiveEpisodeId(displayState.plannerEpisodes[0]?.id ?? 'episode-1');
    }
  }, [args.activeEpisodeId, args.setActiveEpisodeId, displayState.plannerEpisodes]);

  const pointCost = args.studio.planner.pointCost > 0 ? args.studio.planner.pointCost : plannerDoc.pointCost;
  const mediaCardStyle = useMemo(
    () => ({
      '--planner-media-aspect-ratio': ratioToCssValue(args.aspectRatio),
      '--planner-media-card-width': `${ratioCardWidth(args.aspectRatio)}px`,
    }) as CSSProperties,
    [args.aspectRatio],
  );

  return {
    plannerMode,
    plannerDoc,
    refinement,
    runtimeState,
    displayState,
    pointCost,
    mediaCardStyle,
  };
}
