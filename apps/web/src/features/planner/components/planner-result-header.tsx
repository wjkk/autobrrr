'use client';

import { cx } from '@aiv/ui';

import { formatPlannerDebugRunLabel } from '../lib/planner-page-helpers';
import { PlannerHistoryMenu } from './internal/planner-history-menu';
import styles from './planner-page.module.css';

interface PlannerResultHeaderProps {
  activeEpisodeNumber: number;
  activeEpisodeTitle: string;
  fallbackEpisodeTitle: string;
  saveState:
    | { status: 'idle'; message: '' }
    | { status: 'saving'; message: string }
    | { status: 'saved'; message: string }
    | { status: 'error'; message: string };
  activeDebugApplySource?: {
    debugRunId: string | null;
    appliedAt: string | null;
  } | null;
  historyMenuOpen: boolean;
  historyVersions: Array<{
    debugApplySource?: {
      debugRunId: string | null;
      appliedAt: string | null;
    } | null;
    id: string;
    versionNumber: number;
    trigger: string;
    status: 'running' | 'ready' | 'failed';
    createdAt: number;
  }>;
  historyActiveVersionId?: string | null;
  onOpenDebugRun?: (debugRunId: string) => void;
  onToggleHistory: () => void;
  onSelectHistoryVersion: (versionId: string) => void | Promise<void>;
}

export function PlannerResultHeader(props: PlannerResultHeaderProps) {
  const activeDebugRunId = props.activeDebugApplySource?.debugRunId ?? null;

  return (
    <header className={styles.resultHeader}>
      <div className={styles.resultTitleWrap}>
        <h2>
          第{Number.isNaN(props.activeEpisodeNumber) ? 1 : props.activeEpisodeNumber}集：
          {props.activeEpisodeTitle || props.fallbackEpisodeTitle}
        </h2>
        <div className={styles.resultMetaRow}>
          <p>内容由 AI 生成</p>
          {props.activeDebugApplySource ? (
            <span className={styles.debugApplyBadge}>
              当前版本来自调试应用
              {props.activeDebugApplySource.debugRunId ? ` · ${formatPlannerDebugRunLabel(props.activeDebugApplySource.debugRunId)}` : ''}
            </span>
          ) : null}
        </div>
      </div>
      <div className={styles.resultHeaderActions}>
        {props.saveState.status !== 'idle' ? (
          <div
            className={cx(
              styles.saveStatusBadge,
              props.saveState.status === 'saving' && styles.saveStatusBadgeSaving,
              props.saveState.status === 'saved' && styles.saveStatusBadgeSaved,
              props.saveState.status === 'error' && styles.saveStatusBadgeError,
            )}
          >
            <span className={styles.saveStatusDot} />
            <span>{props.saveState.message}</span>
          </div>
        ) : null}
        {activeDebugRunId && props.onOpenDebugRun ? (
          <button type="button" className={styles.topGhostButton} onClick={() => props.onOpenDebugRun?.(activeDebugRunId)}>
            查看调试 Run
          </button>
        ) : null}
        <PlannerHistoryMenu
          open={props.historyMenuOpen}
          versions={props.historyVersions}
          activeVersionId={props.historyActiveVersionId ?? null}
          onToggle={props.onToggleHistory}
          onSelect={props.onSelectHistoryVersion}
          onOpenDebugRun={props.onOpenDebugRun}
        />
      </div>
    </header>
  );
}
