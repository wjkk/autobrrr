'use client';

import { useCallback, useEffect, useState } from 'react';

import { savePlannerDocument, type PlannerRuntimeApiContext } from '../lib/planner-api';
import { buildPlannerNoticeFromError, type PlannerNoticeInput } from '../lib/planner-notice';
import type { PlannerStructuredDoc } from '../lib/planner-structured-doc';

export type PlannerSaveState =
  | { status: 'idle'; message: '' }
  | { status: 'saving'; message: string }
  | { status: 'saved'; message: string }
  | { status: 'error'; message: string };

interface UsePlannerDocumentPersistenceOptions {
  runtimeApi?: PlannerRuntimeApiContext;
  ensureEditableRuntimeRefinement: () => Promise<unknown>;
  setStructuredPlannerDoc: (doc: PlannerStructuredDoc | null) => void;
  setNotice: (message: PlannerNoticeInput) => void;
}

export function usePlannerDocumentPersistence(options: UsePlannerDocumentPersistenceOptions) {
  const [saveState, setSaveState] = useState<PlannerSaveState>({ status: 'idle', message: '' });

  useEffect(() => {
    if (saveState.status !== 'saved') {
      return;
    }

    const timer = window.setTimeout(() => {
      setSaveState({ status: 'idle', message: '' });
    }, 2200);

    return () => window.clearTimeout(timer);
  }, [saveState]);

  const persistPlannerDoc = useCallback(async (nextDoc: PlannerStructuredDoc, successMessage: string) => {
    options.setStructuredPlannerDoc(nextDoc);
    setSaveState({ status: 'saving', message: '正在保存更改...' });

    if (!options.runtimeApi) {
      options.setNotice(successMessage);
      setSaveState({ status: 'saved', message: '已保存到本地状态。' });
      return;
    }

    try {
      await options.ensureEditableRuntimeRefinement();
      await savePlannerDocument({
        projectId: options.runtimeApi.projectId,
        episodeId: options.runtimeApi.episodeId,
        structuredDoc: nextDoc,
      });
      options.setNotice(successMessage);
      setSaveState({ status: 'saved', message: '已同步到后端。' });
    } catch (error) {
      const notice = buildPlannerNoticeFromError(error, '保存策划文档失败。');
      const message = notice.message;
      options.setNotice(notice);
      setSaveState({ status: 'error', message });
    }
  }, [options]);

  return {
    saveState,
    persistPlannerDoc,
  };
}
