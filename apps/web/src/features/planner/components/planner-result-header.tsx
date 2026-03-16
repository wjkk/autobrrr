'use client';

import { cx } from '@aiv/ui';

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
  historyMenuOpen: boolean;
  historyVersions: Array<{
    id: string;
    versionNumber: number;
    trigger: string;
    status: 'running' | 'ready' | 'failed';
    createdAt: number;
  }>;
  historyActiveVersionId?: string | null;
  onToggleHistory: () => void;
  onSelectHistoryVersion: (versionId: string) => void | Promise<void>;
}

export function PlannerResultHeader(props: PlannerResultHeaderProps) {
  return (
    <header className={styles.resultHeader}>
      <div className={styles.resultTitleWrap}>
        <h2>
          第{Number.isNaN(props.activeEpisodeNumber) ? 1 : props.activeEpisodeNumber}集：
          {props.activeEpisodeTitle || props.fallbackEpisodeTitle}
        </h2>
        <p>内容由 AI 生成</p>
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
        <PlannerHistoryMenu
          open={props.historyMenuOpen}
          versions={props.historyVersions}
          activeVersionId={props.historyActiveVersionId ?? null}
          onToggle={props.onToggleHistory}
          onSelect={props.onSelectHistoryVersion}
        />
      </div>
    </header>
  );
}
