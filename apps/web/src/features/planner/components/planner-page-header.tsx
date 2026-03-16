'use client';

import styles from './planner-page.module.css';

interface PlannerPageHeaderProps {
  title: string;
  brief: string;
  plannerModeLabel: string;
  onBackToExplore: () => void;
}

export function PlannerPageHeader(props: PlannerPageHeaderProps) {
  return (
    <header className={styles.topBar}>
      <div className={styles.projectIdentity}>
        <span className={styles.projectTag}>策划页</span>
        <h1>{props.title}</h1>
        <p>{props.brief}</p>
      </div>

      <div className={styles.topActions}>
        <span className={styles.modePill}>{props.plannerModeLabel}</span>
        <button type="button" className={styles.topGhostButton} onClick={props.onBackToExplore}>
          返回广场
        </button>
      </div>
    </header>
  );
}
