'use client';

import { useCallback } from 'react';

import {
  patchPlannerEntity,
  putPlannerEntity,
  uploadPlannerImageAsset,
  type ApiPlannerAssetOption,
  type ApiPlannerWorkspace,
  type PlannerRuntimeApiContext,
} from '../lib/planner-api';
import { buildPlannerNoticeFromError, type PlannerNoticeInput } from '../lib/planner-notice';
import type { PlannerStructuredDoc } from '../lib/planner-structured-doc';
import { toStructuredPlannerDoc } from '../lib/planner-structured-doc';
import type { SekoImageCard, SekoPlanData } from '../lib/seko-plan-data';

type RuntimePlannerSubject = NonNullable<ApiPlannerWorkspace['subjects']>[number];
type RuntimePlannerScene = NonNullable<ApiPlannerWorkspace['scenes']>[number];

interface UsePlannerAssetActionsOptions {
  runtimeApi?: PlannerRuntimeApiContext;
  runtimeActiveRefinement: ApiPlannerWorkspace['activeRefinement'];
  plannerDoc: SekoPlanData;
  structuredPlannerDoc: PlannerStructuredDoc | null;
  displaySubjectCards: SekoImageCard[];
  displaySceneCards: SekoImageCard[];
  activeRuntimeSubject: RuntimePlannerSubject | null;
  activeRuntimeScene: RuntimePlannerScene | null;
  subjectDialogCardId: string | null;
  subjectNameDraft: string;
  subjectPromptDraft: string;
  subjectImageDraft: string;
  subjectAssetDraftId: string | null;
  setSubjectImageDraft: (value: string) => void;
  setSubjectAssetDraftId: (value: string | null) => void;
  setSubjectAdjustMode: (value: 'upload' | 'ai') => void;
  closeSubjectAdjustDialog: () => void;
  sceneDialogCardId: string | null;
  sceneNameDraft: string;
  scenePromptDraft: string;
  sceneImageDraft: string;
  sceneAssetDraftId: string | null;
  setSceneImageDraft: (value: string) => void;
  setSceneAssetDraftId: (value: string | null) => void;
  setSceneAdjustMode: (value: 'upload' | 'ai') => void;
  closeSceneAdjustDialog: () => void;
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
  updateSubject: (subjectId: string, updater: (item: SekoImageCard) => SekoImageCard) => void;
  updateScene: (sceneId: string, updater: (item: SekoImageCard) => SekoImageCard) => void;
  setPlannerImageAssets: (updater: (current: ApiPlannerAssetOption[]) => ApiPlannerAssetOption[]) => void;
  setAssetUploadPending: (value: 'subject' | 'scene' | null) => void;
  setPlannerSubmitting: (value: boolean) => void;
  setNotice: (message: PlannerNoticeInput) => void;
  resetSubjectUploadInput: () => void;
  resetSceneUploadInput: () => void;
}

