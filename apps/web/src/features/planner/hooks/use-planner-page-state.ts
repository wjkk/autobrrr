'use client';

import type { ApiPlannerWorkspace, PlannerRuntimeApiContext } from '../lib/planner-api';
import { buildPlannerNoticeFromError, toPlannerNotice, type PlannerNotice, type PlannerNoticeInput } from '../lib/planner-notice';
import type { PlannerPageData } from '../lib/planner-page-data';
import {
  mapWorkspaceMessagesToThread,
  nextLocalId,
  ratioCardWidth,
  ratioToCssValue,
  readPreferredStoryboardModelId,
  SCENE_IMAGE_POOL,
  SUBJECT_IMAGE_POOL,
  type PlannerAssetRatio,
  type PlannerMode,
  type PlannerRuntimeAssetOption,
} from '../lib/planner-page-helpers';
import type { PlannerStructuredDoc } from '../lib/planner-structured-doc';
import { outlineToPreviewStructuredPlannerDoc, toPlannerSeedData } from '../lib/planner-structured-doc';
import { usePlannerRefinement, type PlannerRefinementTrigger } from './use-planner-refinement';
import { usePlannerAssetActions } from './use-planner-asset-actions';
import { usePlannerAssetDrafts } from './use-planner-asset-drafts';
import { usePlannerComposerActions } from './use-planner-composer-actions';
import { usePlannerCreationFlow } from './use-planner-creation-flow';
import { usePlannerDialogDisplayState } from './use-planner-dialog-display-state';
import { usePlannerDisplayState } from './use-planner-display-state';
import { usePlannerDocumentPersistence } from './use-planner-document-persistence';
import { usePlannerRunSubmission } from './use-planner-run-submission';
import { usePlannerRuntimeWorkspace } from './use-planner-runtime-workspace';
import { usePlannerShotActions } from './use-planner-shot-actions';
import { usePlannerShotEditor } from './use-planner-shot-editor';
import { usePlannerShotPromptPreview } from './use-planner-shot-prompt-preview';
import { usePlannerStream } from './use-planner-stream';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { sekoPlanData, sekoPlanThreadData } from '@aiv/mock-data';

import { buildPlannerDebugSearch } from '@/features/planner-debug/lib/planner-debug-runtime';
import type { PlannerThreadMessage } from '../lib/planner-thread';

export interface UsePlannerPageStateOptions {
  studio: PlannerPageData;
  runtimeApi?: PlannerRuntimeApiContext;
  initialGeneratedText?: string | null;
  initialStructuredDoc?: PlannerStructuredDoc | null;
  initialPlannerReady?: boolean;
  initialWorkspace?: ApiPlannerWorkspace | null;
}

function isRefinementRunTrigger(trigger: string) {
  return trigger === 'confirm_outline'
    || trigger === 'rerun'
    || trigger === 'subject'
    || trigger === 'scene'
    || trigger === 'shot'
    || trigger === 'act';
}

function buildRunNotice(trigger: string, hasActiveRefinement: boolean) {
  if (hasActiveRefinement) {
    if (trigger === 'confirm_outline') {
      return '已完成细化并更新策划文档。';
    }
    if (trigger === 'subject') {
      return '已按要求局部重写主体并更新策划文档。';
    }
    if (trigger === 'scene') {
      return '已按要求局部重写场景并更新策划文档。';
    }
    if (trigger === 'shot') {
      return '已按要求局部重写分镜并更新策划文档。';
    }
    if (trigger === 'act') {
      return '已按要求局部重写幕内内容并更新策划文档。';
    }
    if (trigger === 'subject_image') {
      return '已生成主体图片并回写到策划文档。';
    }
    if (trigger === 'scene_image') {
      return '已生成场景图片并回写到策划文档。';
    }
    if (trigger === 'shot_image') {
      return '已生成分镜草图并回写到策划文档。';
    }
    return '已生成新的策划版本。';
  }

  return trigger === 'generate_outline' || trigger === 'update_outline'
    ? '已生成新的剧本大纲版本。'
    : '已生成剧本大纲，请确认后继续细化。';
}

