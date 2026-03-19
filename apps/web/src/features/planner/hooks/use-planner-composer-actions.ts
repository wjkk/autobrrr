'use client';

import { useCallback } from 'react';

import { plannerCopy } from '@/lib/copy';

import { confirmPlannerOutlineVersion, type PlannerRuntimeApiContext } from '../lib/planner-api';
import { buildPlannerNoticeFromError, type PlannerNoticeInput } from '../lib/planner-notice';
import type { PlannerThreadMessage } from '../lib/planner-thread';
import { sekoPlanThreadData } from '@aiv/mock-data';
import type { PlannerRefinementTrigger } from './use-planner-refinement';

type SubmitPlannerRunViaApi = (
  trigger: 'generate_outline' | 'update_outline' | 'confirm_outline' | 'rerun',
  instruction: string,
) => Promise<boolean>;

interface UsePlannerComposerActionsOptions {
  runtimeApi?: PlannerRuntimeApiContext;
  runtimeActiveOutlineId: string | null;
  outlineConfirmed: boolean;
  plannerSubmitting: boolean;
  requirement: string;
  refreshPlannerWorkspace: () => Promise<unknown>;
  submitPlannerRunViaApi: SubmitPlannerRunViaApi;
  startRefinement: (args: { trigger: PlannerRefinementTrigger; instruction?: string }) => string;
  hydrateReadyVersion: (args: { trigger: PlannerRefinementTrigger; instruction?: string }) => string;
  selectVersion: (versionId: string) => void;
  setHistoryMenuOpen: (value: boolean) => void;
  setPlannerSubmitting: (value: boolean) => void;
  setOutlineConfirmed: (value: boolean) => void;
  setMessages: (updater: (current: PlannerThreadMessage[]) => PlannerThreadMessage[]) => void;
  setNotice: (message: PlannerNoticeInput) => void;
  nextLocalId: (prefix: string) => string;
}

export function usePlannerComposerActions(options: UsePlannerComposerActionsOptions) {
  const handleConfirmOutline = useCallback(() => {
    if (options.outlineConfirmed || options.plannerSubmitting) {
      return;
    }

    options.setHistoryMenuOpen(false);

    if (options.runtimeApi) {
      if (!options.runtimeActiveOutlineId) {
        options.setNotice('当前没有可确认的大纲版本。');
        return;
      }

      options.setPlannerSubmitting(true);
      confirmPlannerOutlineVersion({
        projectId: options.runtimeApi.projectId,
        episodeId: options.runtimeApi.episodeId,
        outlineVersionId: options.runtimeActiveOutlineId,
      })
        .then(async () => {
          await options.refreshPlannerWorkspace();
          options.setNotice('已确认当前大纲，下一步可开始细化剧情内容。');
        })
        .catch((error: unknown) => {
          options.setNotice(buildPlannerNoticeFromError(error, '确认大纲失败。'));
        })
        .finally(() => {
          options.setPlannerSubmitting(false);
        });
      return;
    }

    options.setOutlineConfirmed(true);
    const nextId = options.startRefinement({ trigger: 'confirm_outline' });
    options.selectVersion(nextId);

    options.setMessages((current) => [
      ...current,
      { id: options.nextLocalId('msg'), role: 'user', messageType: 'user_input', content: sekoPlanThreadData.confirmPrompt },
      { id: options.nextLocalId('msg'), role: 'assistant', messageType: 'assistant_text', content: sekoPlanThreadData.refinementReply },
    ]);

    options.setNotice('已确认大纲，开始细化剧情内容。');
  }, [options]);

  const rerunRefinement = useCallback(() => {
    if (!options.outlineConfirmed) {
      options.setNotice('请先确认大纲后再重新细化。');
      return;
    }

    const instruction = options.requirement.trim();
    if (options.runtimeApi) {
      options.submitPlannerRunViaApi('rerun', instruction || '请重新细化剧情内容。').catch((error: unknown) => {
        options.setPlannerSubmitting(false);
        options.setNotice(buildPlannerNoticeFromError(error, '策划生成失败，请稍后重试。'));
      });
      options.setHistoryMenuOpen(false);
      options.setNotice('已提交新的策划生成任务。');
      return;
    }

    const nextId = options.startRefinement({
      trigger: 'rerun',
      instruction,
    });

    options.selectVersion(nextId);
    options.setHistoryMenuOpen(false);
    options.setMessages((current) => [
      ...current,
      { id: options.nextLocalId('msg'), role: 'user', messageType: 'user_input', content: instruction || '请重新细化剧情内容。' },
      { id: options.nextLocalId('msg'), role: 'assistant', messageType: 'assistant_text', content: plannerCopy.assistantWorking },
    ]);
    options.setNotice('已创建新的细化版本。');
  }, [options]);

  const handleComposerSubmit = useCallback(() => {
    const instruction = options.requirement.trim();
    if (!instruction) {
      options.setNotice('请输入内容后提交。');
      return;
    }

    if (!options.outlineConfirmed && options.runtimeApi) {
      const trigger = options.runtimeActiveOutlineId ? 'update_outline' : 'generate_outline';
      options.submitPlannerRunViaApi(trigger, instruction).catch((error: unknown) => {
        options.setPlannerSubmitting(false);
        options.setNotice(buildPlannerNoticeFromError(error, '策划生成失败，请稍后重试。'));
      });
      options.setNotice(options.runtimeActiveOutlineId ? '已提交大纲修改任务。' : '已提交剧本大纲生成任务。');
      return;
    }

    if (!options.outlineConfirmed) {
      handleConfirmOutline();
      return;
    }

    rerunRefinement();
  }, [handleConfirmOutline, options, rerunRefinement]);

  return {
    handleConfirmOutline,
    handleComposerSubmit,
    rerunRefinement,
  };
}
