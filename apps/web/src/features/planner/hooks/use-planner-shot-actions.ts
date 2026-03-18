'use client';

import { useCallback } from 'react';

import { deletePlannerEntity, patchPlannerEntity, type ApiPlannerWorkspace, type PlannerRuntimeApiContext } from '../lib/planner-api';
import { buildPlannerNoticeFromError, type PlannerNoticeInput } from '../lib/planner-notice';
import { toStructuredPlannerDoc, type PlannerStructuredDoc } from '../lib/planner-structured-doc';
import type { PlannerShotDraftState, PlannerShotPointer } from '../lib/planner-shot-editor';
import type { SekoActDraft, SekoPlanData } from '../lib/seko-plan-data';

interface UsePlannerShotActionsOptions {
  runtimeApi?: PlannerRuntimeApiContext;
  runtimeActiveRefinement: ApiPlannerWorkspace['activeRefinement'];
  editingShot: PlannerShotPointer | null;
  shotDraft: PlannerShotDraftState | null;
  shotDeleteDialog: PlannerShotPointer | null;
  displayScriptActs: SekoActDraft[];
  plannerDoc: SekoPlanData;
  structuredPlannerDoc: PlannerStructuredDoc | null;
  persistPlannerDoc: (nextDoc: PlannerStructuredDoc, successMessage: string) => Promise<void>;
  ensureEditableRuntimeRefinement: () => Promise<ApiPlannerWorkspace | null>;
  refreshPlannerWorkspace: () => Promise<ApiPlannerWorkspace | null>;
  submitPartialRerunViaApi: (rerunScope: { type: 'shot'; shotIds: string[] } | { type: 'act'; actId: string }, instruction: string) => Promise<boolean>;
  submitPlannerImageGenerationViaApi: (
    scope: 'shot_image',
    targetPath: string,
    prompt: string,
    referenceAssetIds?: string[],
  ) => Promise<boolean>;
  cancelShotInlineEditor: () => void;
  closeShotDeleteDialog: () => void;
  setPlannerSubmitting: (value: boolean) => void;
  setNotice: (message: PlannerNoticeInput) => void;
  updateShot: (actId: string, shotId: string, updater: (shot: SekoActDraft['shots'][number]) => SekoActDraft['shots'][number]) => void;
  deleteShot: (actId: string, shotId: string) => void;
}

