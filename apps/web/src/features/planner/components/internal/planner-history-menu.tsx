import { cx } from '@aiv/ui';

import type { PlannerRefinementStatus } from '../../hooks/use-planner-refinement';
import { formatPlannerDebugRunLabel } from '../../lib/planner-page-helpers';
import styles from '../planner-page.module.css';

interface PlannerHistoryVersionItem {
  debugApplySource?: {
    debugRunId: string | null;
    appliedAt: string | null;
  } | null;
  id: string;
  versionNumber: number;
  trigger: string;
  status: PlannerRefinementStatus;
  createdAt: number;
}

interface PlannerHistoryMenuProps {
  open: boolean;
  versions: PlannerHistoryVersionItem[];
  activeVersionId: string | null;
  onToggle: () => void;
  onSelect: (versionId: string) => void;
  onOpenDebugRun?: (debugRunId: string) => void;
}

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusLabel(status: PlannerRefinementStatus) {
  if (status === 'running') {
    return '生成中';
  }

  if (status === 'failed') {
    return '失败';
  }

  return '完成';
}

function triggerLabel(trigger: string) {
  if (trigger === 'confirm_outline') {
    return '确认大纲';
  }

  if (trigger === 'generate_outline') {
    return '生成大纲';
  }

  if (trigger === 'follow_up') {
    return '继续细化';
  }

  if (trigger === 'generate_doc') {
    return '开始细化';
  }

  if (trigger === 'debug_apply') {
    return '调试应用';
  }

  if (trigger === 'subject') {
    return '局部重写主体';
  }

  if (trigger === 'scene') {
    return '局部重写场景';
  }

  if (trigger === 'shot') {
    return '局部重写分镜';
  }

  if (trigger === 'act') {
    return '局部重写幕';
  }

  return '重新细化';
}

export function PlannerHistoryMenu({ open, versions, activeVersionId, onToggle, onSelect, onOpenDebugRun }: PlannerHistoryMenuProps) {
  return (
    <div className={styles.historyMenuWrap}>
      <button type="button" className={styles.historyButton} onClick={onToggle} aria-label="历史版本" aria-expanded={open}>
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path
            d="M10 3.5a6.5 6.5 0 1 1-5.946 3.875"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M2.75 5.25v3.1h3.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M10 6.4v3.7l2.7 1.45" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open ? (
        <div className={styles.historyPopover} role="menu" aria-label="历史版本">
          {versions.length ? (
            versions
              .slice()
              .reverse()
              .map((item) => {
                const active = item.id === activeVersionId;
                const debugRunId = item.debugApplySource?.debugRunId ?? null;

                return (
                  <div key={item.id} className={styles.historyItemRow}>
                    <button
                      type="button"
                      role="menuitem"
                      className={cx(styles.historyItem, active && styles.historyItemActive)}
                      onClick={() => onSelect(item.id)}
                    >
                      <div>
                        <strong>V{item.versionNumber}</strong>
                        <span>
                          {triggerLabel(item.trigger)}
                          {debugRunId ? ` · ${formatPlannerDebugRunLabel(debugRunId)}` : ''}
                        </span>
                      </div>
                      <div>
                        <small>{formatTime(item.createdAt)}</small>
                        <small>{statusLabel(item.status)}</small>
                      </div>
                    </button>
                    {debugRunId && onOpenDebugRun ? (
                      <button
                        type="button"
                        className={styles.historySourceButton}
                        onClick={() => onOpenDebugRun(debugRunId)}
                        aria-label={`查看 ${formatPlannerDebugRunLabel(debugRunId)} 来源`}
                        title="查看来源调试 Run"
                      >
                        来源
                      </button>
                    ) : null}
                  </div>
                );
              })
          ) : (
            <p className={styles.historyEmpty}>暂无历史版本</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
