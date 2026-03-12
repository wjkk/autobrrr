'use client';

import type { CSSProperties } from 'react';

import { cx } from '@aiv/ui';

import { getPlaybackShot, getShotPlaybackWindow, getTimelinePlayheadRatio } from '../lib/creation-playback';
import { getShotOffset } from '../lib/creation-utils';
import type { CreationWorkspaceController } from '../lib/use-creation-workspace';
import { ShotPoster } from './shot-poster';
import { CreationIcon } from './creation-icons';
import styles from './creation-page.module.css';

interface CreationTimelineProps {
  controller: CreationWorkspaceController;
}

const TIMELINE_TILE_WIDTH = 160;
const TIMELINE_TILE_GAP = 8;

export function CreationTimeline({ controller }: CreationTimelineProps) {
  const { creation, activeShot } = controller;
  const playbackShot = getPlaybackShot(creation);
  const playbackWindow = playbackShot ? getShotPlaybackWindow(creation, playbackShot) : null;
  const playheadRatio = getTimelinePlayheadRatio(creation);
  const playheadIndex = playbackShot ? creation.shots.findIndex((shot) => shot.id === playbackShot.id) : -1;
  const playheadLeft = playheadIndex >= 0
    ? playheadIndex * (TIMELINE_TILE_WIDTH + TIMELINE_TILE_GAP) + (playbackWindow?.progress ?? 0) * TIMELINE_TILE_WIDTH
    : 0;

  return (
    <section className={styles.timelineBar}>
      <div className={styles.timelineControls}>
        <button type="button" className={styles.timelineSubtitleToggle} onClick={controller.toggleSubtitle}>
          <span>字幕</span>
          <span className={cx(styles.inlineSwitch, creation.playback.subtitleVisible && styles.inlineSwitchActive)}>
            <i />
          </span>
        </button>

        <div className={styles.timelinePlayGroup}>
          <button
            type="button"
            className={cx(styles.timelinePlayButton, creation.playback.playing && styles.timelinePlayButtonActive)}
            onClick={controller.togglePlayback}
            aria-label={creation.playback.playing ? '暂停播放' : '开始播放'}
          >
            {creation.playback.playing ? '❚❚' : '▶'}
          </button>
          <em>{`${controller.formatClock(creation.playback.currentSecond)}/${controller.formatClock(creation.playback.totalSecond)}`}</em>
        </div>

        <div className={styles.timelineRangeShell} style={{ '--timeline-progress': `${(playheadRatio * 100).toFixed(2)}%` } as CSSProperties}>
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

        <button
          type="button"
          className={cx(styles.timelineViewToggle, styles.darkGhostButton)}
          onClick={() => controller.setViewMode(creation.viewMode === 'storyboard' ? 'default' : 'storyboard')}
        >
          <CreationIcon name="frames" className={styles.buttonGlyph} />
          <span>{creation.viewMode === 'storyboard' ? '默认视图' : '故事版视图'}</span>
        </button>
      </div>

      <div className={styles.timelineShotsWrap}>
        {playbackShot ? (
          <div className={styles.timelinePlayhead} style={{ transform: `translateX(${playheadLeft}px)` }}>
            <span className={styles.timelinePlayheadDot} />
            <span className={styles.timelinePlayheadLine} />
          </div>
        ) : null}

        <div className={styles.timelineShots}>
          {creation.shots.map((shot) => {
            const selected = activeShot?.id === shot.id;
            const playing = playbackShot?.id === shot.id;
            const shotProgress = playing ? playbackWindow?.progress ?? 0 : 0;
            const actionVersionId = shot.pendingApplyVersionId ?? shot.selectedVersionId ?? shot.activeVersionId;

            return (
              <article
                key={shot.id}
                className={cx(
                  styles.timelineShot,
                  selected && styles.timelineShotActive,
                  playing && styles.timelineShotPlaying,
                  shot.status === 'failed' && styles.timelineShotFailed,
                )}
              >
                <button type="button" className={styles.timelineShotMain} onClick={() => controller.selectShot(shot.id, true)}>
                  <ShotPoster shot={shot} size="timeline" accent={controller.shotAccent(shot.id)} showTag={false} showCaption={false} />
                  <span className={styles.timelineShotIndex}>{shot.title}</span>
                  {playing ? <span className={styles.timelineShotProgress} style={{ width: `${(shotProgress * 100).toFixed(2)}%` }} /> : null}
                </button>
                <div className={cx(styles.timelineShotActions, selected && styles.timelineShotActionsVisible)}>
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
      </div>
    </section>
  );
}
