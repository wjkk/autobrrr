'use client';

import { usePlannerPageViewState } from './use-planner-page-view-state';
import type {
  PlannerDialogState,
  PlannerDocumentState,
  PlannerShellState,
  PlannerThreadState,
} from './planner-page-state-slices';

export function usePlannerPageSections(args: {
  shell: PlannerShellState;
  thread: PlannerThreadState;
  document: PlannerDocumentState;
  dialogs: PlannerDialogState;
}) {
  return usePlannerPageViewState(args);
}
