'use client';

import { useCallback, useMemo, useState } from 'react';

import {
  findPlannerShot,
  type PlannerShotDraftState,
  type PlannerShotPointer,
} from '../lib/planner-shot-editor';
import type { SekoActDraft } from '../lib/seko-plan-data';

interface UsePlannerShotEditorOptions {
  displayScriptActs: SekoActDraft[];
}

export function usePlannerShotEditor(options: UsePlannerShotEditorOptions) {
  const [editingShot, setEditingShot] = useState<PlannerShotPointer | null>(null);
  const [shotDraft, setShotDraft] = useState<PlannerShotDraftState | null>(null);
  const [shotDeleteDialog, setShotDeleteDialog] = useState<PlannerShotPointer | null>(null);

  const openShotInlineEditor = useCallback((actId: string, shotId: string) => {
    const shot = findPlannerShot(options.displayScriptActs, { actId, shotId });
    if (!shot) {
      return;
    }

    setEditingShot({ actId, shotId });
    setShotDraft({
      visual: shot.visual,
      composition: shot.composition,
      motion: shot.motion,
      voice: shot.voice,
      line: shot.line,
    });
  }, [options.displayScriptActs]);

  const cancelShotInlineEditor = useCallback(() => {
    setEditingShot(null);
    setShotDraft(null);
  }, []);

  const openShotDeleteDialog = useCallback((actId: string, shotId: string) => {
    setShotDeleteDialog({ actId, shotId });
  }, []);

  const closeShotDeleteDialog = useCallback(() => {
    setShotDeleteDialog(null);
  }, []);

  const deletingShot = useMemo(
    () => findPlannerShot(options.displayScriptActs, shotDeleteDialog),
    [options.displayScriptActs, shotDeleteDialog],
  );

  return {
    editingShot,
    shotDraft,
    setShotDraft,
    shotDeleteDialog,
    deletingShot,
    openShotInlineEditor,
    cancelShotInlineEditor,
    openShotDeleteDialog,
    closeShotDeleteDialog,
  };
}
