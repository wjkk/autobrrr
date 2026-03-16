'use client';

import { useEffect, useState } from 'react';

import { fetchPlannerShotPromptPreview, type ApiPlannerShotPromptPreview, type PlannerRuntimeApiContext } from '../lib/planner-api';
import type { SekoActDraft } from '../lib/seko-plan-data';

interface UsePlannerShotPromptPreviewOptions {
  runtimeApi?: PlannerRuntimeApiContext;
  runtimeActiveRefinementId: string | null;
  displayScriptActs: SekoActDraft[];
  storyboardModelId: string;
}

export function usePlannerShotPromptPreview(options: UsePlannerShotPromptPreviewOptions) {
  const [shotPromptPreview, setShotPromptPreview] = useState<ApiPlannerShotPromptPreview | null>(null);
  const [shotPromptPreviewLoading, setShotPromptPreviewLoading] = useState(false);
  const [shotPromptPreviewError, setShotPromptPreviewError] = useState<string | null>(null);

  useEffect(() => {
    if (!options.runtimeApi || !options.runtimeActiveRefinementId || options.displayScriptActs.length === 0) {
      setShotPromptPreview(null);
      setShotPromptPreviewLoading(false);
      setShotPromptPreviewError(null);
      return;
    }

    const controller = new AbortController();
    setShotPromptPreviewLoading(true);
    setShotPromptPreviewError(null);

    fetchPlannerShotPromptPreview({
      projectId: options.runtimeApi.projectId,
      episodeId: options.runtimeApi.episodeId,
      modelSlug: options.storyboardModelId,
      signal: controller.signal,
    })
      .then((preview) => {
        setShotPromptPreview(preview);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setShotPromptPreview(null);
        setShotPromptPreviewError(error instanceof Error ? error.message : '获取提示词预览失败。');
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setShotPromptPreviewLoading(false);
        }
      });

    return () => controller.abort();
  }, [options.displayScriptActs, options.runtimeActiveRefinementId, options.runtimeApi, options.storyboardModelId]);

  return {
    shotPromptPreview,
    shotPromptPreviewLoading,
    shotPromptPreviewError,
  };
}
