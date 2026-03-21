'use client';

import type { UsePlannerPageStateResult } from '../hooks/use-planner-page-state';
import { PlannerThreadComposer } from './internal/planner-thread-composer';
import { PlannerThreadRuntime } from './internal/planner-thread-runtime';
import { PlannerThreadSeed } from './internal/planner-thread-seed';
import styles from './planner-page.module.css';

interface PlannerThreadPanelProps {
  thread: UsePlannerPageStateResult['thread'];
}

export function PlannerThreadPanel({ thread }: PlannerThreadPanelProps) {
  const showConfirmOutlinePrompt = Boolean(thread.usingRuntimePlanner && thread.runtimeActiveOutline && !thread.outlineConfirmed);
  const showActiveDebugApplyNotice = thread.runtimeActiveRefinement?.triggerType?.toLowerCase() === 'debug_apply';
  const activeDebugRunId = thread.activeDebugApplySource?.debugRunId ?? null;

  return (
    <div className={styles.commandColumn}>
      <div className={styles.messageScroll}>
        {thread.usingRuntimePlanner && thread.messages.length > 0 ? (
          <PlannerThreadRuntime
            thread={thread}
            showConfirmOutlinePrompt={showConfirmOutlinePrompt}
            showActiveDebugApplyNotice={showActiveDebugApplyNotice}
            activeDebugRunId={activeDebugRunId}
          />
        ) : (
          <PlannerThreadSeed thread={thread} />
        )}
      </div>

      <PlannerThreadComposer thread={thread} />
    </div>
  );
}
