'use client';

import { useCallback } from 'react';

import {
  fetchPlannerRun,
  submitPlannerGenerateDoc,
  submitPlannerMediaGeneration,
  submitPlannerPartialRerun,
  type ApiPlannerWorkspace,
  type PlannerRerunScope,
  type PlannerRuntimeApiContext,
} from '../lib/planner-api';
import type { PlannerStructuredDoc } from '../lib/planner-structured-doc';

type PlannerRunTrigger =
  | 'generate_outline'
  | 'update_outline'
  | 'confirm_outline'
  | 'rerun'
  | 'subject_only'
  | 'scene_only'
  | 'shots_only'
  | 'subject_image'
  | 'scene_image'
  | 'shot_image';

interface UsePlannerRunSubmissionOptions {
  runtimeApi?: PlannerRuntimeApiContext;
  refreshPlannerWorkspace: () => Promise<ApiPlannerWorkspace | null>;
  startPlannerStream: (runId: string) => void;
  stopPlannerStream: () => void;
  setPlannerSubmitting: (value: boolean) => void;
  onRunCompleted: (args: {
    trigger: PlannerRunTrigger;
    instruction: string;
    generatedText: string;
    structuredDoc: PlannerStructuredDoc | null;
    workspace: ApiPlannerWorkspace | null;
  }) => void | Promise<void>;
  onRunFailed: (message: string) => void;
  onRunPending: () => void;
}

export function usePlannerRunSubmission(options: UsePlannerRunSubmissionOptions) {
  const pollPlannerRunUntilTerminal = useCallback(async (
    runId: string,
    trigger: PlannerRunTrigger,
    instruction: string,
  ) => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const run = await fetchPlannerRun({ runId });

      if (run.status === 'completed' && run.output?.generatedText) {
        const generatedText = run.output.generatedText ?? '';
        const workspace = await options.refreshPlannerWorkspace();
        await options.onRunCompleted({
          trigger,
          instruction,
          generatedText,
          structuredDoc: run.output?.structuredDoc ?? null,
          workspace,
        });
        options.stopPlannerStream();
        options.setPlannerSubmitting(false);
        return true;
      }

      if (run.status === 'failed' || run.status === 'canceled' || run.status === 'timed_out') {
        options.onRunFailed(run.errorMessage ?? '策划生成失败，请稍后重试。');
        options.stopPlannerStream();
        options.setPlannerSubmitting(false);
        return false;
      }
    }

    options.onRunPending();
    options.stopPlannerStream();
    options.setPlannerSubmitting(false);
    return false;
  }, [options]);

  const submitPlannerRunViaApi = useCallback(async (
    trigger: 'generate_outline' | 'update_outline' | 'confirm_outline' | 'rerun',
    instruction: string,
  ) => {
    if (!options.runtimeApi) {
      return false;
    }

    options.setPlannerSubmitting(true);
    const result = await submitPlannerGenerateDoc({
      projectId: options.runtimeApi.projectId,
      episodeId: options.runtimeApi.episodeId,
      prompt: instruction,
      modelFamily: 'doubao-text',
      modelEndpoint: 'ark-doubao-seed-1-8-251228',
    });

    options.startPlannerStream(result.run.id);
    return pollPlannerRunUntilTerminal(result.run.id, trigger, instruction);
  }, [options, pollPlannerRunUntilTerminal]);

  const submitPartialRerunViaApi = useCallback(async (
    rerunScope: PlannerRerunScope,
    instruction: string,
  ) => {
    if (!options.runtimeApi) {
      return false;
    }

    options.setPlannerSubmitting(true);
    const result = await submitPlannerPartialRerun({
      projectId: options.runtimeApi.projectId,
      episodeId: options.runtimeApi.episodeId,
      rerunScope,
      prompt: instruction,
    });

    options.startPlannerStream(result.run.id);
    return pollPlannerRunUntilTerminal(
      result.run.id,
      rerunScope.type === 'subject'
        ? 'subject_only'
        : rerunScope.type === 'scene'
          ? 'scene_only'
          : rerunScope.type === 'act'
            ? 'rerun'
            : 'shots_only',
      instruction,
    );
  }, [options, pollPlannerRunUntilTerminal]);

  const submitPlannerImageGenerationViaApi = useCallback(async (
    scope: 'subject_image' | 'scene_image' | 'shot_image',
    targetPath: string,
    prompt: string,
    referenceAssetIds: string[] = [],
  ) => {
    if (!options.runtimeApi) {
      return false;
    }

    options.setPlannerSubmitting(true);
    const result = await submitPlannerMediaGeneration({
      path: targetPath,
      episodeId: options.runtimeApi.episodeId,
      prompt,
      referenceAssetIds,
    });

    options.startPlannerStream(result.run.id);
    return pollPlannerRunUntilTerminal(result.run.id, scope, prompt);
  }, [options, pollPlannerRunUntilTerminal]);

  return {
    submitPlannerRunViaApi,
    submitPartialRerunViaApi,
    submitPlannerImageGenerationViaApi,
  };
}
