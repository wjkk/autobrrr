'use client';

import type { ApiPlannerWorkspace, PlannerRuntimeApiContext } from '../lib/planner-api';
import type { PlannerNoticeInput } from '../lib/planner-notice';
import type { PlannerStructuredDoc } from '../lib/planner-structured-doc';
import type { SekoImageCard, SekoPlanData } from '@aiv/mock-data';

import {
  usePlannerEntityAssetController,
  usePlannerEntityRecommendations,
} from './use-planner-entity-asset-actions';

type RuntimePlannerSubject = NonNullable<ApiPlannerWorkspace['subjects']>[number];
type RuntimePlannerScene = NonNullable<ApiPlannerWorkspace['scenes']>[number];

interface PlannerAssetActionCommonOptions {
  runtimeApi?: PlannerRuntimeApiContext;
  runtimeActiveRefinement: ApiPlannerWorkspace['activeRefinement'];
  plannerDoc: SekoPlanData;
  structuredPlannerDoc: PlannerStructuredDoc | null;
  ensureEditableRuntimeRefinement: () => Promise<ApiPlannerWorkspace | null>;
  refreshPlannerWorkspace: () => Promise<ApiPlannerWorkspace | null>;
  submitPartialRerunViaApi: (rerunScope: { type: 'subject'; subjectId: string } | { type: 'scene'; sceneId: string }, instruction: string) => Promise<boolean>;
  submitPlannerImageGenerationViaApi: (
    scope: 'subject_image' | 'scene_image',
    targetPath: string,
    prompt: string,
    referenceAssetIds?: string[],
  ) => Promise<boolean>;
  persistPlannerDoc: (nextDoc: PlannerStructuredDoc, successMessage: string) => Promise<void>;
  setPlannerImageAssets: (updater: (current: import('../lib/planner-api').ApiPlannerAssetOption[]) => import('../lib/planner-api').ApiPlannerAssetOption[]) => void;
  setAssetUploadPending: (value: 'subject' | 'scene' | null) => void;
  setPlannerSubmitting: (value: boolean) => void;
  setNotice: (message: PlannerNoticeInput) => void;
}

interface PlannerAssetActionEntityOptions<T extends RuntimePlannerSubject | RuntimePlannerScene> {
  dialogCardId: string | null;
  nameDraft: string;
  promptDraft: string;
  imageDraft: string;
  assetDraftId: string | null;
  setPromptDraft: (value: string) => void;
  setImageDraft: (value: string) => void;
  setAssetDraftId: (value: string | null) => void;
  setAdjustMode: (value: 'upload' | 'ai') => void;
  closeAdjustDialog: () => void;
  activeRuntimeEntity: T | null;
  displayCards: SekoImageCard[];
  updateEntity: (entityId: string, updater: (item: SekoImageCard) => SekoImageCard) => void;
  resetUploadInput: () => void;
}

interface UsePlannerAssetActionsOptions {
  common: PlannerAssetActionCommonOptions;
  subject: PlannerAssetActionEntityOptions<RuntimePlannerSubject>;
  scene: PlannerAssetActionEntityOptions<RuntimePlannerScene>;
}

