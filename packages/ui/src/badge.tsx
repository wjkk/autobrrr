import type { PropsWithChildren } from 'react';

import { cx } from './utils';

export interface BadgeProps {
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  showDot?: boolean;
  pulse?: boolean;
  className?: string;
}

export function Badge({ children, tone = 'neutral', showDot = false, pulse = false, className }: PropsWithChildren<BadgeProps>) {
  return (
    <span className={cx('ui-badge', `ui-badge--${tone}`, className)}>
      {showDot && (
        <span className={cx('ui-badge__dot', pulse && 'ui-badge__dot--pulse')} />
      )}
      {children}
    </span>
  );
}
