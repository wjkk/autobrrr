import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

import { cx } from './utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}

export function Button({ children, className, variant = 'primary', disabled, ...props }: PropsWithChildren<ButtonProps>) {
  return (
    <button
      {...props}
      disabled={disabled}
      className={cx(
        'ui-button',
        `ui-button--${variant}`,
        disabled && 'ui-button--disabled',
        className
      )}
    >
      {children}
    </button>
  );
}
