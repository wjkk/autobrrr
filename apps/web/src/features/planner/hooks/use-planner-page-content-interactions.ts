'use client';

import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type { Dispatch, SetStateAction } from 'react';

import type { ApiPlannerWorkspace, PlannerRuntimeApiContext } from '../lib/planner-api';
import type { PlannerNoticeInput } from '../lib/planner-notice';
import type { PlannerStructuredDoc } from '../lib/planner-structured-doc';
import type { PlannerThreadMessage } from '../lib/planner-thread';
import { usePlannerComposerActions } from './use-planner-composer-actions';
import { usePlannerCreationFlow } from './use-planner-creation-flow';
import { usePlannerShotActions } from './use-planner-shot-actions';
import { usePlannerShotEditor } from './use-planner-shot-editor';
import { usePlannerShotPromptPreview } from './use-planner-shot-prompt-preview';

export function usePlannerPageContentInteractions(args: {
  router: AppRouterInstance;
  runtimeApi?: PlannerRuntimeApiContext;
  runtimeWorkspace: ApiPlannerWorkspace | null;
  runtimeActiveOutline: ApiPlannerWorkspace['activeOutline'];
  runtimeActiveRefinement: ApiPlannerWorkspace['activeRefinement'];
  plannerDoc: ReturnType<typeof import('../lib/planner-defaults').createEmptyPlannerSeedData>;
  structuredPlannerDoc: PlannerStructuredDoc | null;
  displayScriptActs: ReturnType<typeof import('./use-planner-display-state').usePlannerDisplayState>['displayScriptActs'];
  displayVersionStatus: ReturnType<typeof import('./use-planner-display-state').usePlannerDisplayState>['displayVersionStatus'];
  remainingPoints: number;
  pointCost: number;
  storyboardModelId: string;
  studioProjectId: string;
  plannerSubmitting: boolean;
  outlineConfirmed: boolean;
  requirement: string;
  refreshPlannerWorkspace: () => Promise<ApiPlannerWorkspace | null>;
  ensureEditableRuntimeRefinement: () => Promise<ApiPlannerWorkspace | null>;
  submitPlannerRunViaApi: ReturnType<typeof import('./use-planner-run-submission').usePlannerRunSubmission>['submitPlannerRunViaApi'];
  submitPartialRerunViaApi: ReturnType<typeof import('./use-planner-run-submission').usePlannerRunSubmission>['submitPartialRerunViaApi'];
  submitPlannerImageGenerationViaApi: ReturnType<typeof import('./use-planner-run-submission').usePlannerRunSubmission>['submitPlannerImageGenerationViaApi'];
  persistPlannerDoc: ReturnType<typeof import('./use-planner-document-persistence').usePlannerDocumentPersistence>['persistPlannerDoc'];
  startRefinement: ReturnType<typeof import('./use-planner-refinement').usePlannerRefinement>['startRefinement'];
  hydrateReadyVersion: ReturnType<typeof import('./use-planner-refinement').usePlannerRefinement>['hydrateReadyVersion'];
  selectVersion: ReturnType<typeof import('./use-planner-refinement').usePlannerRefinement>['selectVersion'];
  updateShot: ReturnType<typeof import('./use-planner-refinement').usePlannerRefinement>['updateShot'];
  deleteShot: ReturnType<typeof import('./use-planner-refinement').usePlannerRefinement>['deleteShot'];
  setPlannerSubmitting: (value: boolean) => void;
  setNotice: (message: PlannerNoticeInput) => void;
  setHistoryMenuOpen: (value: boolean) => void;
  setOutlineConfirmed: (value: boolean) => void;
  setMessages: Dispatch<SetStateAction<PlannerThreadMessage[]>>;
  nextLocalId: typeof import('../lib/planner-page-helpers').nextLocalId;
}) {
  const shotEditor = usePlannerShotEditor({
    displayScriptActs: args.displayScriptActs,
  });

  const shotPromptPreviewState = usePlannerShotPromptPreview({
    runtimeApi: args.runtimeApi,
    runtimeActiveRefinementId: args.runtimeActiveRefinement?.id ?? null,
    displayScriptActs: args.displayScriptActs,
    storyboardModelId: args.storyboardModelId,
  });

  const composerActions = usePlannerComposerActions({
    runtimeApi: args.runtimeApi,
    runtimeActiveOutlineId: args.runtimeActiveOutline?.id ?? null,
    outlineConfirmed: args.outlineConfirmed,
    plannerSubmitting: args.plannerSubmitting,
    requirement: args.requirement,
    refreshPlannerWorkspace: args.refreshPlannerWorkspace,
    submitPlannerRunViaApi: args.submitPlannerRunViaApi,
    startRefinement: args.startRefinement,
    hydrateReadyVersion: args.hydrateReadyVersion,
    selectVersion: args.selectVersion,
    setHistoryMenuOpen: args.setHistoryMenuOpen,
    setPlannerSubmitting: args.setPlannerSubmitting,
    setOutlineConfirmed: args.setOutlineConfirmed,
    setMessages: args.setMessages,
    setNotice: args.setNotice,
    nextLocalId: args.nextLocalId,
  });

  const shotActions = usePlannerShotActions({
    runtimeApi: args.runtimeApi,
    runtimeActiveRefinement: args.runtimeActiveRefinement,
    editingShot: shotEditor.editingShot,
    shotDraft: shotEditor.shotDraft,
    shotDeleteDialog: shotEditor.shotDeleteDialog,
    displayScriptActs: args.displayScriptActs,
    plannerDoc: args.plannerDoc,
    structuredPlannerDoc: args.structuredPlannerDoc,
    persistPlannerDoc: args.persistPlannerDoc,
    ensureEditableRuntimeRefinement: args.ensureEditableRuntimeRefinement,
    refreshPlannerWorkspace: args.refreshPlannerWorkspace,
    submitPartialRerunViaApi: args.submitPartialRerunViaApi,
    submitPlannerImageGenerationViaApi: args.submitPlannerImageGenerationViaApi,
    cancelShotInlineEditor: shotEditor.cancelShotInlineEditor,
    closeShotDeleteDialog: shotEditor.closeShotDeleteDialog,
    setPlannerSubmitting: args.setPlannerSubmitting,
    setNotice: args.setNotice,
    updateShot: args.updateShot,
    deleteShot: args.deleteShot,
  });

  const creationFlow = usePlannerCreationFlow({
    router: args.router,
    runtimeApi: args.runtimeApi,
    runtimeWorkspace: args.runtimeWorkspace,
    runtimeActiveRefinement: args.runtimeActiveRefinement,
    displayVersionStatus: args.displayVersionStatus,
    displayScriptActs: args.displayScriptActs,
    remainingPoints: args.remainingPoints,
    pointCost: args.pointCost,
    storyboardModelId: args.storyboardModelId,
    studioProjectId: args.studioProjectId,
    refreshPlannerWorkspace: args.refreshPlannerWorkspace,
    setNotice: args.setNotice,
  });

  return {
    shotEditor,
    shotPromptPreviewState,
    composerActions,
    shotActions,
    creationFlow,
  };
}