export function usePlannerAssetActions(options: UsePlannerAssetActionsOptions) {
  const subjectRecommendationsState = usePlannerEntityRecommendations({
    runtimeApi: options.common.runtimeApi,
    runtimeActiveRefinementId: options.common.runtimeActiveRefinement?.id ?? null,
    entityKind: 'subject',
    entityId: options.subject.dialogCardId,
    setNotice: options.common.setNotice,
    failureMessage: '主体素材推荐获取失败。',
  });
  const sceneRecommendationsState = usePlannerEntityRecommendations({
    runtimeApi: options.common.runtimeApi,
    runtimeActiveRefinementId: options.common.runtimeActiveRefinement?.id ?? null,
    entityKind: 'scene',
    entityId: options.scene.dialogCardId,
    setNotice: options.common.setNotice,
    failureMessage: '场景素材推荐获取失败。',
  });

  const subjectActions = usePlannerEntityAssetController({
    common: {
      ...options.common,
      runtimeActiveRefinementId: options.common.runtimeActiveRefinement?.id ?? null,
    },
    draft: {
      dialogCardId: options.subject.dialogCardId,
      nameDraft: options.subject.nameDraft,
      promptDraft: options.subject.promptDraft,
      imageDraft: options.subject.imageDraft,
      assetDraftId: options.subject.assetDraftId,
      setPromptDraft: options.subject.setPromptDraft,
      setImageDraft: options.subject.setImageDraft,
      setAssetDraftId: options.subject.setAssetDraftId,
      setAdjustMode: options.subject.setAdjustMode,
      closeDialog: options.subject.closeAdjustDialog,
    },
    runtime: {
      activeRuntimeEntity: options.subject.activeRuntimeEntity,
      displayCards: options.subject.displayCards,
      updateEntity: options.subject.updateEntity,
    },
    behavior: {
      kind: 'subject',
      imageScope: 'subject_image',
      entityPath: 'subjects',
      uploadPendingKey: 'subject',
      recommendationFailureMessage: '主体素材推荐获取失败。',
      uploadSuccessMessage: '主体参考图已上传。',
      uploadFailureMessage: '主体参考图上传失败。',
      updateSuccessMessage: '主体设定已更新。',
      updateFailureMessage: '主体设定更新失败。',
      persistSuccessMessage: '主体图片已更新。',
      rerunSuccessMessage: '已提交主体局部重写任务。',
      rerunFailureMessage: '主体局部重写失败。',
      imageSuccessMessage: '已提交主体图片生成任务。',
      imageFailureMessage: '主体图片生成失败。',
      buildPatchBody: ({ name, prompt }) => ({
        name: name || undefined,
        appearance: prompt || undefined,
        prompt: prompt || undefined,
      }),
      buildRerunScope: (entityId) => ({ type: 'subject', subjectId: entityId }),
      updateDoc: (doc, cards) => ({
        ...doc,
        subjects: cards,
      }),
    },
    resetUploadInput: options.subject.resetUploadInput,
  });

  const sceneActions = usePlannerEntityAssetController({
    common: {
      ...options.common,
      runtimeActiveRefinementId: options.common.runtimeActiveRefinement?.id ?? null,
    },
    draft: {
      dialogCardId: options.scene.dialogCardId,
      nameDraft: options.scene.nameDraft,
      promptDraft: options.scene.promptDraft,
      imageDraft: options.scene.imageDraft,
      assetDraftId: options.scene.assetDraftId,
      setPromptDraft: options.scene.setPromptDraft,
      setImageDraft: options.scene.setImageDraft,
      setAssetDraftId: options.scene.setAssetDraftId,
      setAdjustMode: options.scene.setAdjustMode,
      closeDialog: options.scene.closeAdjustDialog,
    },
    runtime: {
      activeRuntimeEntity: options.scene.activeRuntimeEntity,
      displayCards: options.scene.displayCards,
      updateEntity: options.scene.updateEntity,
    },
    behavior: {
      kind: 'scene',
      imageScope: 'scene_image',
      entityPath: 'scenes',
      uploadPendingKey: 'scene',
      recommendationFailureMessage: '场景素材推荐获取失败。',
      uploadSuccessMessage: '场景参考图已上传。',
      uploadFailureMessage: '场景参考图上传失败。',
      updateSuccessMessage: '场景设定已更新。',
      updateFailureMessage: '场景设定更新失败。',
      persistSuccessMessage: '场景图片已更新。',
      rerunSuccessMessage: '已提交场景局部重写任务。',
      rerunFailureMessage: '场景局部重写失败。',
      imageSuccessMessage: '已提交场景图片生成任务。',
      imageFailureMessage: '场景图片生成失败。',
      buildPatchBody: ({ name, prompt }) => ({
        name: name || undefined,
        description: prompt || undefined,
        prompt: prompt || undefined,
      }),
      buildRerunScope: (entityId) => ({ type: 'scene', sceneId: entityId }),
      updateDoc: (doc, cards) => ({
        ...doc,
        scenes: cards,
      }),
    },
    resetUploadInput: options.scene.resetUploadInput,
  });

  return {
    handleSubjectUpload: subjectActions.handleUpload,
    applySubjectAdjust: subjectActions.applyAdjust,
    applySubjectRecommendation: subjectActions.applyRecommendation,
    rerunSubjectAdjust: subjectActions.rerunAdjust,
    generateSubjectImage: subjectActions.generateImage,
    subjectRecommendations: subjectRecommendationsState.recommendations,
    subjectRecommendationsLoading: subjectRecommendationsState.recommendationsLoading,
    handleSceneUpload: sceneActions.handleUpload,
    applySceneAdjust: sceneActions.applyAdjust,
    applySceneRecommendation: sceneActions.applyRecommendation,
    rerunSceneAdjust: sceneActions.rerunAdjust,
    generateSceneImage: sceneActions.generateImage,
    sceneRecommendations: sceneRecommendationsState.recommendations,
    sceneRecommendationsLoading: sceneRecommendationsState.recommendationsLoading,
  };
}
