import type { PropsWithChildren, ReactNode } from 'react';

import { Badge } from './badge';

interface StudioFrameProps {
  brandName: string;
  pageTitle: string;
  pageDescription: string;
  eyebrow: string;
  statusLabel?: string;
  actions?: ReactNode;
}

export function StudioFrame({
  brandName,
  pageTitle,
  pageDescription,
  eyebrow,
  statusLabel,
  actions,
  children,
}: PropsWithChildren<StudioFrameProps>) {
  return (
    <div className="studio-frame">
      <header className="studio-frame__hero">
        <div className="studio-frame__brand-row">
          <div className="studio-frame__brand-mark">A</div>
          <div>
            <span className="studio-frame__eyebrow">{brandName}</span>
            <h1 className="studio-frame__title">{pageTitle}</h1>
          </div>
        </div>
        <div className="studio-frame__summary">
          <p>{pageDescription}</p>
          {statusLabel ? <Badge>{statusLabel}</Badge> : null}
        </div>
        <div className="studio-frame__toolbar">
          <Badge>{eyebrow}</Badge>
          {actions}
        </div>
      </header>
      {children}
    </div>
  );
}
