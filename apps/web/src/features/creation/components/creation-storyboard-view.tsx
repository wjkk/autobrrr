'use client';

import { cx } from '@aiv/ui';

import type { CreationWorkspaceController } from '../lib/use-creation-workspace';
import { ShotPoster } from './shot-poster';
import styles from './creation-page.module.css';

interface CreationStoryboardViewProps {
  controller: CreationWorkspaceController;
}

export function CreationStoryboardView({ controller }: CreationStoryboardViewProps) {
  const { creation, activeShot } = controller;

  return (
    <section className={styles.storyboardStage}>
      <div className={styles.storyboardStageHeader}>
        <div className={styles.storyboardStageTitleGroup}>
          <strong>故事板视图</strong>
          <small>按分镜顺序总览当前成片结构，点击卡片可切回对应分镜。</small>
        </div>
      </div>

      <div className={styles.storyboardGrid}>
        {creation.shots.map((shot, index) => {
          const selected = shot.id === activeShot?.id;
          const accent = controller.shotAccent(shot.id);
          return (
            <button
              key={shot.id}
              type="button"
              className={cx(styles.storyboardCard, selected && styles.storyboardCardActive)}
              onClick={() => controller.selectShot(shot.id, true)}
            >
              <div className={styles.storyboardCardHead}>
                <span className={styles.storyboardCardIndex}>{`分镜 ${index + 1}`}</span>
                <span className={styles.storyboardCardDuration}>{controller.formatShotDuration(shot.durationSeconds)}</span>
              </div>

              <ShotPoster
                shot={shot}
                size="sidebar"
                accent={accent}
                className={styles.storyboardPoster}
                showCaption={false}
                showTag={false}
              />

              <div className={styles.storyboardCardMeta}>
                <strong>{shot.title}</strong>
                <p>{shot.imagePrompt}</p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
