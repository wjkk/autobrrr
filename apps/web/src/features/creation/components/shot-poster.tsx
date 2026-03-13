'use client';

import type { Shot } from '@aiv/domain';
import { cx } from '@aiv/ui';
import type { CSSProperties } from 'react';

import { getCreationShotMediaUrl, getCreationVersionMediaUrl } from '../lib/creation-media';
import { CreationIcon } from './creation-icons';
import styles from './creation-page.module.css';

interface ShotPosterProps {
  shot: Shot;
  size: 'sidebar' | 'stage' | 'thumb' | 'version' | 'timeline';
  caption?: string;
  statusLabel?: string;
  activeMaterialLabel?: string | null;
  className?: string;
  accent: { from: string; to: string; glow: string };
  showCaption?: boolean;
  showTag?: boolean;
  versionId?: string | null;
}

export function ShotPoster({
  shot,
  size,
  caption,
  statusLabel,
  activeMaterialLabel,
  className,
  accent,
  showCaption = true,
  showTag = true,
  versionId,
}: ShotPosterProps) {
  const mediaUrl = versionId ? getCreationVersionMediaUrl(shot.id, versionId) : getCreationShotMediaUrl(shot.id);
  const style = {
    '--poster-from': accent.from,
    '--poster-to': accent.to,
    '--poster-glow': accent.glow,
    '--poster-zoom': `${shot.canvasTransform.zoom / 100}`,
    '--poster-offset-x': `${shot.canvasTransform.offsetX}px`,
    '--poster-offset-y': `${shot.canvasTransform.offsetY}px`,
    '--poster-flip-x': shot.canvasTransform.flipX ? -1 : 1,
  } as CSSProperties;

  return (
    <div className={cx(styles.poster, styles[`poster--${size}`], className)} style={style} data-status={shot.status} data-has-media={mediaUrl ? 'true' : 'false'}>
      <div className={styles.posterImage}>
        {mediaUrl ? <img className={styles.posterMedia} src={mediaUrl} alt={shot.title} loading="lazy" /> : null}
        <div className={styles.posterBokeh} />
        <div className={styles.posterRain} />
        {!mediaUrl ? (
          <div className={styles.posterSubject}>
            <span className={styles.posterEarLeft} />
            <span className={styles.posterEarRight} />
            <span className={styles.posterChest} />
          </div>
        ) : null}
        <div className={styles.posterReflection} />
      </div>
      <div className={styles.posterNoise} />
      <div className={styles.posterGlow} />
      {showTag && activeMaterialLabel ? <span className={styles.posterTag}>{activeMaterialLabel}</span> : null}
      {showCaption ? (
        <div className={styles.posterCaption}>
          <small className={size === 'timeline' ? styles.posterCaptionRow : undefined}>
            {size === 'timeline' ? <CreationIcon name="image" className={styles.posterCaptionIcon} /> : null}
            <span>{shot.title}</span>
          </small>
          <strong>{caption ?? shot.subtitleText}</strong>
          {statusLabel ? <em>{statusLabel}</em> : null}
        </div>
      ) : null}
    </div>
  );
}
