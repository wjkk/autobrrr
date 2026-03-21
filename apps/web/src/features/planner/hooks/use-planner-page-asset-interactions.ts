'use client';

import type { MutableRefObject } from 'react';

import type { ApiPlannerAssetOption, ApiPlannerWorkspace, PlannerRuntimeApiContext } from '../lib/planner-api';
import type { PlannerNoticeInput } from '../lib/planner-notice';
import type { PlannerStructuredDoc } from '../lib/planner-structured-doc';
import { usePlannerAssetActions } from './use-planner-asset-actions';
import { usePlannerAssetDrafts } from './use-planner-asset-drafts';
import { usePlannerDialogDisplayState } from './use-planner-dialog-display-state';

export function usePlannerPageAssetInteractions(args: {
  runtimeApi?: PlannerRuntimeApiContext;
  runtimeWorkspace: ApiPlannerWorkspace | null;
  runtimeActiveRefinement: ApiPlannerWorkspace['activeRefinement'];
  plannerDoc: ReturnType<typeof import('../lib/planner-defaults').createEmptyPlannerSeedData>;
  structuredPlannerDoc: PlannerStructuredDoc | null;
  displaySubjectCards: ReturnType<typeof import('./use-planner-display-state').usePlannerDisplayState>['displaySubjectCards'];
  displaySceneCards: ReturnType<typeof import('./use-planner-display-state').usePlannerDisplayState>['displaySceneCards'];
  plannerImageAssets: ApiPlannerAssetOption[];
  subjectUploadInputRef: MutableRefObject<HTMLInputElement | null>;
  sceneUploadInputRef: MutableRefObject<HTMLInputElement | null>;
  refreshPlannerWorkspace: () => Promise<ApiPlannerWorkspace | null>;
  ensureEditableRuntimeRefinement: () => Promise<ApiPlannerWorkspace | null>;
  submitPartialRerunViaApi: ReturnType<typeof import('./use-planner-run-submission').usePlannerRunSubmission>['submitPartialRerunViaApi'];
  submitPlannerImageGenerationViaApi: ReturnType<typeof import('./use-planner-run-submission').usePlannerRunSubmission>['submitPlannerImageGenerationViaApi'];
  persistPlannerDoc: ReturnType<typeof import('./use-planner-document-persistence').usePlannerDocumentPersistence>['persistPlannerDoc'];
  updateSubject: ReturnType<typeof import('./use-planner-refinement').usePlannerRefinement>['updateSubject'];
  updateScene: ReturnType<typeof import('./use-planner-refinement').usePlannerRefinement>['updateScene'];
  setPlannerImageAssets: (updater: (current: ApiPlannerAssetOption[]) => ApiPlannerAssetOption[]) => void;
  setAssetUploadPending: (value: 'subject' | 'scene' | null) => void;
  setPlannerSubmitting: (value: boolean) => void;
  setNotice: (message: PlannerNoticeInput) => void;
}) {
  const assetDrafts = usePlannerAssetDrafts({
    displaySubjectCards: args.displaySubjectCards,
    displaySceneCards: args.displaySceneCards,
    runtimeSubjects: args.runtimeWorkspace?.subjects,
    runtimeScenes: args.runtimeWorkspace?.scenes,
  });

  const dialogDisplayState = usePlannerDialogDisplayState({
    runtimeWorkspace: args.runtimeWorkspace,
    plannerImageAssets: args.plannerImageAssets,
    displaySubjectCards: args.displaySubjectCards,
    displaySceneCards: args.displaySceneCards,
    subjectDialogCardId: assetDrafts.subjectDialogCardId,
    sceneDialogCardId: assetDrafts.sceneDialogCardId,
    subjectImageDraft: assetDrafts.subjectImageDraft,
    subjectAssetDraftId: assetDrafts.subjectAssetDraftId,
    sceneImageDraft: assetDrafts.sceneImageDraft,
    sceneAssetDraftId: assetDrafts.sceneAssetDraftId,
  });

  const assetActions = usePlannerAssetActions({
    common: {
      runtimeApi: args.runtimeApi,
      runtimeActiveRefinement: args.runtimeActiveRefinement,
      plannerDoc: args.plannerDoc,
      structuredPlannerDoc: args.structuredPlannerDoc,
      ensureEditableRuntimeRefinement: args.ensureEditableRuntimeRefinement,
      refreshPlannerWorkspace: args.refreshPlannerWorkspace,
      submitPartialRerunViaApi: args.submitPartialRerunViaApi,
      submitPlannerImageGenerationViaApi: args.submitPlannerImageGenerationViaApi,
      persistPlannerDoc: args.persistPlannerDoc,
      setPlannerImageAssets: args.setPlannerImageAssets,
      setAssetUploadPending: args.setAssetUploadPending,
      setPlannerSubmitting: args.setPlannerSubmitting,
      setNotice: args.setNotice,
    },
    subject: {
      dialogCardId: assetDrafts.subjectDialogCardId,
      nameDraft: assetDrafts.subjectNameDraft,
      promptDraft: assetDrafts.subjectPromptDraft,
      imageDraft: assetDrafts.subjectImageDraft,
      assetDraftId: assetDrafts.subjectAssetDraftId,
      setPromptDraft: assetDrafts.setSubjectPromptDraft,
      setImageDraft: assetDrafts.setSubjectImageDraft,
      setAssetDraftId: assetDrafts.setSubjectAssetDraftId,
      setAdjustMode: assetDrafts.setSubjectAdjustMode,
      closeAdjustDialog: assetDrafts.closeSubjectAdjustDialog,
      activeRuntimeEntity: dialogDisplayState.activeRuntimeSubject,
      displayCards: args.displaySubjectCards,
      updateEntity: args.updateSubject,
      resetUploadInput: () => {
        if (args.subjectUploadInputRef.current) {
          args.subjectUploadInputRef.current.value = '';
        }
      },
    },
    scene: {
      dialogCardId: assetDrafts.sceneDialogCardId,
      nameDraft: assetDrafts.sceneNameDraft,
      promptDraft: assetDrafts.scenePromptDraft,
      imageDraft: assetDrafts.sceneImageDraft,
      assetDraftId: assetDrafts.sceneAssetDraftId,
      setPromptDraft: assetDrafts.setScenePromptDraft,
      setImageDraft: assetDrafts.setSceneImageDraft,
      setAssetDraftId: assetDrafts.setSceneAssetDraftId,
      setAdjustMode: assetDrafts.setSceneAdjustMode,
      closeAdjustDialog: assetDrafts.closeSceneAdjustDialog,
      activeRuntimeEntity: dialogDisplayState.activeRuntimeScene,
      displayCards: args.displaySceneCards,
      updateEntity: args.updateScene,
      resetUploadInput: () => {
        if (args.sceneUploadInputRef.current) {
          args.sceneUploadInputRef.current.value = '';
        }
      },
    },
  });

  return {
    assetDrafts,
    dialogDisplayState,
    assetActions,
  };
}
