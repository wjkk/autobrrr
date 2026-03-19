'use client';

import type { PlannerStepStatus } from '@aiv/domain';
import { useMemo } from 'react';

import type { ApiPlannerWorkspace } from '../lib/planner-api';
import {
  buildPlannerEpisodes,
  type PlannerHistoryVersionView,
  type PlannerMode,
  styleById,
  toHistoryVersions,
} from '../lib/planner-page-helpers';
import {
  runtimeScenesToImageCards,
  runtimeShotScriptsToActs,
  runtimeSubjectsToImageCards,
} from '../lib/planner-structured-doc';
import type { SekoActDraft, SekoImageCard, SekoPlanData } from '@aiv/mock-data';
import { sekoPlanThreadData } from '@aiv/mock-data';
import { findPlannerVideoModelOption } from '../lib/planner-video-model-options';

interface UsePlannerDisplayStateOptions {
  studioTitle: string;
  studioBrief: string;
  plannerMode: PlannerMode;
  plannerDoc: SekoPlanData;
  runtimeWorkspace: ApiPlannerWorkspace | null;
  runtimeActiveOutline: ApiPlannerWorkspace['activeOutline'];
  runtimeActiveRefinement: ApiPlannerWorkspace['activeRefinement'];
  streamSteps: Array<{ title: string; status: string; detail: Record<string, unknown> | null }>;
  activeEpisodeId: string;
  storyboardModelId: string;
  activeVersion: {
    status: string;
    progressPercent: number;
    steps: PlannerStepStatus[];
    sections: {
      summary: boolean;
      style: boolean;
      subjects: boolean;
      scenes: boolean;
      script: boolean;
    };
    subjectCards: SekoImageCard[];
    sceneCards: SekoImageCard[];
    scriptActs: SekoActDraft[];
  } | null;
  activeVersionId: string | null;
  versions: PlannerHistoryVersionView[];
  subjectImagePool: string[];
  sceneImagePool: string[];
}

