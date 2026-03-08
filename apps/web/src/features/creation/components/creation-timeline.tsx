'use client';

import { cx } from '@aiv/ui';

import type { CreationWorkspaceController } from '../lib/use-creation-workspace';
import { getShotOffset } from '../lib/creation-utils';
import { ShotPoster } from './shot-poster';
import { CreationIcon } from './creation-icons';
import styles from './creation-page.module.css';

interface CreationTimelineProps {
  controller: CreationWorkspaceController;
}

export function CreationTimeline({ controller }: CreationTimelineProps) {
  const { creation, activeShot } = controller;

  return (
    <section className={styles.timelineBar}>
      <div className={styles.timelineControls}>
        <button type="button" className={cx(styles.timelineToggle, creation.playback.subtitleVisible && styles.timelineToggleActive)} onClick={controller.toggleSubtitle}>
          字幕
        </button>
        <button type="button" className={cx(styles.timelinePlayButton, creation.playback.playing && styles.timelinePlayButtonActive)} onClick={controller.togglePlayback}>
          {creation.playback.playing ? '❚❚' : '▶'}
        </button>
        <em>{`${controller.formatClock(creation.playback.currentSecond)} / ${controller.formatClock(creation.playback.totalSecond)}`}</em>
        <input
          className={styles.timelineRange}
          type="range"
          min="0"
          max={String(Math.max(1, creation.playback.totalSecond))}
          step="0.1"
          value={creation.playback.currentSecond}
          onChange={(event) => controller.seekPlayback(Number(event.target.value))}
        />
      </div>
      <div className={styles.timelineShots}>
        {creation.shots.map((shot) => {
          const active = activeShot?.id === shot.id;
          const actionVersionId = shot.pendingApplyVersionId ?? shot.selectedVersionId ?? shot.activeVersionId;

          return (
            <article key={shot.id} className={cx(styles.timelineShot, active && styles.timelineShotActive, shot.status === 'failed' && styles.timelineShotFailed)}>
              <button type="button" className={styles.timelineShotMain} onClick={() => controller.selectShot(shot.id, true)}>
                <ShotPoster shot={shot} size="thumb" accent={controller.shotAccent(shot.id)} caption={shot.title} />
                <div className={styles.timelineShotMeta}>
                  <strong>{shot.title}</strong>
                  <small>{controller.formatShotDuration(shot.durationSeconds)}</small>
                </div>
              </button>
              <div className={cx(styles.timelineShotActions, active && styles.timelineShotActionsVisible)}>
                {shot.status !== 'failed' ? (
                  <button type="button" className={styles.miniActionButton} aria-label="下载分镜" onClick={() => controller.downloadVersion(shot.id, actionVersionId)}>
                    <CreationIcon name="download" className={styles.buttonGlyph} />
                  </button>
                ) : null}
                {shot.pendingApplyVersionId ? (
                  <button type="button" className={styles.miniActionButton} aria-label="替换分镜" onClick={() => controller.applySelectedVersion(shot.id, shot.pendingApplyVersionId ?? undefined)}>
                    <CreationIcon name="replace" className={styles.buttonGlyph} />
                  </button>
                ) : null}
                {shot.status === 'failed' ? (
                  <button type="button" className={cx(styles.miniActionButton, styles.miniActionButtonDanger)} aria-label="重试分镜" onClick={() => controller.retryShot(shot.id)}>
                    <CreationIcon name="retry" className={styles.buttonGlyph} />
                  </button>
                ) : null}
              </div>
              <span className={styles.timelineShotClock}>{controller.formatClock(getShotOffset(creation.shots, shot.id) + shot.durationSeconds)}</span>
            </article>
          );
        })}
      </div>
      <button type="button" className={styles.timelineViewToggle} onClick={() => controller.setViewMode(creation.viewMode === 'storyboard' ? 'default' : 'storyboard')}>
        {creation.viewMode === 'storyboard' ? '默认视图' : '故事版视图'}
      </button>
    </section>
  );
}
