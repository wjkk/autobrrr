'use client';

import type { MouseEvent, ReactNode } from 'react';

import { cx } from '@aiv/ui';

interface DialogProps {
  open: boolean;
  title: string;
  description?: string;
  footer?: ReactNode;
  size?: 'default' | 'wide';
  onClose: () => void;
  children: ReactNode;
}

export function Dialog({ open, title, description, footer, size = 'default', onClose, children }: DialogProps) {
  if (!open) {
    return null;
  }

  const stopClose = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className={cx('dialog-panel', size === 'wide' && 'dialog-panel--wide')}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={stopClose}
      >
        <header className="dialog-panel__header">
          <div>
            <h2>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          <button type="button" className="dialog-close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </header>
        <div className="dialog-panel__body">{children}</div>
        {footer ? <footer className="dialog-panel__footer">{footer}</footer> : null}
      </div>
    </div>
  );
}
