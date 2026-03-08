import type { PropsWithChildren } from 'react';
import { cx } from './utils';

export interface SideDrawerProps {
    isOpen: boolean;
    title: string;
    onClose: () => void;
    className?: string;
}

export function SideDrawer({ isOpen, title, onClose, children, className }: PropsWithChildren<SideDrawerProps>) {
    if (!isOpen) return null;

    return (
        <div className="side-drawer__backdrop" onClick={onClose}>
            <div
                className={cx('side-drawer__panel', className)}
                onClick={(e) => e.stopPropagation()}
            >
                <header className="side-drawer__header">
                    <h3 className="side-drawer__title">{title}</h3>
                    <button className="side-drawer__close" onClick={onClose} aria-label="Close">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </header>
                <div className="side-drawer__content">
                    {children}
                </div>
            </div>
        </div>
    );
}
