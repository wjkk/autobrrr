import { cx } from '@aiv/ui';

import type { PlannerRefinementStatus } from '../../hooks/use-planner-refinement';
import styles from '../planner-page.module.css';

interface PlannerHistoryVersionItem {
  id: string;
  versionNumber: number;
  trigger: 'confirm_outline' | 'rerun';
  status: PlannerRefinementStatus;
  createdAt: number;
}

interface PlannerHistoryMenuProps {
  open: boolean;
  versions: PlannerHistoryVersionItem[];
  activeVersionId: string | null;
  onToggle: () => void;
  onSelect: (versionId: string) => void;
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

function triggerLabel(trigger: 'confirm_outline' | 'rerun') {
  return trigger === 'confirm_outline' ? '确认大纲' : '重新细化';
}

export function PlannerHistoryMenu({ open, versions, activeVersionId, onToggle, onSelect }: PlannerHistoryMenuProps) {
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
        <div className={styles.historyPopover} role="menu" aria-label="细化历史版本">
          {versions.length ? (
            versions
              .slice()
              .reverse()
              .map((item) => {
                const active = item.id === activeVersionId;

                return (
                  <button
                    key={item.id}
                    type="button"
                    role="menuitem"
                    className={cx(styles.historyItem, active && styles.historyItemActive)}
                    onClick={() => onSelect(item.id)}
                  >
                    <div>
                      <strong>V{item.versionNumber}</strong>
                      <span>{triggerLabel(item.trigger)}</span>
                    </div>
                    <div>
                      <small>{formatTime(item.createdAt)}</small>
                      <small>{statusLabel(item.status)}</small>
                    </div>
                  </button>
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