export function usePlannerAssetActions(options: UsePlannerAssetActionsOptions) {
  const handleSubjectUpload = useCallback(async (file: File | null) => {
    if (!file || !options.runtimeApi) {
      return;
    }

    options.setAssetUploadPending('subject');
    try {
      const uploadedAsset = await uploadPlannerImageAsset({
        projectId: options.runtimeApi.projectId,
        episodeId: options.runtimeApi.episodeId,
        file,
      });
      options.setPlannerImageAssets((current) => [
        uploadedAsset,
        ...current.filter((asset) => asset.id !== uploadedAsset.id),
      ]);
      options.setSubjectImageDraft(uploadedAsset.sourceUrl ?? '');
      options.setSubjectAssetDraftId(uploadedAsset.id);
      options.setSubjectAdjustMode('upload');
      options.setNotice('主体参考图已上传。');
    } catch (error) {
      options.setNotice(buildPlannerNoticeFromError(error, '主体参考图上传失败。'));
    } finally {
      options.setAssetUploadPending(null);
      options.resetSubjectUploadInput();
    }
  }, [options]);

  const applySubjectAdjust = useCallback(async () => {
    if (!options.subjectDialogCardId) {
      return;
    }

    if (options.runtimeApi && options.runtimeActiveRefinement) {
      try {
        await options.ensureEditableRuntimeRefinement();
        await patchPlannerEntity(
          `/api/planner/projects/${encodeURIComponent(options.runtimeApi.projectId)}/subjects/${encodeURIComponent(options.subjectDialogCardId)}`,
          {
            episodeId: options.runtimeApi.episodeId,
            name: options.subjectNameDraft.trim() || undefined,
            appearance: options.subjectPromptDraft.trim() || undefined,
            prompt: options.subjectPromptDraft.trim() || undefined,
          },
        );
        const isExistingGeneratedAsset = Boolean(
          options.subjectAssetDraftId && options.activeRuntimeSubject?.generatedAssets?.some((asset) => asset.id === options.subjectAssetDraftId),
        );
        await putPlannerEntity(
          `/api/planner/projects/${encodeURIComponent(options.runtimeApi.projectId)}/subjects/${encodeURIComponent(options.subjectDialogCardId)}/assets`,
          {
            episodeId: options.runtimeApi.episodeId,
            referenceAssetIds: options.subjectAssetDraftId && !isExistingGeneratedAsset ? [options.subjectAssetDraftId] : [],
            generatedAssetIds: options.subjectAssetDraftId && isExistingGeneratedAsset ? [options.subjectAssetDraftId] : [],
          },
        );
        await options.refreshPlannerWorkspace();
        options.setNotice('主体设定已更新。');
      } catch (error) {
        options.setNotice(buildPlannerNoticeFromError(error, '主体设定更新失败。'));
      }
      options.closeSubjectAdjustDialog();
      return;
    }

    const nextSubjects = options.displaySubjectCards.map((item) =>
      item.id === options.subjectDialogCardId
        ? {
            ...item,
            title: options.subjectNameDraft.trim() || item.title,
            prompt: options.subjectPromptDraft.trim() || item.prompt,
            image: options.subjectImageDraft || item.image,
          }
        : item,
    );

    options.updateSubject(options.subjectDialogCardId, (item) => ({
      ...item,
      title: options.subjectNameDraft.trim() || item.title,
      prompt: options.subjectPromptDraft.trim() || item.prompt,
      image: options.subjectImageDraft || item.image,
    }));

    await options.persistPlannerDoc(
      toStructuredPlannerDoc(
        {
          ...options.plannerDoc,
          subjects: nextSubjects,
        },
        options.structuredPlannerDoc,
      ),
      '主体图片已更新。',
    );
    options.closeSubjectAdjustDialog();
  }, [options]);

  const handleSceneUpload = useCallback(async (file: File | null) => {
    if (!file || !options.runtimeApi) {
      return;
    }

    options.setAssetUploadPending('scene');
    try {
      const uploadedAsset = await uploadPlannerImageAsset({
        projectId: options.runtimeApi.projectId,
        episodeId: options.runtimeApi.episodeId,
        file,
      });
      options.setPlannerImageAssets((current) => [
        uploadedAsset,
        ...current.filter((asset) => asset.id !== uploadedAsset.id),
      ]);
      options.setSceneImageDraft(uploadedAsset.sourceUrl ?? '');
      options.setSceneAssetDraftId(uploadedAsset.id);
      options.setSceneAdjustMode('upload');
      options.setNotice('场景参考图已上传。');
    } catch (error) {
      options.setNotice(buildPlannerNoticeFromError(error, '场景参考图上传失败。'));
    } finally {
      options.setAssetUploadPending(null);
      options.resetSceneUploadInput();
    }
  }, [options]);

  const applySceneAdjust = useCallback(async () => {
    if (!options.sceneDialogCardId) {
      return;
    }

    if (options.runtimeApi && options.runtimeActiveRefinement) {
      try {
        await options.ensureEditableRuntimeRefinement();
        await patchPlannerEntity(
          `/api/planner/projects/${encodeURIComponent(options.runtimeApi.projectId)}/scenes/${encodeURIComponent(options.sceneDialogCardId)}`,
          {
            episodeId: options.runtimeApi.episodeId,
            name: options.sceneNameDraft.trim() || undefined,
            description: options.scenePromptDraft.trim() || undefined,
            prompt: options.scenePromptDraft.trim() || undefined,
          },
        );
        const isExistingGeneratedAsset = Boolean(
          options.sceneAssetDraftId && options.activeRuntimeScene?.generatedAssets?.some((asset) => asset.id === options.sceneAssetDraftId),
        );
        await putPlannerEntity(
          `/api/planner/projects/${encodeURIComponent(options.runtimeApi.projectId)}/scenes/${encodeURIComponent(options.sceneDialogCardId)}/assets`,
          {
            episodeId: options.runtimeApi.episodeId,
            referenceAssetIds: options.sceneAssetDraftId && !isExistingGeneratedAsset ? [options.sceneAssetDraftId] : [],
            generatedAssetIds: options.sceneAssetDraftId && isExistingGeneratedAsset ? [options.sceneAssetDraftId] : [],
          },
        );
        await options.refreshPlannerWorkspace();
        options.setNotice('场景设定已更新。');
      } catch (error) {
        options.setNotice(buildPlannerNoticeFromError(error, '场景设定更新失败。'));
      }
      options.closeSceneAdjustDialog();
      return;
    }

    const nextScenes = options.displaySceneCards.map((item) =>
      item.id === options.sceneDialogCardId
        ? {
            ...item,
            title: options.sceneNameDraft.trim() || item.title,
            prompt: options.scenePromptDraft.trim() || item.prompt,
            image: options.sceneImageDraft || item.image,
          }
        : item,
    );

    options.updateScene(options.sceneDialogCardId, (item) => ({
      ...item,
      title: options.sceneNameDraft.trim() || item.title,
      prompt: options.scenePromptDraft.trim() || item.prompt,
      image: options.sceneImageDraft || item.image,
    }));

    await options.persistPlannerDoc(
      toStructuredPlannerDoc(
        {
          ...options.plannerDoc,
          scenes: nextScenes,
        },
        options.structuredPlannerDoc,
      ),
      '场景图片已更新。',
    );
    options.closeSceneAdjustDialog();
  }, [options]);

  const rerunSubjectAdjust = useCallback(async () => {
    if (!options.runtimeApi || !options.subjectDialogCardId) {
      return;
    }

    try {
      await options.ensureEditableRuntimeRefinement();
      await options.submitPartialRerunViaApi(
        {
          type: 'subject',
          subjectId: options.subjectDialogCardId,
        },
        options.subjectPromptDraft.trim() || options.subjectNameDraft.trim(),
      );
      await options.refreshPlannerWorkspace();
      options.closeSubjectAdjustDialog();
      options.setNotice('已提交主体局部重写任务。');
    } catch (error) {
      options.setPlannerSubmitting(false);
      options.setNotice(buildPlannerNoticeFromError(error, '主体局部重写失败。'));
    }
  }, [options]);

  const generateSubjectImage = useCallback(async () => {
    if (!options.runtimeApi || !options.subjectDialogCardId) {
      return;
    }

    try {
      await options.ensureEditableRuntimeRefinement();
      await options.submitPlannerImageGenerationViaApi(
        'subject_image',
        `/api/planner/projects/${encodeURIComponent(options.runtimeApi.projectId)}/subjects/${encodeURIComponent(options.subjectDialogCardId)}/generate-image`,
        options.subjectPromptDraft.trim() || options.subjectNameDraft.trim(),
        options.subjectAssetDraftId ? [options.subjectAssetDraftId] : [],
      );
      await options.refreshPlannerWorkspace();
      options.setSubjectImageDraft('');
      options.setNotice('已提交主体图片生成任务。');
    } catch (error) {
      options.setPlannerSubmitting(false);
      options.setNotice(buildPlannerNoticeFromError(error, '主体图片生成失败。'));
    }
  }, [options]);

  const rerunSceneAdjust = useCallback(async () => {
    if (!options.runtimeApi || !options.sceneDialogCardId) {
      return;
    }

    try {
      await options.ensureEditableRuntimeRefinement();
      await options.submitPartialRerunViaApi(
        {
          type: 'scene',
          sceneId: options.sceneDialogCardId,
        },
        options.scenePromptDraft.trim() || options.sceneNameDraft.trim(),
      );
      await options.refreshPlannerWorkspace();
      options.closeSceneAdjustDialog();
      options.setNotice('已提交场景局部重写任务。');
    } catch (error) {
      options.setPlannerSubmitting(false);
      options.setNotice(buildPlannerNoticeFromError(error, '场景局部重写失败。'));
    }
  }, [options]);

  const generateSceneImage = useCallback(async () => {
    if (!options.runtimeApi || !options.sceneDialogCardId) {
      return;
    }

    try {
      await options.ensureEditableRuntimeRefinement();
      await options.submitPlannerImageGenerationViaApi(
        'scene_image',
        `/api/planner/projects/${encodeURIComponent(options.runtimeApi.projectId)}/scenes/${encodeURIComponent(options.sceneDialogCardId)}/generate-image`,
        options.scenePromptDraft.trim() || options.sceneNameDraft.trim(),
        options.sceneAssetDraftId ? [options.sceneAssetDraftId] : [],
      );
      await options.refreshPlannerWorkspace();
      options.setSceneImageDraft('');
      options.setNotice('已提交场景图片生成任务。');
    } catch (error) {
      options.setPlannerSubmitting(false);
      options.setNotice(buildPlannerNoticeFromError(error, '场景图片生成失败。'));
    }
  }, [options]);

  return {
    handleSubjectUpload,
    applySubjectAdjust,
    handleSceneUpload,
    applySceneAdjust,
    rerunSubjectAdjust,
    generateSubjectImage,
    rerunSceneAdjust,
    generateSceneImage,
  };
}
