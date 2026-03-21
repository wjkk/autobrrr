'use client';

import {
  buildPlannerDialogState,
  buildPlannerDocumentState,
  buildPlannerShellState,
  buildPlannerThreadState,
  type PlannerDialogState,
  type PlannerDocumentState,
  type PlannerShellState,
  type PlannerThreadState,
} from './planner-page-state-slices';

export function usePlannerPageViewState(args: {
  shell: PlannerShellState;
  thread: PlannerThreadState;
  document: PlannerDocumentState;
  dialogs: PlannerDialogState;
}) {
  return {
    shell: buildPlannerShellState(args.shell),
    thread: buildPlannerThreadState(args.thread),
    document: buildPlannerDocumentState(args.document),
    dialogs: buildPlannerDialogState(args.dialogs),
  };
}