export function usePlannerPageState(options: UsePlannerPageStateOptions) {
  const {
    studio,
    runtimeApi,
    initialGeneratedText,
    initialStructuredDoc,
    initialPlannerReady,
    initialWorkspace,
  } = options;

  const router = useRouter();
  const subjectUploadInputRef = useRef<HTMLInputElement | null>(null);
  const sceneUploadInputRef = useRef<HTMLInputElement | null>(null);

  const plannerMode: PlannerMode = studio.project.contentMode === 'series' ? 'series' : 'single';

  const [activeEpisodeId, setActiveEpisodeId] = useState('episode-1');
  const [displayTitle, setDisplayTitle] = useState(studio.project.title);
  const [aspectRatio, setAspectRatio] = useState<PlannerAssetRatio>('16:9');
  const [storyboardModelId, setStoryboardModelId] = useState(() => readPreferredStoryboardModelId(initialWorkspace ?? null));
  const [remainingPoints, setRemainingPoints] = useState(studio.creation.points);
  const [requirement, setRequirement] = useState(studio.planner.submittedRequirement || sekoPlanThreadData.userPrompt);
  const [notice, setNoticeState] = useState<PlannerNotice | null>(null);
  const [outlineConfirmed, setOutlineConfirmed] = useState(false);
  const [historyMenuOpen, setHistoryMenuOpen] = useState(false);
  const [runtimeWorkspace, setRuntimeWorkspace] = useState<ApiPlannerWorkspace | null>(initialWorkspace ?? null);
  const [messages, setMessages] = useState<PlannerThreadMessage[]>(() => mapWorkspaceMessagesToThread(initialWorkspace?.messages));
  const [plannerImageAssets, setPlannerImageAssets] = useState<PlannerRuntimeAssetOption[]>([]);
  const [assetUploadPending, setAssetUploadPending] = useState<'subject' | 'scene' | null>(null);
  const [serverPlannerText, setServerPlannerText] = useState(initialGeneratedText ?? '');
  const [structuredPlannerDoc, setStructuredPlannerDoc] = useState<PlannerStructuredDoc | null>(initialStructuredDoc ?? null);
  const [plannerSubmitting, setPlannerSubmitting] = useState(false);

  const { streamState, startPlannerStream, stopPlannerStream } = usePlannerStream(runtimeApi);

  const setNotice = useCallback((value: PlannerNoticeInput) => {
    setNoticeState(toPlannerNotice(value));
  }, []);

  const plannerDoc = useMemo(
    () => (structuredPlannerDoc ? toPlannerSeedData(structuredPlannerDoc, sekoPlanData) : sekoPlanData),
    [structuredPlannerDoc],
  );
  const workspaceStepAnalysis = streamState?.steps.length ? streamState.steps : (runtimeWorkspace?.activeRefinement?.stepAnalysis ?? []);
  const runtimeActiveOutline = runtimeWorkspace?.activeOutline ?? null;
  const runtimeActiveRefinement = runtimeWorkspace?.activeRefinement ?? null;
  const latestPlannerExecutionMode = runtimeWorkspace?.latestPlannerRun?.executionMode ?? null;

  const {
    versions,
    activeVersionId,
    activeVersion,
    startRefinement,
    hydrateReadyVersion,
    selectVersion,
    updateSubject,
    updateScene,
    updateShot,
    deleteShot,
  } = usePlannerRefinement({
    stepCount: sekoPlanThreadData.refinementSteps.length,
    seedSubjects: plannerDoc.subjects,
    seedScenes: plannerDoc.scenes,
    seedActs: plannerDoc.acts,
  });

  const {
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
  } = usePlannerDisplayState({
    studioTitle: studio.project.title,
    studioBrief: studio.project.brief,
    plannerMode,
    plannerDoc,
    runtimeWorkspace,
    runtimeActiveOutline,
    runtimeActiveRefinement,
    streamSteps: workspaceStepAnalysis,
    activeEpisodeId,
    storyboardModelId,
    activeVersion,
    activeVersionId,
    versions,
    subjectImagePool: SUBJECT_IMAGE_POOL,
    sceneImagePool: SCENE_IMAGE_POOL,
  });

  const activeEpisodeRuntimeId = runtimeApi?.episodeId ?? runtimeWorkspace?.episode.id ?? null;
  const plannerDebugSearch = buildPlannerDebugSearch({
    projectId: runtimeApi?.projectId ?? null,
    episodeId: activeEpisodeRuntimeId,
    projectTitle: displayTitle || studio.project.title,
    episodeTitle: runtimeWorkspace?.episode.title ?? activeEpisode?.title ?? null,
  });
  const activeDebugApplySource = runtimeActiveRefinement?.debugApplySource ?? null;

  const openDebugRun = useCallback((debugRunId: string) => {
    router.push(`/admin/planner-debug/runs/${encodeURIComponent(debugRunId)}${plannerDebugSearch}`);
  }, [plannerDebugSearch, router]);

  const openAgentDebug = useCallback(() => {
    router.push(`/admin/planner-debug${plannerDebugSearch}`);
  }, [plannerDebugSearch, router]);

  const backToExplore = useCallback(() => {
    router.push('/explore');
  }, [router]);

  useEffect(() => {
    if (!initialPlannerReady || !initialGeneratedText || versions.length > 0) {
      return;
    }

    if (runtimeWorkspace?.activeRefinement) {
      setOutlineConfirmed(true);
      return;
    }

    if (runtimeWorkspace?.activeOutline) {
      setOutlineConfirmed(false);
      return;
    }

    setOutlineConfirmed(true);
    hydrateReadyVersion({
      trigger: 'confirm_outline',
      instruction: studio.planner.submittedRequirement || studio.project.brief,
    });
  }, [
    hydrateReadyVersion,
    initialGeneratedText,
    initialPlannerReady,
    runtimeWorkspace?.activeOutline,
    runtimeWorkspace?.activeRefinement,
    studio.planner.submittedRequirement,
    studio.project.brief,
    versions.length,
  ]);

  useEffect(() => {
    if (!plannerEpisodes.some((item) => item.id === activeEpisodeId)) {
      setActiveEpisodeId(plannerEpisodes[0]?.id ?? 'episode-1');
    }
  }, [activeEpisodeId, plannerEpisodes]);

  const { refreshPlannerWorkspace, ensureEditableRuntimeRefinement, activateHistoryVersion } = usePlannerRuntimeWorkspace({
    runtimeApi,
    runtimeWorkspace,
    runtimeActiveRefinement,
    setRuntimeWorkspace,
    setPlannerImageAssets: (assets) => setPlannerImageAssets(assets),
    setDisplayTitle,
    setMessages,
    setServerPlannerText,
    setStructuredPlannerDoc,
    setOutlineConfirmed,
    setNotice,
    mapWorkspaceMessagesToThread,
    outlineToPreviewStructuredPlannerDoc,
  });

  const { saveState, persistPlannerDoc } = usePlannerDocumentPersistence({
    runtimeApi,
    ensureEditableRuntimeRefinement,
    setStructuredPlannerDoc,
    setNotice,
  });

  const { submitPlannerRunViaApi, submitPartialRerunViaApi, submitPlannerImageGenerationViaApi } = usePlannerRunSubmission({
    runtimeApi,
    refreshPlannerWorkspace,
    startPlannerStream,
    stopPlannerStream,
    setPlannerSubmitting,
    onRunCompleted: async ({ trigger, instruction, executionMode, generatedText, structuredDoc, workspace }) => {
      if (!workspace) {
        setServerPlannerText(generatedText);
        setStructuredPlannerDoc(structuredDoc);
        if (isRefinementRunTrigger(trigger)) {
          setOutlineConfirmed(true);
          const nextId = hydrateReadyVersion({ trigger: trigger as PlannerRefinementTrigger, instruction });
          selectVersion(nextId);
        } else {
          setOutlineConfirmed(false);
        }
        setMessages((current) => [
          ...current,
          {
            id: nextLocalId('msg'),
            role: 'user',
            messageType: 'user_input',
            content: instruction || (isRefinementRunTrigger(trigger) && trigger !== 'confirm_outline' ? '请重新细化剧情内容。' : sekoPlanThreadData.confirmPrompt),
          },
          {
            id: nextLocalId('msg'),
            role: 'assistant',
            messageType: 'assistant_text',
            content: generatedText,
          },
        ]);
      }

      setNotice(
        `${executionMode === 'live' ? '已通过真实模型执行。' : executionMode === 'fallback' ? '当前结果来自回退生成。' : ''}${buildRunNotice(trigger, Boolean(workspace?.activeRefinement))}`,
      );
    },
    onRunFailed: (message) => {
      setNotice(message);
    },
    onRunPending: () => {
      setNotice('策划任务已提交，仍在后台处理中。');
    },
  });

  const pointCost = studio.planner.pointCost > 0 ? studio.planner.pointCost : plannerDoc.pointCost;
  const mediaCardStyle = useMemo(
    () =>
      ({
        '--planner-media-aspect-ratio': ratioToCssValue(aspectRatio),
        '--planner-media-card-width': `${ratioCardWidth(aspectRatio)}px`,
      }) as CSSProperties,
    [aspectRatio],
  );

  const assetDrafts = usePlannerAssetDrafts({
    displaySubjectCards,
    displaySceneCards,
    runtimeSubjects: runtimeWorkspace?.subjects,
    runtimeScenes: runtimeWorkspace?.scenes,
  });

  const shotEditor = usePlannerShotEditor({
    displayScriptActs,
  });

  const dialogDisplayState = usePlannerDialogDisplayState({
    runtimeWorkspace,
    plannerImageAssets,
    displaySubjectCards,
    displaySceneCards,
    subjectDialogCardId: assetDrafts.subjectDialogCardId,
    sceneDialogCardId: assetDrafts.sceneDialogCardId,
    subjectImageDraft: assetDrafts.subjectImageDraft,
    subjectAssetDraftId: assetDrafts.subjectAssetDraftId,
    sceneImageDraft: assetDrafts.sceneImageDraft,
    sceneAssetDraftId: assetDrafts.sceneAssetDraftId,
  });

  const shotPromptPreviewState = usePlannerShotPromptPreview({
    runtimeApi,
    runtimeActiveRefinementId: runtimeActiveRefinement?.id ?? null,
    displayScriptActs,
    storyboardModelId,
  });

  const assetActions = usePlannerAssetActions({
    runtimeApi,
    runtimeActiveRefinement,
    plannerDoc,
    structuredPlannerDoc,
    displaySubjectCards,
    displaySceneCards,
    activeRuntimeSubject: dialogDisplayState.activeRuntimeSubject,
    activeRuntimeScene: dialogDisplayState.activeRuntimeScene,
    subjectDialogCardId: assetDrafts.subjectDialogCardId,
    subjectNameDraft: assetDrafts.subjectNameDraft,
    subjectPromptDraft: assetDrafts.subjectPromptDraft,
    subjectImageDraft: assetDrafts.subjectImageDraft,
    subjectAssetDraftId: assetDrafts.subjectAssetDraftId,
    setSubjectPromptDraft: assetDrafts.setSubjectPromptDraft,
    setSubjectImageDraft: assetDrafts.setSubjectImageDraft,
    setSubjectAssetDraftId: assetDrafts.setSubjectAssetDraftId,
    setSubjectAdjustMode: assetDrafts.setSubjectAdjustMode,
    closeSubjectAdjustDialog: assetDrafts.closeSubjectAdjustDialog,
    sceneDialogCardId: assetDrafts.sceneDialogCardId,
    sceneNameDraft: assetDrafts.sceneNameDraft,
    scenePromptDraft: assetDrafts.scenePromptDraft,
    sceneImageDraft: assetDrafts.sceneImageDraft,
    sceneAssetDraftId: assetDrafts.sceneAssetDraftId,
    setScenePromptDraft: assetDrafts.setScenePromptDraft,
    setSceneImageDraft: assetDrafts.setSceneImageDraft,
    setSceneAssetDraftId: assetDrafts.setSceneAssetDraftId,
    setSceneAdjustMode: assetDrafts.setSceneAdjustMode,
    closeSceneAdjustDialog: assetDrafts.closeSceneAdjustDialog,
    ensureEditableRuntimeRefinement,
    refreshPlannerWorkspace,
    submitPartialRerunViaApi,
    submitPlannerImageGenerationViaApi,
    persistPlannerDoc,
    updateSubject,
    updateScene,
    setPlannerImageAssets,
    setAssetUploadPending,
    setPlannerSubmitting,
    setNotice,
    resetSubjectUploadInput: () => {
      if (subjectUploadInputRef.current) {
        subjectUploadInputRef.current.value = '';
      }
    },
    resetSceneUploadInput: () => {
      if (sceneUploadInputRef.current) {
        sceneUploadInputRef.current.value = '';
      }
    },
  });

  const composerActions = usePlannerComposerActions({
    runtimeApi,
    runtimeActiveOutlineId: runtimeActiveOutline?.id ?? null,
    outlineConfirmed,
    plannerSubmitting,
    requirement,
    refreshPlannerWorkspace,
    submitPlannerRunViaApi,
    startRefinement,
    hydrateReadyVersion,
    selectVersion,
    setHistoryMenuOpen,
    setPlannerSubmitting,
    setOutlineConfirmed,
    setMessages,
    setNotice,
    nextLocalId,
  });

  const shotActions = usePlannerShotActions({
    runtimeApi,
    runtimeActiveRefinement,
    editingShot: shotEditor.editingShot,
    shotDraft: shotEditor.shotDraft,
    shotDeleteDialog: shotEditor.shotDeleteDialog,
    displayScriptActs,
    plannerDoc,
    structuredPlannerDoc,
    persistPlannerDoc,
    ensureEditableRuntimeRefinement,
    refreshPlannerWorkspace,
    submitPartialRerunViaApi,
    submitPlannerImageGenerationViaApi,
    cancelShotInlineEditor: shotEditor.cancelShotInlineEditor,
    closeShotDeleteDialog: shotEditor.closeShotDeleteDialog,
    setPlannerSubmitting,
    setNotice,
    updateShot,
    deleteShot,
  });

  const creationFlow = usePlannerCreationFlow({
    router,
    runtimeApi,
    runtimeWorkspace,
    runtimeActiveRefinement,
    displayVersionStatus,
    displayScriptActs,
    remainingPoints,
    pointCost,
    storyboardModelId,
    studioProjectId: studio.project.id,
    refreshPlannerWorkspace,
    setNotice,
  });

  const handleSelectHistoryVersion = useCallback(async (versionId: string) => {
    if (usingRuntimePlanner) {
      try {
        await activateHistoryVersion(versionId);
      } catch (error) {
        setNotice(buildPlannerNoticeFromError(error, '切换策划版本失败。'));
      } finally {
        setHistoryMenuOpen(false);
      }
      return;
    }

    selectVersion(versionId);
    setHistoryMenuOpen(false);
  }, [activateHistoryVersion, selectVersion, setNotice, usingRuntimePlanner]);

  return {
    studio,
    runtimeApi,
    plannerMode,
    displayTitle,
    plannerDebugSearch,
    openAgentDebug,
    backToExplore,
    activeEpisodeId,
    setActiveEpisodeId,
    plannerEpisodes,
    usingRuntimePlanner,
    messages,
    requirement,
    setRequirement,
    outlineConfirmed,
    runtimeActiveOutline,
    runtimeActiveRefinement,
    plannerSubmitting,
    serverPlannerText,
    refinementDetailSteps,
    activeVersion,
    activeDebugApplySource,
    notice,
    openDebugRun,
    handleComposerSubmit: composerActions.handleComposerSubmit,
    handleConfirmOutline: composerActions.handleConfirmOutline,
    activeEpisodeNumber,
    activeEpisode,
    plannerDoc,
    saveState,
    latestPlannerExecutionMode,
    historyMenuOpen,
    toggleHistoryMenu: () => setHistoryMenuOpen((current) => !current),
    historyVersions,
    historyActiveVersionId,
    handleSelectHistoryVersion,
    hasDisplayVersion,
    displayVersionStatus,
    displayVersionProgress,
    displaySections,
    activeStyle,
    mediaCardStyle,
    displaySubjectCards,
    displaySceneCards,
    displayScriptActs,
    editingShot: shotEditor.editingShot,
    shotDraft: shotEditor.shotDraft,
    openSubjectAdjustDialog: assetDrafts.openSubjectAdjustDialog,
    openSceneAdjustDialog: assetDrafts.openSceneAdjustDialog,
    openShotInlineEditor: shotEditor.openShotInlineEditor,
    openShotDeleteDialog: shotEditor.openShotDeleteDialog,
    rerunActAdjust: shotActions.rerunActAdjust,
    setShotDraft: shotEditor.setShotDraft,
    rerunShotAdjust: shotActions.rerunShotAdjust,
    generateShotImage: shotActions.generateShotImage,
    cancelShotInlineEditor: shotEditor.cancelShotInlineEditor,
    applyShotInlineEditor: shotActions.applyShotInlineEditor,
    shotPromptPreview: shotPromptPreviewState.shotPromptPreview,
    shotPromptPreviewLoading: shotPromptPreviewState.shotPromptPreviewLoading,
    shotPromptPreviewError: shotPromptPreviewState.shotPromptPreviewError,
    selectedStoryboardModel,
    storyboardModelId,
    setStoryboardModelId,
    aspectRatio,
    setAspectRatio,
    startCreation: creationFlow.startCreation,
    creationActionLabel: creationFlow.creationActionLabel,
    creationActionDisabled: creationFlow.creationActionDisabled,
    assetUploadPending,
    booting: creationFlow.booting,
    bootProgress: creationFlow.bootProgress,
    remainingPoints,
    subjectDialogCardId: assetDrafts.subjectDialogCardId,
    activeSubjectCard: dialogDisplayState.activeSubjectCard,
    subjectImageDraft: assetDrafts.subjectImageDraft,
    subjectNameDraft: assetDrafts.subjectNameDraft,
    subjectPromptDraft: assetDrafts.subjectPromptDraft,
    subjectAdjustMode: assetDrafts.subjectAdjustMode,
    activeSubjectAssetLabel: dialogDisplayState.activeSubjectAssetLabel,
    subjectAssetThumbs: dialogDisplayState.subjectAssetThumbs,
    subjectAssetDraftId: assetDrafts.subjectAssetDraftId,
    subjectRecommendations: assetActions.subjectRecommendations,
    subjectRecommendationsLoading: assetActions.subjectRecommendationsLoading,
    subjectUploadInputRef,
    closeSubjectAdjustDialog: assetDrafts.closeSubjectAdjustDialog,
    setSubjectImageDraft: assetDrafts.setSubjectImageDraft,
    setSubjectAssetDraftId: assetDrafts.setSubjectAssetDraftId,
    setSubjectPromptDraft: assetDrafts.setSubjectPromptDraft,
    setSubjectAdjustMode: assetDrafts.setSubjectAdjustMode,
    applySubjectRecommendation: assetActions.applySubjectRecommendation,
    generateSubjectImage: assetActions.generateSubjectImage,
    rerunSubjectAdjust: assetActions.rerunSubjectAdjust,
    applySubjectAdjust: assetActions.applySubjectAdjust,
    handleSubjectUpload: assetActions.handleSubjectUpload,
    sceneDialogCardId: assetDrafts.sceneDialogCardId,
    activeSceneCard: dialogDisplayState.activeSceneCard,
    sceneImageDraft: assetDrafts.sceneImageDraft,
    sceneNameDraft: assetDrafts.sceneNameDraft,
    scenePromptDraft: assetDrafts.scenePromptDraft,
    sceneAdjustMode: assetDrafts.sceneAdjustMode,
    activeSceneAssetLabel: dialogDisplayState.activeSceneAssetLabel,
    sceneAssetThumbs: dialogDisplayState.sceneAssetThumbs,
    sceneAssetDraftId: assetDrafts.sceneAssetDraftId,
    sceneRecommendations: assetActions.sceneRecommendations,
    sceneRecommendationsLoading: assetActions.sceneRecommendationsLoading,
    sceneUploadInputRef,
    closeSceneAdjustDialog: assetDrafts.closeSceneAdjustDialog,
    setSceneImageDraft: assetDrafts.setSceneImageDraft,
    setSceneAssetDraftId: assetDrafts.setSceneAssetDraftId,
    setScenePromptDraft: assetDrafts.setScenePromptDraft,
    setSceneAdjustMode: assetDrafts.setSceneAdjustMode,
    applySceneRecommendation: assetActions.applySceneRecommendation,
    generateSceneImage: assetActions.generateSceneImage,
    rerunSceneAdjust: assetActions.rerunSceneAdjust,
    applySceneAdjust: assetActions.applySceneAdjust,
    handleSceneUpload: assetActions.handleSceneUpload,
    shotDeleteDialog: shotEditor.shotDeleteDialog,
    deletingShot: shotEditor.deletingShot,
    closeShotDeleteDialog: shotEditor.closeShotDeleteDialog,
    confirmDeleteShot: shotActions.confirmDeleteShot,
    shotTitleById,
  };
}

export type UsePlannerPageStateResult = ReturnType<typeof usePlannerPageState>;
