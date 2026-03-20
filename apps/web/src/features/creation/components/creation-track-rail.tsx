'use client';

import { cx } from '@aiv/ui';

import type { CreationWorkspaceController } from '../lib/use-creation-workspace';
import { CreationIcon } from './creation-icons';
import styles from './creation-page.module.css';

const TRACK_ITEMS = [
  { id: 'visual', label: '画面', icon: 'image' },
  { id: 'voice', label: '配音', icon: 'voice' },
  { id: 'music', label: '音乐', icon: 'music' },
] as const;

export function CreationTrackRail({ controller }: { controller: CreationWorkspaceController }) {
  return (
    <nav className={styles.trackRail} aria-label="分轨工作区">
      <span className={styles.railBrand} aria-hidden="true">
        <CreationIcon name="brand" className={styles.brandMark} />
      </span>
      {TRACK_ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          className={cx(styles.trackButton, controller.creation.activeTrack === item.id && styles.trackButtonActive)}
          onClick={() => controller.setActiveTrack(item.id)}
        >
          <span className={styles.trackButtonIcon} aria-hidden="true">
            <CreationIcon name={item.icon} className={cx(styles.buttonGlyph, styles.trackButtonGlyph)} />
          </span>
          <span className={styles.trackButtonLabel}>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
