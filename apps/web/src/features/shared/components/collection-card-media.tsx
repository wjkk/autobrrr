'use client';

import type { CSSProperties, ReactNode } from 'react';

import styles from './collection-card-media.module.css';

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

export function CollectionCardMedia(props: {
  imageUrl?: string | null;
  alt: string;
  aspectRatio: string;
  children?: ReactNode;
  className?: string;
  imageClassName?: string;
  imageStyle?: CSSProperties;
  fullBleed?: boolean;
  hoverScale?: 'self' | 'parent' | 'none';
}) {
  return (
    <div
      className={joinClasses(
        styles.frame,
        props.fullBleed && styles.frameFullBleed,
        props.hoverScale === 'self' && styles.frameHoverScale,
        props.hoverScale === 'parent' && styles.frameHoverScaleParent,
        props.className,
      )}
      style={{ aspectRatio: props.aspectRatio }}
    >
      {props.imageUrl ? (
        <img
          src={props.imageUrl}
          alt={props.alt}
          className={joinClasses(styles.image, props.imageClassName)}
          style={props.imageStyle}
        />
      ) : null}
      {props.children}
    </div>
  );
}