export function usePlannerDisplayState(options: UsePlannerDisplayStateOptions) {
  const normalizeDisplayStatus = (status: string | null | undefined) => status?.toLowerCase() ?? null;

  const plannerEpisodes = useMemo(
    () => buildPlannerEpisodes(
      options.studioTitle,
      options.plannerMode,
      options.studioBrief,
      options.plannerDoc.episodeCount,
      options.plannerDoc.acts.reduce((sum, item) => sum + item.shots.length, 0),
    ),
    [options.plannerDoc.acts, options.plannerDoc.episodeCount, options.plannerMode, options.studioBrief, options.studioTitle],
  );

  const activeEpisode = useMemo(
    () => plannerEpisodes.find((item) => item.id === options.activeEpisodeId) ?? plannerEpisodes[0] ?? null,
    [plannerEpisodes, options.activeEpisodeId],
  );

  const activeStyle = useMemo(
    () => styleById(activeEpisode?.styleId ?? 61),
    [activeEpisode?.styleId],
  );

  const activeEpisodeNumber = useMemo(
    () => Number.parseInt(activeEpisode?.label.replace('EP ', '') ?? '1', 10),
    [activeEpisode?.label],
  );

  const usingRuntimePlanner = Boolean(options.runtimeWorkspace);
  const usingRuntimeDoc = Boolean(options.runtimeActiveRefinement || options.runtimeWorkspace?.activeOutline);

  const runtimeSubjectCards = useMemo(
    () => runtimeSubjectsToImageCards(options.runtimeWorkspace?.subjects ?? [], options.subjectImagePool),
    [options.runtimeWorkspace?.subjects, options.subjectImagePool],
  );
  const runtimeSceneCards = useMemo(
    () => runtimeScenesToImageCards(options.runtimeWorkspace?.scenes ?? [], options.sceneImagePool),
    [options.runtimeWorkspace?.scenes, options.sceneImagePool],
  );
  const runtimeScriptActs = useMemo(
    () => runtimeShotScriptsToActs(options.runtimeWorkspace?.shotScripts ?? [], options.runtimeWorkspace?.scenes ?? []),
    [options.runtimeWorkspace?.scenes, options.runtimeWorkspace?.shotScripts],
  );

  const displaySubjectCards =
    options.runtimeActiveRefinement && runtimeSubjectCards.length > 0
      ? runtimeSubjectCards
      : usingRuntimeDoc
        ? options.plannerDoc.subjects
        : options.activeVersion?.subjectCards ?? [];

  const displaySceneCards =
    options.runtimeActiveRefinement && runtimeSceneCards.length > 0
      ? runtimeSceneCards
      : usingRuntimeDoc
        ? options.plannerDoc.scenes
        : options.activeVersion?.sceneCards ?? [];

  const displayScriptActs =
    options.runtimeActiveRefinement && runtimeScriptActs.length > 0
      ? runtimeScriptActs
      : usingRuntimeDoc
        ? options.plannerDoc.acts
        : options.activeVersion?.scriptActs ?? [];

  const displaySections = usingRuntimeDoc
    ? {
        summary: options.plannerDoc.summaryBullets.length > 0,
        style: options.plannerDoc.styleBullets.length > 0,
        subjects: (options.runtimeActiveRefinement ? runtimeSubjectCards.length : options.plannerDoc.subjects.length) > 0,
        scenes: (options.runtimeActiveRefinement ? runtimeSceneCards.length : options.plannerDoc.scenes.length) > 0,
        script: (options.runtimeActiveRefinement ? runtimeScriptActs.length : options.plannerDoc.acts.length) > 0,
      }
    : options.activeVersion?.sections ?? {
        summary: false,
        style: false,
        subjects: false,
        scenes: false,
        script: false,
      };

  const displayVersionStatus = normalizeDisplayStatus(
    options.runtimeActiveRefinement?.status ?? options.runtimeWorkspace?.activeOutline?.status ?? options.activeVersion?.status ?? null,
  );
  const displayVersionProgress = options.runtimeActiveRefinement ? null : options.activeVersion?.progressPercent ?? null;
  const selectedStoryboardModel = findPlannerVideoModelOption(options.storyboardModelId);

  const shotTitleById = useMemo(
    () =>
      Object.fromEntries(
        displayScriptActs.flatMap((act) => act.shots.map((shot) => [shot.id, shot.title])),
      ) as Record<string, string>,
    [displayScriptActs],
  );

  const historyVersions = useMemo(
    () => toHistoryVersions({
      runtimeActiveRefinement: options.runtimeActiveRefinement,
      runtimeActiveOutline: options.runtimeActiveOutline,
      runtimeWorkspace: options.runtimeWorkspace,
      localVersions: options.versions,
    }),
    [options.runtimeActiveOutline, options.runtimeActiveRefinement, options.runtimeWorkspace, options.versions],
  );

  const historyActiveVersionId = options.runtimeActiveRefinement?.id ?? options.activeVersionId;
  const hasDisplayVersion = Boolean(options.runtimeActiveRefinement || options.runtimeWorkspace?.activeOutline || options.activeVersion);

  const refinementDetailSteps = useMemo(
    () =>
      (options.runtimeActiveRefinement || options.streamSteps.length > 0)
        ? options.streamSteps.map((step) => ({
            title: step.title,
            status: (step.status === 'done' || step.status === 'running' || step.status === 'waiting' || step.status === 'failed'
              ? step.status
              : 'waiting') as PlannerStepStatus,
            tags:
              step.detail && Array.isArray(step.detail.details)
                ? step.detail.details.filter((detail): detail is string => typeof detail === 'string')
                : [],
          }))
        : sekoPlanThreadData.refinementSteps.map((title, index) => ({
            title,
            status: options.activeVersion?.steps[index] ?? ('waiting' as PlannerStepStatus),
            tags: index === 2 ? ['设计角色特征'] : index === 3 ? ['设计短片主要场景细节'] : [],
          })),
    [options.activeVersion, options.runtimeActiveRefinement, options.streamSteps],
  );

  return {
    plannerEpisodes,
    activeEpisode,
    activeStyle,
    activeEpisodeNumber,
    usingRuntimePlanner,
    displaySubjectCards,
    displaySceneCards,
    displayScriptActs,
    displaySections,
    displayVersionStatus,
    displayVersionProgress,
    selectedStoryboardModel,
    shotTitleById,
    historyVersions,
    historyActiveVersionId,
    hasDisplayVersion,
    refinementDetailSteps,
  };
}
