import type { PropsWithChildren, ReactNode } from 'react';
import { cx } from './utils';

export interface ShotCardProps {
    id: string;
    sequence: number;
    title: string;
    previewUrl?: string;
    status: 'pending' | 'queued' | 'generating' | 'success' | 'failed';
    statusLabel?: string;
    isActive?: boolean;
    actions?: ReactNode;
    onClick?: () => void;
    className?: string;
}

export function ShotCard({
    sequence,
    title,
    previewUrl,
    status,
    statusLabel,
    isActive,
    actions,
    onClick,
    className,
}: PropsWithChildren<ShotCardProps>) {
    return (
        <div
            role="button"
            tabIndex={onClick ? 0 : undefined}
            onClick={onClick}
            className={cx(
                'shot-card',
                `shot-card--${status}`,
                isActive && 'shot-card--active',
                className
            )}
        >
            <div className="shot-card__preview">
                {previewUrl ? (
                    <img src={previewUrl} alt={title} className="shot-card__img" />
                ) : (
                    <div className="shot-card__placeholder">
                        <span className="shot-card__empty-icon"></span>
                    </div>
                )}
                {actions && (
                    <div className="shot-card__overlay">
                        <div className="hover-card__actions hover-card__actions--top-right">
                            {actions}
                        </div>
                    </div>
                )}
            </div>

            <div className="shot-card__meta">
                <div className="shot-card__header">
                    <em className="shot-card__sequence">#{sequence}</em>
                    <strong className="shot-card__title">{title}</strong>
                </div>
                <div className="shot-card__status">
                    <span className={cx('status-dot', `status-dot--${status}`)} />
                    <small>{statusLabel || status}</small>
                </div>
            </div>
        </div>
    );
}
