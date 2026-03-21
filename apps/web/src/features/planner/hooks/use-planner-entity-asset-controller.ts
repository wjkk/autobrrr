'use client';

import { useCallback } from 'react';

import {
  patchPlannerEntity,
  putPlannerEntity,
  uploadPlannerImageAsset,
  type ApiPlannerEntityRecommendation,
} from '../lib/planner-api';
import { applyPlannerRecommendationDraft } from '../lib/planner-asset-recommendations';
import { buildPlannerNoticeFromError } from '../lib/planner-notice';
import { toStructuredPlannerDoc } from '../lib/planner-structured-doc';
import type { SekoImageCard } from '@aiv/mock-data';
import type {
  PlannerEntityBehaviorConfig,
  PlannerEntityCommonConfig,
  PlannerEntityDraftConfig,
  PlannerEntityRuntimeConfig,
} from './planner-entity-asset-types';

function buildUpdatedEntityCards(
  cards: SekoImageCard[],
  dialogCardId: string,
  nextName: string,
  nextPrompt: string,
  nextImage: string,
) {
  return cards.map((item) =>
    item.id === dialogCardId
      ? {
          ...item,
          title: nextName || item.title,
          prompt: nextPrompt || item.prompt,
          image: nextImage || item.image,
        }
      : item,
  );
}

export function usePlannerEntityAssetController(args: {
  common: PlannerEntityCommonConfig;
  draft: PlannerEntityDraftConfig;
  runtime: PlannerEntityRuntimeConfig;
  behavior: PlannerEntityBehaviorConfig;
  resetUploadInput: () => void;
}) {
  const handleUpload = useCallback(async (file: File | null) => {
    if (!file || !args.common.runtimeApi) {
      return;
    }

    args.common.setAssetUploadPending(args.behavior.uploadPendingKey);
    try {
      const uploadedAsset = await uploadPlannerImageAsset({
        projectId: args.common.runtimeApi.projectId,
        episodeId: args.common.runtimeApi.episodeId,
        file,
      });
      args.common.setPlannerImageAssets((current) => [
        uploadedAsset,
        ...current.filter((asset) => asset.id !== uploadedAsset.id),
      ]);
      args.draft.setImageDraft(uploadedAsset.sourceUrl ?? '');
      args.draft.setAssetDraftId(uploadedAsset.id);
      args.draft.setAdjustMode('upload');
      args.common.setNotice(args.behavior.uploadSuccessMessage);
    } catch (error) {
      args.common.setNotice(buildPlannerNoticeFromError(error, args.behavior.uploadFailureMessage));
    } finally {
      args.common.setAssetUploadPending(null);
      args.resetUploadInput();
    }
  }, [args]);

  const applyAdjust = useCallback(async () => {
    if (!args.draft.dialogCardId) {
      return;
    }

    const nextName = args.draft.nameDraft.trim();
    const nextPrompt = args.draft.promptDraft.trim();

    if (args.common.runtimeApi && args.common.runtimeActiveRefinementId) {
      try {
        await args.common.ensureEditableRuntimeRefinement();
        await patchPlannerEntity(
          `/api/planner/projects/${encodeURIComponent(args.common.runtimeApi.projectId)}/${args.behavior.entityPath}/${encodeURIComponent(args.draft.dialogCardId)}`,
          {
            episodeId: args.common.runtimeApi.episodeId,
            ...args.behavior.buildPatchBody({ name: nextName, prompt: nextPrompt }),
          },
        );
        const isExistingGeneratedAsset = Boolean(
          args.draft.assetDraftId && args.runtime.activeRuntimeEntity?.generatedAssets?.some((asset) => asset.id === args.draft.assetDraftId),
        );
        await putPlannerEntity(
          `/api/planner/projects/${encodeURIComponent(args.common.runtimeApi.projectId)}/${args.behavior.entityPath}/${encodeURIComponent(args.draft.dialogCardId)}/assets`,
          {
            episodeId: args.common.runtimeApi.episodeId,
            referenceAssetIds: args.draft.assetDraftId && !isExistingGeneratedAsset ? [args.draft.assetDraftId] : [],
            generatedAssetIds: args.draft.assetDraftId && isExistingGeneratedAsset ? [args.draft.assetDraftId] : [],
          },
        );
        await args.common.refreshPlannerWorkspace();
        args.common.setNotice(args.behavior.updateSuccessMessage);
      } catch (error) {
        args.common.setNotice(buildPlannerNoticeFromError(error, args.behavior.updateFailureMessage));
      }
      args.draft.closeDialog();
      return;
    }

    const nextCards = buildUpdatedEntityCards(
      args.runtime.displayCards,
      args.draft.dialogCardId,
      nextName,
      nextPrompt,
      args.draft.imageDraft,
    );

    args.runtime.updateEntity(args.draft.dialogCardId, (item) => ({
      ...item,
      title: nextName || item.title,
      prompt: nextPrompt || item.prompt,
      image: args.draft.imageDraft || item.image,
    }));

    await args.common.persistPlannerDoc(
      toStructuredPlannerDoc(args.behavior.updateDoc(args.common.plannerDoc, nextCards), args.common.structuredPlannerDoc),
      args.behavior.persistSuccessMessage,
    );
    args.draft.closeDialog();
  }, [args]);

  const applyRecommendation = useCallback((recommendation: ApiPlannerEntityRecommendation) => {
    const nextDraft = applyPlannerRecommendationDraft(recommendation);
    args.draft.setPromptDraft(nextDraft.prompt);
    args.draft.setAdjustMode(nextDraft.promptMode);
    args.draft.setAssetDraftId(nextDraft.assetId);
    if (nextDraft.image) {
      args.draft.setImageDraft(nextDraft.image);
    }
  }, [args]);

  const rerunAdjust = useCallback(async () => {
    if (!args.common.runtimeApi || !args.draft.dialogCardId) {
      return;
    }

    try {
      await args.common.ensureEditableRuntimeRefinement();
      await args.common.submitPartialRerunViaApi(
        args.behavior.buildRerunScope(args.draft.dialogCardId),
        args.draft.promptDraft.trim() || args.draft.nameDraft.trim(),
      );
      await args.common.refreshPlannerWorkspace();
      args.draft.closeDialog();
      args.common.setNotice(args.behavior.rerunSuccessMessage);
    } catch (error) {
      args.common.setPlannerSubmitting(false);
      args.common.setNotice(buildPlannerNoticeFromError(error, args.behavior.rerunFailureMessage));
    }
  }, [args]);

  const generateImage = useCallback(async () => {
    if (!args.common.runtimeApi || !args.draft.dialogCardId) {
      return;
    }

    try {
      await args.common.ensureEditableRuntimeRefinement();
      await args.common.submitPlannerImageGenerationViaApi(
        args.behavior.imageScope,
        `/api/planner/projects/${encodeURIComponent(args.common.runtimeApi.projectId)}/${args.behavior.entityPath}/${encodeURIComponent(args.draft.dialogCardId)}/generate-image`,
        args.draft.promptDraft.trim() || args.draft.nameDraft.trim(),
        args.draft.assetDraftId ? [args.draft.assetDraftId] : [],
      );
      await args.common.refreshPlannerWorkspace();
      args.draft.setImageDraft('');
      args.common.setNotice(args.behavior.imageSuccessMessage);
    } catch (error) {
      args.common.setPlannerSubmitting(false);
      args.common.setNotice(buildPlannerNoticeFromError(error, args.behavior.imageFailureMessage));
    }
  }, [args]);

  return {
    handleUpload,
    applyAdjust,
    applyRecommendation,
    rerunAdjust,
    generateImage,
  };
}
