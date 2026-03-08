import type { PropsWithChildren, ReactNode } from 'react';

import { cx } from './utils';

interface PanelProps {
  title?: string;
  eyebrow?: string;
  actions?: ReactNode;
  className?: string;
}

export function Panel({ title, eyebrow, actions, className, children }: PropsWithChildren<PanelProps>) {
  return (
    <section className={cx('ui-panel', className)}>
      {(eyebrow || title || actions) && (
        <header className="ui-panel__head">
          <div>
            {eyebrow ? <span className="ui-panel__eyebrow">{eyebrow}</span> : null}
            {title ? <h3 className="ui-panel__title">{title}</h3> : null}
          </div>
          {actions ? <div className="ui-panel__actions">{actions}</div> : null}
        </header>
      )}
      <div className="ui-panel__body">{children}</div>
    </section>
  );
}
