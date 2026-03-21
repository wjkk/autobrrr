'use client';

import { useCallback } from 'react';

import { buildPlannerNoticeFromError } from '../lib/planner-notice';
import type { PlannerPageData } from '../lib/planner-page-data';
import type { PlannerEpisodeDraft, PlannerHistoryVersionView, PlannerMode } from '../lib/planner-page-helpers';
import type { ApiPlannerDebugApplySource } from '../lib/planner-api';
import type { PlannerNoticeInput } from '../lib/planner-notice';
import type { PlannerSaveState } from './use-planner-document-persistence';
import type {
  PlannerDialogState,
  PlannerDocumentState,
  PlannerThreadState,
} from './planner-page-state-slices';
import { usePlannerPageSections } from './use-planner-page-sections';
import {
  buildPlannerDialogSection,
  buildPlannerDocumentSection,
  buildPlannerShellSection,
  buildPlannerThreadSection,
} from './planner-page-section-builders';

export function usePlannerPageSectionState(args: {
  shell: {
    runtimeEnabled: boolean;
    studio: PlannerPageData;
    plannerMode: PlannerMode;
    displayTitle: string;
    activeEpisodeId: string;
    setActiveEpisodeId: React.Dispatch<React.SetStateAction<string>>;
    plannerEpisodes: PlannerEpisodeDraft[];
    activeEpisodeNumber: number;
    activeEpisodeTitle: string;
    fallbackEpisodeTitle: string;
    saveState: PlannerSaveState;
    latestExecutionMode: 'live' | 'fallback' | null;
    activeDebugApplySource: ApiPlannerDebugApplySource | null;
    historyMenuOpen: boolean;
    setHistoryMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
    historyVersions: PlannerHistoryVersionView[];
    historyActiveVersionId: string | null;
    openDebugRun: (debugRunId: string) => void;
    activateHistoryVersion: (versionId: string) => Promise<unknown>;
    usingRuntimePlanner: boolean;
    selectVersion: (versionId: string) => void;
    setNotice: (message: PlannerNoticeInput) => void;
    openAgentDebug: () => void;
    backToExplore: () => void;
  };
  thread: PlannerThreadState;
  document: PlannerDocumentState;
  dialogs: PlannerDialogState;
}) {
  const handleSelectHistoryVersion = useCallback(async (versionId: string) => {
    if (args.shell.usingRuntimePlanner) {
      try {
        await args.shell.activateHistoryVersion(versionId);
      } catch (error) {
        args.shell.setNotice(buildPlannerNoticeFromError(error, '切换策划版本失败。'));
      } finally {
        args.shell.setHistoryMenuOpen(false);
      }
      return;
    }

    args.shell.selectVersion(versionId);
    args.shell.setHistoryMenuOpen(false);
  }, [args]);

  return usePlannerPageSections({
    shell: buildPlannerShellSection({
      plannerMode: args.shell.plannerMode,
      displayTitle: args.shell.displayTitle,
      brief: args.shell.studio.project.brief,
      runtimeEnabled: args.shell.runtimeEnabled,
      openAgentDebug: args.shell.openAgentDebug,
      backToExplore: args.shell.backToExplore,
      activeEpisodeId: args.shell.activeEpisodeId,
      setActiveEpisodeId: args.shell.setActiveEpisodeId,
      plannerEpisodes: args.shell.plannerEpisodes,
      activeEpisodeNumber: args.shell.activeEpisodeNumber,
      activeEpisodeTitle: args.shell.activeEpisodeTitle,
      fallbackEpisodeTitle: args.shell.fallbackEpisodeTitle,
      saveState: args.shell.saveState,
      latestExecutionMode: args.shell.latestExecutionMode,
      activeDebugApplySource: args.shell.activeDebugApplySource,
      historyMenuOpen: args.shell.historyMenuOpen,
      historyVersions: args.shell.historyVersions,
      historyActiveVersionId: args.shell.historyActiveVersionId,
      openDebugRun: args.shell.openDebugRun,
      toggleHistoryMenu: () => args.shell.setHistoryMenuOpen((current) => !current),
      handleSelectHistoryVersion,
    }),
    thread: buildPlannerThreadSection(args.thread),
    document: buildPlannerDocumentSection(args.document),
    dialogs: buildPlannerDialogSection(args.dialogs),
  });
}
