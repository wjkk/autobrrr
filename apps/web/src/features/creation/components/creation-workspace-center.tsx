'use client';

import { cx } from '@aiv/ui';

import type { CreationWorkspaceController } from '../lib/use-creation-workspace';
import { CreationStage } from './creation-stage';
import { CreationStoryboardView } from './creation-storyboard-view';
import { CreationTimeline } from './creation-timeline';
import styles from './creation-page.module.css';

export function CreationWorkspaceCenter({ controller }: { controller: CreationWorkspaceController }) {
  return (
    <div className={styles.centerColumn} data-view-mode={controller.creation.viewMode}>
      <div className={styles.viewModeRow}>
        {(['storyboard', 'default', 'lipsync'] as const).map((item) => (
          <button
            key={item}
            type="button"
            className={cx(styles.viewModeButton, controller.creation.viewMode === item && styles.viewModeButtonActive)}
            onClick={() => controller.setViewMode(item)}
          >
            {item === 'storyboard' ? '故事版' : item === 'default' ? '默认视图' : '对口型'}
          </button>
        ))}
      </div>
      {controller.creation.viewMode === 'storyboard' ? <CreationStoryboardView controller={controller} /> : <CreationStage controller={controller} />}
      <CreationTimeline controller={controller} />
    </div>
  );
}
