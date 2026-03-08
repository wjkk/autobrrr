import { Badge, Button } from '@aiv/ui';
import { useRouter } from 'next/navigation';
import { StageLinks } from '@/features/shared/components/stage-links';
import styles from './project-header.module.css';

export interface ProjectHeaderProps {
    projectId: string;
    title: string;
    stage: 'planner' | 'creation' | 'publish';
    statusLabel?: string;
    onRefresh?: () => void;
    onContinue?: () => void;
}

export function ProjectHeader({
    projectId,
    title,
    stage,
    statusLabel = '就绪',
    onRefresh,
    onContinue,
}: ProjectHeaderProps) {
    const router = useRouter();

    return (
        <header className={styles.header}>
            <div className={styles.identity}>
                <button
                    className={styles.backButton}
                    onClick={() => router.push('/explore')}
                    aria-label="返回广场"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                </button>
                <div className={styles.titleBlock}>
                    <div className={styles.eyebrowRow}>
                        <span className={styles.brandPill}>AIV Studio</span>
                        <Badge>{statusLabel}</Badge>
                    </div>
                    <h1>{title}</h1>
                </div>
            </div>

            <div className={styles.toolbar}>
                <StageLinks projectId={projectId} activeStage={stage} />
                {onRefresh && (
                    <Button variant="secondary" onClick={onRefresh}>
                        刷新状态
                    </Button>
                )}
                {onContinue && (
                    <Button variant="primary" onClick={onContinue}>
                        继续下一步
                    </Button>
                )}
            </div>
        </header>
    );
}
