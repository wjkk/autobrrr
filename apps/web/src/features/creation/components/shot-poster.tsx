'use client';

import type { Shot } from '@aiv/domain';
import { cx } from '@aiv/ui';
import type { CSSProperties } from 'react';

import styles from './creation-page.module.css';

interface ShotPosterProps {
  shot: Shot;
  size: 'sidebar' | 'stage' | 'thumb' | 'version';
  caption?: string;
  statusLabel?: string;
  activeMaterialLabel?: string | null;
  className?: string;
  accent: { from: string; to: string; glow: string };
}

export function ShotPoster({ shot, size, caption, statusLabel, activeMaterialLabel, className, accent }: ShotPosterProps) {
  const style = {
    '--poster-from': accent.from,
    '--poster-to': accent.to,
    '--poster-glow': accent.glow,
    '--poster-zoom': `${shot.canvasTransform.zoom / 100}`,
    '--poster-offset-x': `${shot.canvasTransform.offsetX}px`,
    '--poster-offset-y': `${shot.canvasTransform.offsetY}px`,
  } as CSSProperties;

  return (
    <div className={cx(styles.poster, styles[`poster--${size}`], className)} style={style}>
      <div className={styles.posterImage}>
        <div className={styles.posterBokeh} />
        <div className={styles.posterRain} />
        <div className={styles.posterSubject}>
          <span className={styles.posterEarLeft} />
          <span className={styles.posterEarRight} />
          <span className={styles.posterChest} />
        </div>
        <div className={styles.posterReflection} />
      </div>
      <div className={styles.posterNoise} />
      <div className={styles.posterGlow} />
      {activeMaterialLabel ? <span className={styles.posterTag}>{activeMaterialLabel}</span> : null}
      <div className={styles.posterCaption}>
        <small>{shot.title}</small>
        <strong>{caption ?? shot.subtitleText}</strong>
        {statusLabel ? <em>{statusLabel}</em> : null}
      </div>
    </div>
  );
}
