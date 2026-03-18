'use client';

import type { PlannerStepStatus } from '@aiv/domain';
import { cx } from '@aiv/ui';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';

import {
  type ApiPlannerWorkspace,
  type PlannerRuntimeApiContext,
} from '../lib/planner-api';
import type { PlannerPageData } from '../lib/planner-page-data';
import {
  ASPECT_RATIO_OPTIONS,
  DOC_TOC,
  mapWorkspaceMessagesToThread,
  nextLocalId,
  plannerModeLabel,
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
import {
  outlineToPreviewStructuredPlannerDoc,
} from '../lib/planner-structured-doc';
import { usePlannerRefinement } from '../hooks/use-planner-refinement';
import { usePlannerAssetActions } from '../hooks/use-planner-asset-actions';
import { usePlannerAssetDrafts } from '../hooks/use-planner-asset-drafts';
import { usePlannerComposerActions } from '../hooks/use-planner-composer-actions';
import { usePlannerCreationFlow } from '../hooks/use-planner-creation-flow';
import { usePlannerDocumentPersistence } from '../hooks/use-planner-document-persistence';
import { usePlannerDialogDisplayState } from '../hooks/use-planner-dialog-display-state';
import { usePlannerDisplayState } from '../hooks/use-planner-display-state';
import { usePlannerRunSubmission } from '../hooks/use-planner-run-submission';
import { usePlannerShotEditor } from '../hooks/use-planner-shot-editor';
import { usePlannerShotPromptPreview } from '../hooks/use-planner-shot-prompt-preview';
import { usePlannerShotActions } from '../hooks/use-planner-shot-actions';
import { usePlannerRuntimeWorkspace } from '../hooks/use-planner-runtime-workspace';
import { usePlannerStream } from '../hooks/use-planner-stream';
import { sekoPlanData, type SekoActDraft, type SekoImageCard } from '../lib/seko-plan-data';
import { toPlannerSeedData, toStructuredPlannerDoc } from '../lib/planner-structured-doc';
import type { PlannerThreadMessage } from '../lib/planner-thread';
import { sekoPlanThreadData } from '../lib/seko-plan-thread-data';
import { PLANNER_VIDEO_MODEL_OPTIONS } from '../lib/planner-video-model-options';
import { buildPlannerDebugSearch } from '@/features/planner-debug/lib/planner-debug-runtime';
import { PlannerDocumentPanel } from './planner-document-panel';
import { PlannerEpisodeRail } from './planner-episode-rail';
import { PlannerPageDialogs } from './planner-page-dialogs';
import { PlannerPageHeader } from './planner-page-header';
import { PlannerResultHeader } from './planner-result-header';
import { PlannerThreadPanel } from './planner-thread-panel';
import styles from './planner-page.module.css';

interface PlannerPageProps {
  studio: PlannerPageData;
  runtimeApi?: PlannerRuntimeApiContext;
  initialGeneratedText?: string | null;
  initialStructuredDoc?: PlannerStructuredDoc | null;
  initialPlannerReady?: boolean;
  initialWorkspace?: ApiPlannerWorkspace | null;
}

export function PlannerPage({ studio, runtimeApi, initialGeneratedText, initialStructuredDoc, initialPlannerReady, initialWorkspace }: PlannerPageProps) {
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
  const [notice, setNotice] = useState<string | null>(null);
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

  const plannerDoc = useMemo(() => (structuredPlannerDoc ? toPlannerSeedData(structuredPlannerDoc, sekoPlanData) : sekoPlanData), [structuredPlannerDoc]);
  const workspaceStepAnalysis = streamState?.steps.length ? streamState.steps : (runtimeWorkspace?.activeRefinement?.stepAnalysis ?? []);
  const workspaceHistoryVersions = runtimeWorkspace?.refinementVersions ?? [];
  const runtimeActiveOutline = runtimeWorkspace?.activeOutline ?? null;
  const runtimeActiveRefinement = runtimeWorkspace?.activeRefinement ?? null;

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
  const openDebugRun = (debugRunId: string) => {
    router.push(`/admin/planner-debug/runs/${encodeURIComponent(debugRunId)}${plannerDebugSearch}`);
  };

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
  }, [hydrateReadyVersion, initialGeneratedText, initialPlannerReady, runtimeWorkspace?.activeOutline, runtimeWorkspace?.activeRefinement, studio.planner.submittedRequirement, studio.project.brief, versions.length]);

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
    onRunCompleted: async ({ trigger, instruction, generatedText, structuredDoc, workspace }) => {
      if (!workspace) {
        setServerPlannerText(generatedText);
        setStructuredPlannerDoc(structuredDoc);
        if (trigger === 'confirm_outline' || trigger === 'rerun') {
          setOutlineConfirmed(true);
          const nextId = hydrateReadyVersion({ trigger: trigger === 'confirm_outline' ? 'confirm_outline' : 'rerun', instruction });
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
            content: instruction || (trigger === 'rerun' ? '请重新细化剧情内容。' : sekoPlanThreadData.confirmPrompt),
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
        workspace?.activeRefinement
          ? trigger === 'confirm_outline'
            ? '已完成细化并更新策划文档。'
            : trigger === 'subject_only'
              ? '已按要求局部重写主体并更新策划文档。'
              : trigger === 'scene_only'
                ? '已按要求局部重写场景并更新策划文档。'
                : trigger === 'shots_only'
                  ? '已按要求局部重写分镜并更新策划文档。'
                  : trigger === 'subject_image'
                    ? '已生成主体图片并回写到策划文档。'
                    : trigger === 'scene_image'
                      ? '已生成场景图片并回写到策划文档。'
                      : trigger === 'shot_image'
                        ? '已生成分镜草图并回写到策划文档。'
                        : '已生成新的策划版本。'
          : trigger === 'generate_outline' || trigger === 'update_outline'
            ? '已生成新的剧本大纲版本。'
            : '已生成剧本大纲，请确认后继续细化。',
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

  const {
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
  } = usePlannerAssetDrafts({
    displaySubjectCards,
    displaySceneCards,
    runtimeSubjects: runtimeWorkspace?.subjects,
    runtimeScenes: runtimeWorkspace?.scenes,
  });

  const {
    editingShot,
    shotDraft,
    setShotDraft,
    shotDeleteDialog,
    deletingShot,
    openShotInlineEditor,
    cancelShotInlineEditor,
    openShotDeleteDialog,
    closeShotDeleteDialog,
  } = usePlannerShotEditor({
    displayScriptActs,
  });

  const {
    activeSubjectCard,
    activeRuntimeSubject,
    activeSceneCard,
    activeRuntimeScene,
    subjectAssetThumbs,
    sceneAssetThumbs,
    activeSubjectAssetLabel,
    activeSceneAssetLabel,
  } = usePlannerDialogDisplayState({
    runtimeWorkspace,
    plannerImageAssets,
    displaySubjectCards,
    displaySceneCards,
    subjectDialogCardId,
    sceneDialogCardId,
    subjectImageDraft,
    subjectAssetDraftId,
    sceneImageDraft,
    sceneAssetDraftId,
  });

  const {
    shotPromptPreview,
    shotPromptPreviewLoading,
    shotPromptPreviewError,
  } = usePlannerShotPromptPreview({
    runtimeApi,
    runtimeActiveRefinementId: runtimeActiveRefinement?.id ?? null,
    displayScriptActs,
    storyboardModelId,
  });

  const {
    handleSubjectUpload,
    applySubjectAdjust,
    handleSceneUpload,
    applySceneAdjust,
    rerunSubjectAdjust,
    generateSubjectImage,
    rerunSceneAdjust,
    generateSceneImage,
  } = usePlannerAssetActions({
    runtimeApi,
    runtimeActiveRefinement,
    plannerDoc,
    structuredPlannerDoc,
    displaySubjectCards,
    displaySceneCards,
    activeRuntimeSubject,
    activeRuntimeScene,
    subjectDialogCardId,
    subjectNameDraft,
    subjectPromptDraft,
    subjectImageDraft,
    subjectAssetDraftId,
    setSubjectImageDraft,
    setSubjectAssetDraftId,
    setSubjectAdjustMode,
    closeSubjectAdjustDialog,
    sceneDialogCardId,
    sceneNameDraft,
    scenePromptDraft,
    sceneImageDraft,
    sceneAssetDraftId,
    setSceneImageDraft,
    setSceneAssetDraftId,
    setSceneAdjustMode,
    closeSceneAdjustDialog,
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

  const { handleConfirmOutline, handleComposerSubmit } = usePlannerComposerActions({
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

  const {
    applyShotInlineEditor,
    rerunShotAdjust,
    generateShotImage,
    rerunActAdjust,
    confirmDeleteShot,
  } = usePlannerShotActions({
    runtimeApi,
    runtimeActiveRefinement,
    editingShot,
    shotDraft,
    shotDeleteDialog,
    displayScriptActs,
    plannerDoc,
    structuredPlannerDoc,
    persistPlannerDoc,
    ensureEditableRuntimeRefinement,
    refreshPlannerWorkspace,
    submitPartialRerunViaApi,
    submitPlannerImageGenerationViaApi,
    cancelShotInlineEditor,
    closeShotDeleteDialog,
    setPlannerSubmitting,
    setNotice,
    updateShot,
    deleteShot,
  });

  const { booting, bootProgress, creationActionDisabled, creationActionLabel, startCreation } = usePlannerCreationFlow({
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

  const handleSelectHistoryVersion = async (versionId: string) => {
    if (usingRuntimePlanner) {
      try {
        await activateHistoryVersion(versionId);
      } catch (error) {
        setNotice(error instanceof Error ? error.message : '切换策划版本失败。');
      } finally {
        setHistoryMenuOpen(false);
      }
      return;
    }

    selectVersion(versionId);
    setHistoryMenuOpen(false);
  };

  return (
    <>
      <div className={styles.page}>
        <PlannerPageHeader
          title={displayTitle}
          brief={studio.project.brief}
          plannerModeLabel={plannerModeLabel(plannerMode)}
          onOpenAgentDebug={
            runtimeApi
              ? () => {
                  router.push(`/admin/planner-debug${plannerDebugSearch}`);
                }
              : undefined
          }
          onBackToExplore={() => router.push('/explore')}
        />

        <div className={styles.workspace}>
          <section className={styles.leftPanel}>
            <div className={cx(styles.leftPanelInner, plannerMode === 'single' && styles.leftPanelSingle)}>
              {plannerMode === 'series' ? (
                <PlannerEpisodeRail
                  episodes={plannerEpisodes}
                  activeEpisodeId={activeEpisodeId}
                  onSelectEpisode={setActiveEpisodeId}
                />
              ) : null}

              <PlannerThreadPanel
                usingRuntimePlanner={usingRuntimePlanner}
                messages={messages}
                requirement={requirement}
                outlineConfirmed={outlineConfirmed}
                plannerSubmitting={plannerSubmitting}
                serverPlannerText={serverPlannerText}
                refinementDetailSteps={refinementDetailSteps}
                activeVersion={activeVersion}
                activeDocumentTitle={runtimeActiveRefinement?.documentTitle ?? runtimeWorkspace?.activeOutline?.documentTitle ?? null}
                activeRefinementVersionNumber={runtimeActiveRefinement?.versionNumber ?? null}
                activeRefinementAgentName={runtimeActiveRefinement?.subAgentProfile?.displayName ?? null}
                activeRefinementTrigger={runtimeActiveRefinement?.triggerType ?? null}
                activeDebugApplySource={activeDebugApplySource}
                assistantName={studio.assistantName}
                notice={notice}
                onOpenDebugRun={openDebugRun}
                onRequirementChange={setRequirement}
                onSubmit={handleComposerSubmit}
                onConfirmOutline={handleConfirmOutline}
              />
            </div>
          </section>

          <section className={styles.rightPanel}>
            <PlannerResultHeader
              activeEpisodeNumber={activeEpisodeNumber}
              activeEpisodeTitle={activeEpisode?.title ?? ''}
              fallbackEpisodeTitle={plannerDoc.episodeTitle}
              saveState={saveState}
              activeDebugApplySource={activeDebugApplySource}
              historyMenuOpen={historyMenuOpen}
              historyVersions={historyVersions}
              historyActiveVersionId={historyActiveVersionId}
              onOpenDebugRun={openDebugRun}
              onToggleHistory={() => setHistoryMenuOpen((current) => !current)}
              onSelectHistoryVersion={handleSelectHistoryVersion}
            />

            <PlannerDocumentPanel
              hasDisplayVersion={hasDisplayVersion}
              runtimeActiveRefinement={Boolean(runtimeActiveRefinement)}
              runtimeActiveOutlineDoc={runtimeActiveOutline?.outlineDoc ?? null}
              displayVersionStatus={displayVersionStatus}
              displayVersionProgress={displayVersionProgress}
              displaySections={displaySections}
              plannerDoc={plannerDoc}
              activeStyle={activeStyle}
              mediaCardStyle={mediaCardStyle}
              displaySubjectCards={displaySubjectCards}
              displaySceneCards={displaySceneCards}
              displayScriptActs={displayScriptActs}
              plannerSubmitting={plannerSubmitting}
              runtimeEnabled={Boolean(runtimeApi)}
              editingShot={editingShot}
              shotDraft={shotDraft}
              onOpenSubjectAdjust={openSubjectAdjustDialog}
              onOpenSceneAdjust={openSceneAdjustDialog}
              onOpenShotEditor={openShotInlineEditor}
              onOpenShotDeleteDialog={openShotDeleteDialog}
              onActRerun={(actId) => void rerunActAdjust(actId)}
              onShotDraftChange={setShotDraft}
              onRerunShot={() => void rerunShotAdjust()}
              onGenerateShotImage={() => void generateShotImage()}
              onCancelShotEditor={cancelShotInlineEditor}
              onSaveShot={() => void applyShotInlineEditor()}
              shotPromptPreview={shotPromptPreview}
              shotPromptPreviewLoading={shotPromptPreviewLoading}
              shotPromptPreviewError={shotPromptPreviewError}
              selectedStoryboardModelName={selectedStoryboardModel?.name ?? storyboardModelId}
              selectedStoryboardModelHint={selectedStoryboardModel?.hint ?? null}
              shotTitleById={shotTitleById}
              tocItems={DOC_TOC}
              storyboardModelId={storyboardModelId}
              storyboardModelOptions={PLANNER_VIDEO_MODEL_OPTIONS}
              aspectRatio={aspectRatio}
              aspectRatioOptions={ASPECT_RATIO_OPTIONS}
              onStoryboardModelChange={setStoryboardModelId}
              onAspectRatioChange={setAspectRatio}
              onStartCreation={() => void startCreation()}
              creationActionLabel={creationActionLabel}
              creationActionDisabled={plannerSubmitting || creationActionDisabled}
            />
          </section>
        </div>
      </div>

      <PlannerPageDialogs
        runtimeEnabled={Boolean(runtimeApi)}
        plannerSubmitting={plannerSubmitting}
        assetUploadPending={assetUploadPending}
        booting={booting}
        bootProgress={bootProgress}
        remainingPoints={remainingPoints}
        subjectOpen={Boolean(subjectDialogCardId && activeSubjectCard)}
        subjectTitle={activeSubjectCard?.title ?? null}
        subjectImage={subjectImageDraft || activeSubjectCard?.image || ''}
        subjectNameDraft={subjectNameDraft}
        subjectPromptDraft={subjectPromptDraft}
        subjectAdjustMode={subjectAdjustMode}
        subjectAssetLabel={activeSubjectAssetLabel}
        subjectThumbs={subjectAssetThumbs}
        subjectAssetDraftId={subjectAssetDraftId}
        subjectUploadInputRef={subjectUploadInputRef}
        onSubjectClose={closeSubjectAdjustDialog}
        onSubjectSelectThumb={(thumb) => {
          setSubjectImageDraft(thumb.image);
          setSubjectAssetDraftId(thumb.assetId);
        }}
        onSubjectPromptChange={setSubjectPromptDraft}
        onSubjectPromptModeChange={setSubjectAdjustMode}
        onSubjectGenerate={() => void generateSubjectImage()}
        onSubjectRerun={() => void rerunSubjectAdjust()}
        onSubjectApply={() => void applySubjectAdjust()}
        onSubjectUpload={(file) => void handleSubjectUpload(file)}
        sceneOpen={Boolean(sceneDialogCardId && activeSceneCard)}
        sceneTitle={activeSceneCard?.title ?? null}
        sceneImage={sceneImageDraft || activeSceneCard?.image || ''}
        sceneNameDraft={sceneNameDraft}
        scenePromptDraft={scenePromptDraft}
        sceneAdjustMode={sceneAdjustMode}
        sceneAssetLabel={activeSceneAssetLabel}
        sceneThumbs={sceneAssetThumbs}
        sceneAssetDraftId={sceneAssetDraftId}
        sceneUploadInputRef={sceneUploadInputRef}
        onSceneClose={closeSceneAdjustDialog}
        onSceneSelectThumb={(thumb) => {
          setSceneImageDraft(thumb.image);
          setSceneAssetDraftId(thumb.assetId);
        }}
        onScenePromptChange={setScenePromptDraft}
        onScenePromptModeChange={setSceneAdjustMode}
        onSceneGenerate={() => void generateSceneImage()}
        onSceneRerun={() => void rerunSceneAdjust()}
        onSceneApply={() => void applySceneAdjust()}
        onSceneUpload={(file) => void handleSceneUpload(file)}
        shotDeleteOpen={Boolean(shotDeleteDialog && deletingShot)}
        shotDeleteTitle={deletingShot?.title ?? null}
        onShotDeleteClose={closeShotDeleteDialog}
        onShotDeleteConfirm={() => void confirmDeleteShot()}
      />
    </>
  );
}
