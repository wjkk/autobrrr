'use client';

import type { Dispatch, SetStateAction } from 'react';

import type { ApiPlannerWorkspace, PlannerRuntimeApiContext } from '../lib/planner-api';
import { DEFAULT_CONFIRM_PROMPT } from '../lib/planner-defaults';
import type { PlannerNoticeInput } from '../lib/planner-notice';
import { nextLocalId } from '../lib/planner-page-helpers';
import type { PlannerStructuredDoc } from '../lib/planner-structured-doc';
import type { PlannerThreadMessage } from '../lib/planner-thread';
import { type PlannerRefinementTrigger } from './use-planner-refinement';
import { usePlannerRunSubmission } from './use-planner-run-submission';

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

export function usePlannerPageRunLifecycle(args: {
  runtimeApi?: PlannerRuntimeApiContext;
  refreshPlannerWorkspace: () => Promise<ApiPlannerWorkspace | null>;
  startPlannerStream: (runId: string) => void;
  stopPlannerStream: () => void;
  setPlannerSubmitting: (value: boolean) => void;
  setServerPlannerText: Dispatch<SetStateAction<string>>;
  setStructuredPlannerDoc: Dispatch<SetStateAction<PlannerStructuredDoc | null>>;
  setOutlineConfirmed: (value: boolean) => void;
  setMessages: Dispatch<SetStateAction<PlannerThreadMessage[]>>;
  setNotice: (message: PlannerNoticeInput) => void;
  hydrateReadyVersion: ReturnType<typeof import('./use-planner-refinement').usePlannerRefinement>['hydrateReadyVersion'];
  selectVersion: ReturnType<typeof import('./use-planner-refinement').usePlannerRefinement>['selectVersion'];
}) {
  return usePlannerRunSubmission({
    runtimeApi: args.runtimeApi,
    refreshPlannerWorkspace: args.refreshPlannerWorkspace,
    startPlannerStream: args.startPlannerStream,
    stopPlannerStream: args.stopPlannerStream,
    setPlannerSubmitting: args.setPlannerSubmitting,
    onRunCompleted: async ({ trigger, instruction, executionMode, generatedText, structuredDoc, workspace }) => {
      if (!workspace) {
        args.setServerPlannerText(generatedText);
        args.setStructuredPlannerDoc(structuredDoc);
        if (isRefinementRunTrigger(trigger)) {
          args.setOutlineConfirmed(true);
          const nextId = args.hydrateReadyVersion({ trigger: trigger as PlannerRefinementTrigger, instruction });
          args.selectVersion(nextId);
        } else {
          args.setOutlineConfirmed(false);
        }
        args.setMessages((current) => [
          ...current,
          {
            id: nextLocalId('msg'),
            role: 'user',
            messageType: 'user_input',
            content: instruction || (isRefinementRunTrigger(trigger) && trigger !== 'confirm_outline' ? '请重新细化剧情内容。' : DEFAULT_CONFIRM_PROMPT),
          },
          {
            id: nextLocalId('msg'),
            role: 'assistant',
            messageType: 'assistant_text',
            content: generatedText,
          },
        ]);
      }

      args.setNotice(
        `${executionMode === 'live' ? '已通过真实模型执行。' : executionMode === 'fallback' ? '当前结果来自回退生成。' : ''}${buildRunNotice(trigger, Boolean(workspace?.activeRefinement))}`,
      );
    },
    onRunFailed: (message) => {
      args.setNotice(message);
    },
    onRunPending: () => {
      args.setNotice('策划任务已提交，仍在后台处理中。');
    },
  });
}
