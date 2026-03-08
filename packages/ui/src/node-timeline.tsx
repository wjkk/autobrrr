import type { PropsWithChildren } from 'react';
import { cx } from './utils';

export interface TimelineNode {
    id: string;
    label: string;
    status: 'waiting' | 'running' | 'done' | 'failed';
}

export interface NodeTimelineProps {
    nodes: TimelineNode[];
    activeNodeId?: string;
    className?: string;
}

export function NodeTimeline({ nodes, activeNodeId, className }: NodeTimelineProps) {
    return (
        <ul className={cx('timeline-list', className)}>
            {nodes.map((node, index) => {
                const isActive = node.id === activeNodeId;
                const isLast = index === nodes.length - 1;

                return (
                    <li
                        key={node.id}
                        className={cx(
                            'timeline-list__item',
                            `timeline-list__item--${node.status}`,
                            isActive && 'timeline-list__item--active'
                        )}
                    >
                        <div className="timeline-list__indicator">
                            <span className="timeline-list__dot" />
                            {!isLast && <span className="timeline-list__line" />}
                        </div>
                        <div className="timeline-list__content">
                            <strong className="timeline-list__label">{node.label}</strong>
                            <small className="timeline-list__status-text">
                                {node.status.toUpperCase()}
                            </small>
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}