export function usePlannerShotActions(options: UsePlannerShotActionsOptions) {
  const applyShotInlineEditor = useCallback(async () => {
    if (!options.editingShot || !options.shotDraft) {
      return;
    }

    const editingShot = options.editingShot;
    const shotDraft = options.shotDraft;

    if (options.runtimeApi && options.runtimeActiveRefinement) {
      try {
        await options.ensureEditableRuntimeRefinement();
        await patchPlannerEntity(
          `/api/planner/projects/${encodeURIComponent(options.runtimeApi.projectId)}/shot-scripts/${encodeURIComponent(editingShot.shotId)}`,
          {
            episodeId: options.runtimeApi.episodeId,
            visualDescription: shotDraft.visual,
            composition: shotDraft.composition,
            cameraMotion: shotDraft.motion,
            voiceRole: shotDraft.voice,
            dialogue: shotDraft.line,
          },
        );
        await options.refreshPlannerWorkspace();
        options.setNotice('分镜内容已更新。');
      } catch (error: unknown) {
        options.setNotice(buildPlannerNoticeFromError(error, '分镜更新失败。'));
      }
      options.cancelShotInlineEditor();
      return;
    }

    const nextActs = options.displayScriptActs.map((act) =>
      act.id !== editingShot.actId
        ? act
        : {
            ...act,
            shots: act.shots.map((shot) =>
              shot.id === editingShot.shotId
                ? {
                    ...shot,
                    ...shotDraft,
                  }
                : shot,
            ),
          },
    );

    options.updateShot(editingShot.actId, editingShot.shotId, (shot) => ({
      ...shot,
      ...shotDraft,
    }));

    await options.persistPlannerDoc(
      toStructuredPlannerDoc({
        ...options.plannerDoc,
        acts: nextActs,
      }, options.structuredPlannerDoc),
      '分镜内容已更新。',
    );
    options.cancelShotInlineEditor();
  }, [options]);

  const rerunShotAdjust = useCallback(async () => {
    if (!options.runtimeApi || !options.editingShot || !options.shotDraft) {
      return;
    }

    const shotPrompt = [options.shotDraft.visual, options.shotDraft.composition, options.shotDraft.motion, options.shotDraft.line]
      .filter(Boolean)
      .join('\n');
    try {
      await options.ensureEditableRuntimeRefinement();
      await options.submitPartialRerunViaApi(
        {
          type: 'shot',
          shotIds: [options.editingShot.shotId],
        },
        shotPrompt,
      );
      await options.refreshPlannerWorkspace();
      options.cancelShotInlineEditor();
      options.setNotice('已提交分镜局部重写任务。');
    } catch (error: unknown) {
      options.setPlannerSubmitting(false);
      options.setNotice(buildPlannerNoticeFromError(error, '分镜局部重写失败。'));
    }
  }, [options]);

  const generateShotImage = useCallback(async () => {
    if (!options.runtimeApi || !options.editingShot || !options.shotDraft) {
      return;
    }

    const shotPrompt = [options.shotDraft.visual, options.shotDraft.composition, options.shotDraft.motion].filter(Boolean).join('\n');
    try {
      await options.ensureEditableRuntimeRefinement();
      await options.submitPlannerImageGenerationViaApi(
        'shot_image',
        `/api/planner/projects/${encodeURIComponent(options.runtimeApi.projectId)}/shot-scripts/${encodeURIComponent(options.editingShot.shotId)}/generate-image`,
        shotPrompt,
      );
      await options.refreshPlannerWorkspace();
      options.setNotice('已提交分镜草图生成任务。');
    } catch (error: unknown) {
      options.setPlannerSubmitting(false);
      options.setNotice(buildPlannerNoticeFromError(error, '分镜草图生成失败。'));
    }
  }, [options]);

  const rerunActAdjust = useCallback(async (actId: string) => {
    if (!options.runtimeApi) {
      return;
    }

    const act = options.displayScriptActs.find((item) => item.id === actId);
    if (!act) {
      return;
    }

    const actPrompt = [
      act.title,
      act.location,
      ...act.shots.slice(0, 3).map((shot) => `${shot.title}：${shot.visual}`),
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await options.ensureEditableRuntimeRefinement();
      await options.submitPartialRerunViaApi(
        {
          type: 'act',
          actId,
        },
        actPrompt,
      );
      await options.refreshPlannerWorkspace();
      options.setNotice(`已提交 ${act.title} 的幕级重写任务。`);
    } catch (error: unknown) {
      options.setPlannerSubmitting(false);
      options.setNotice(buildPlannerNoticeFromError(error, '幕级局部重写失败。'));
    }
  }, [options]);

  const confirmDeleteShot = useCallback(async () => {
    if (!options.shotDeleteDialog) {
      return;
    }

    if (options.runtimeApi && options.runtimeActiveRefinement) {
      try {
        await options.ensureEditableRuntimeRefinement();
        await deletePlannerEntity(
          `/api/planner/projects/${encodeURIComponent(options.runtimeApi.projectId)}/shot-scripts/${encodeURIComponent(options.shotDeleteDialog.shotId)}?episodeId=${encodeURIComponent(options.runtimeApi.episodeId)}`,
        );
        await options.refreshPlannerWorkspace();
        options.setNotice('分镜已删除。');
      } catch (error: unknown) {
        options.setNotice(buildPlannerNoticeFromError(error, '删除分镜失败。'));
      }
      options.closeShotDeleteDialog();
      return;
    }

    if (options.editingShot?.actId === options.shotDeleteDialog.actId && options.editingShot.shotId === options.shotDeleteDialog.shotId) {
      options.cancelShotInlineEditor();
    }

    const nextActs = options.displayScriptActs
      .map((act) =>
        act.id !== options.shotDeleteDialog!.actId
          ? act
          : {
              ...act,
              shots: act.shots.filter((shot) => shot.id !== options.shotDeleteDialog!.shotId),
            },
      )
      .filter((act) => act.shots.length > 0);

    options.deleteShot(options.shotDeleteDialog.actId, options.shotDeleteDialog.shotId);
    void options.persistPlannerDoc(
      toStructuredPlannerDoc({
        ...options.plannerDoc,
        acts: nextActs,
      }, options.structuredPlannerDoc),
      '分镜已删除。',
    );
    options.closeShotDeleteDialog();
  }, [options]);

  return {
    applyShotInlineEditor,
    rerunShotAdjust,
    generateShotImage,
    rerunActAdjust,
    confirmDeleteShot,
  };
}
