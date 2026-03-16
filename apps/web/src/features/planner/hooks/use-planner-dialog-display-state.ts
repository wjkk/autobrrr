'use client';

import { useMemo } from 'react';

import type { ApiPlannerWorkspace } from '../lib/planner-api';
import {
  buildPlannerAssetThumbCandidates,
  SCENE_IMAGE_POOL,
  SUBJECT_IMAGE_POOL,
  type PlannerRuntimeAssetOption,
} from '../lib/planner-page-helpers';
import type { SekoImageCard } from '../lib/seko-plan-data';

interface UsePlannerDialogDisplayStateOptions {
  runtimeWorkspace: ApiPlannerWorkspace | null;
  plannerImageAssets: PlannerRuntimeAssetOption[];
  displaySubjectCards: SekoImageCard[];
  displaySceneCards: SekoImageCard[];
  subjectDialogCardId: string | null;
  sceneDialogCardId: string | null;
  subjectImageDraft: string;
  subjectAssetDraftId: string | null;
  sceneImageDraft: string;
  sceneAssetDraftId: string | null;
}

export function usePlannerDialogDisplayState(options: UsePlannerDialogDisplayStateOptions) {
  const activeSubjectCard = useMemo(() => {
    if (!options.subjectDialogCardId) {
      return null;
    }

    return options.displaySubjectCards.find((item) => item.id === options.subjectDialogCardId) ?? null;
  }, [options.displaySubjectCards, options.subjectDialogCardId]);

  const activeRuntimeSubject = useMemo(() => {
    if (!options.subjectDialogCardId) {
      return null;
    }
    return options.runtimeWorkspace?.subjects?.find((item) => item.id === options.subjectDialogCardId) ?? null;
  }, [options.runtimeWorkspace?.subjects, options.subjectDialogCardId]);

  const activeSceneCard = useMemo(() => {
    if (!options.sceneDialogCardId) {
      return null;
    }

    return options.displaySceneCards.find((item) => item.id === options.sceneDialogCardId) ?? null;
  }, [options.displaySceneCards, options.sceneDialogCardId]);

  const activeRuntimeScene = useMemo(() => {
    if (!options.sceneDialogCardId) {
      return null;
    }
    return options.runtimeWorkspace?.scenes?.find((item) => item.id === options.sceneDialogCardId) ?? null;
  }, [options.runtimeWorkspace?.scenes, options.sceneDialogCardId]);

  const subjectAssetThumbs = useMemo(
    () =>
      buildPlannerAssetThumbCandidates({
        linkedAssets: [
          ...(activeRuntimeSubject?.generatedAssets ?? []),
          ...(activeRuntimeSubject?.referenceAssets ?? []),
        ],
        availableAssets: options.plannerImageAssets,
        fallbackImages: SUBJECT_IMAGE_POOL,
        activeImage: options.subjectImageDraft || activeSubjectCard?.image || null,
        fallbackPrefix: 'subject-thumb',
      }),
    [activeRuntimeSubject?.generatedAssets, activeRuntimeSubject?.referenceAssets, activeSubjectCard?.image, options.plannerImageAssets, options.subjectImageDraft],
  );

  const sceneAssetThumbs = useMemo(
    () =>
      buildPlannerAssetThumbCandidates({
        linkedAssets: [
          ...(activeRuntimeScene?.generatedAssets ?? []),
          ...(activeRuntimeScene?.referenceAssets ?? []),
        ],
        availableAssets: options.plannerImageAssets,
        fallbackImages: SCENE_IMAGE_POOL,
        activeImage: options.sceneImageDraft || activeSceneCard?.image || null,
        fallbackPrefix: 'scene-thumb',
      }),
    [activeRuntimeScene?.generatedAssets, activeRuntimeScene?.referenceAssets, activeSceneCard?.image, options.plannerImageAssets, options.sceneImageDraft],
  );

  const activeSubjectAssetLabel = useMemo(() => {
    const selectedThumb = subjectAssetThumbs.find((image) =>
      image.assetId ? image.assetId === options.subjectAssetDraftId : !options.subjectAssetDraftId && (options.subjectImageDraft || activeSubjectCard?.image) === image.image,
    );
    return selectedThumb?.label ?? '可选择项目图片素材或占位图';
  }, [activeSubjectCard?.image, options.subjectAssetDraftId, options.subjectImageDraft, subjectAssetThumbs]);

  const activeSceneAssetLabel = useMemo(() => {
    const selectedThumb = sceneAssetThumbs.find((image) =>
      image.assetId ? image.assetId === options.sceneAssetDraftId : !options.sceneAssetDraftId && (options.sceneImageDraft || activeSceneCard?.image) === image.image,
    );
    return selectedThumb?.label ?? '可选择项目图片素材或占位图';
  }, [activeSceneCard?.image, options.sceneAssetDraftId, options.sceneImageDraft, sceneAssetThumbs]);

  return {
    activeSubjectCard,
    activeRuntimeSubject,
    activeSceneCard,
    activeRuntimeScene,
    subjectAssetThumbs,
    sceneAssetThumbs,
    activeSubjectAssetLabel,
    activeSceneAssetLabel,
  };
}
