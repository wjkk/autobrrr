'use client';

import { useCallback, useState } from 'react';

import type { ApiPlannerWorkspace } from '../lib/planner-api';
import type { SekoImageCard } from '../lib/seko-plan-data';

interface UsePlannerAssetDraftsOptions {
  displaySubjectCards: SekoImageCard[];
  displaySceneCards: SekoImageCard[];
  runtimeSubjects?: ApiPlannerWorkspace['subjects'];
  runtimeScenes?: ApiPlannerWorkspace['scenes'];
}

export function usePlannerAssetDrafts(options: UsePlannerAssetDraftsOptions) {
  const [subjectDialogCardId, setSubjectDialogCardId] = useState<string | null>(null);
  const [subjectNameDraft, setSubjectNameDraft] = useState('');
  const [subjectPromptDraft, setSubjectPromptDraft] = useState('');
  const [subjectImageDraft, setSubjectImageDraft] = useState('');
  const [subjectAdjustMode, setSubjectAdjustMode] = useState<'upload' | 'ai'>('ai');
  const [subjectAssetDraftId, setSubjectAssetDraftId] = useState<string | null>(null);

  const [sceneDialogCardId, setSceneDialogCardId] = useState<string | null>(null);
  const [sceneNameDraft, setSceneNameDraft] = useState('');
  const [scenePromptDraft, setScenePromptDraft] = useState('');
  const [sceneImageDraft, setSceneImageDraft] = useState('');
  const [sceneAdjustMode, setSceneAdjustMode] = useState<'upload' | 'ai'>('ai');
  const [sceneAssetDraftId, setSceneAssetDraftId] = useState<string | null>(null);

  const openSubjectAdjustDialog = useCallback((cardId: string) => {
    const target = options.displaySubjectCards.find((item) => item.id === cardId);
    const runtimeTarget = options.runtimeSubjects?.find((item) => item.id === cardId) ?? null;
    if (!target) {
      return;
    }

    setSubjectDialogCardId(cardId);
    setSubjectNameDraft(target.title);
    setSubjectPromptDraft(target.prompt);
    setSubjectImageDraft(target.image);
    setSubjectAssetDraftId(
      runtimeTarget?.generatedAssets?.[0]?.id
      ?? runtimeTarget?.referenceAssets?.[0]?.id
      ?? null,
    );
    setSubjectAdjustMode('ai');
  }, [options.displaySubjectCards, options.runtimeSubjects]);

  const closeSubjectAdjustDialog = useCallback(() => {
    setSubjectDialogCardId(null);
    setSubjectNameDraft('');
    setSubjectPromptDraft('');
    setSubjectImageDraft('');
    setSubjectAssetDraftId(null);
    setSubjectAdjustMode('ai');
  }, []);

  const openSceneAdjustDialog = useCallback((cardId: string) => {
    const target = options.displaySceneCards.find((item) => item.id === cardId);
    const runtimeTarget = options.runtimeScenes?.find((item) => item.id === cardId) ?? null;
    if (!target) {
      return;
    }

    setSceneDialogCardId(cardId);
    setSceneNameDraft(target.title);
    setScenePromptDraft(target.prompt);
    setSceneImageDraft(target.image);
    setSceneAssetDraftId(
      runtimeTarget?.generatedAssets?.[0]?.id
      ?? runtimeTarget?.referenceAssets?.[0]?.id
      ?? null,
    );
    setSceneAdjustMode('ai');
  }, [options.displaySceneCards, options.runtimeScenes]);

  const closeSceneAdjustDialog = useCallback(() => {
    setSceneDialogCardId(null);
    setSceneNameDraft('');
    setScenePromptDraft('');
    setSceneImageDraft('');
    setSceneAssetDraftId(null);
    setSceneAdjustMode('ai');
  }, []);

  return {
    subjectDialogCardId,
    subjectNameDraft,
    setSubjectNameDraft,
    subjectPromptDraft,
    setSubjectPromptDraft,
    subjectImageDraft,
    setSubjectImageDraft,
    subjectAdjustMode,
    setSubjectAdjustMode,
    subjectAssetDraftId,
    setSubjectAssetDraftId,
    openSubjectAdjustDialog,
    closeSubjectAdjustDialog,

    sceneDialogCardId,
    sceneNameDraft,
    setSceneNameDraft,
    scenePromptDraft,
    setScenePromptDraft,
    sceneImageDraft,
    setSceneImageDraft,
    sceneAdjustMode,
    setSceneAdjustMode,
    sceneAssetDraftId,
    setSceneAssetDraftId,
    openSceneAdjustDialog,
    closeSceneAdjustDialog,
  };
}
