'use client';

import type { MouseEvent, ReactNode } from 'react';

import { cx } from '@aiv/ui';

import { CreationIcon } from './creation-icons';
import styles from './creation-modal-shell.module.css';

interface CreationModalShellProps {
  open: boolean;
  title: string;
  eyebrow?: string;
  description?: string;
  size?: 'default' | 'compact' | 'wide' | 'xl';
  tone?: 'dark' | 'light';
  footerInfo?: ReactNode;
  footerActions?: ReactNode;
  onClose: () => void;
  children: ReactNode;
}

export function CreationModalShell({
  open,
  title,
  eyebrow,
  description,
  size = 'default',
  tone = 'dark',
  footerInfo,
  footerActions,
  onClose,
  children,
}: CreationModalShellProps) {
  if (!open) {
    return null;
  }

  const stopClose = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  return (
    <div className={cx(styles.backdrop, tone === 'light' && styles.backdropLight)} role="presentation" onClick={onClose}>
      <div
        className={cx(
          styles.panel,
          size === 'compact' && styles.panelCompact,
          size === 'wide' && styles.panelWide,
          size === 'xl' && styles.panelXl,
          tone === 'light' && styles.panelLight,
        )}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={stopClose}
      >
        <header className={styles.header}>
          <div className={styles.titleWrap}>
            {eyebrow ? <span className={styles.eyebrow}>{eyebrow}</span> : null}
            <h2 className={styles.title}>{title}</h2>
            {description ? <p className={styles.description}>{description}</p> : null}
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="关闭">
            <CreationIcon name="close" />
          </button>
        </header>
        <div className={styles.body}>{children}</div>
        {(footerInfo || footerActions) ? (
          <footer className={styles.footer}>
            <div className={styles.footerInfo}>{footerInfo}</div>
            <div className={styles.footerActions}>{footerActions}</div>
          </footer>
        ) : null}
      </div>
    </div>
  );
}
