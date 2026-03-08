'use client';

import { cx } from '@aiv/ui';

import type { CreationWorkspaceController } from '../lib/use-creation-workspace';
import { ShotPoster } from './shot-poster';
import { CreationIcon } from './creation-icons';
import styles from './creation-page.module.css';

interface CreationVersionRailProps {
  controller: CreationWorkspaceController;
}

export function CreationVersionRail({ controller }: CreationVersionRailProps) {
  const { activeShot, selectedVersion } = controller;

  if (!activeShot) {
    return null;
  }

  return (
    <aside className={styles.versionRail}>
      <div className={styles.versionRailHeader}>
        <strong>版本轨</strong>
        <small>{`${activeShot.versions.length} 个版本`}</small>
      </div>
      <div className={styles.versionList}>
        {activeShot.versions.map((version) => {
          const selected = selectedVersion?.id === version.id;
          const active = activeShot.activeVersionId === version.id;
          const pending = activeShot.pendingApplyVersionId === version.id;

          return (
            <article key={version.id} className={cx(styles.versionCard, active && styles.versionCardActive, pending && styles.versionCardPending, selected && styles.versionCardSelected)}>
              <button type="button" className={styles.versionSelect} onClick={() => controller.selectVersion(version.id)}>
                <ShotPoster shot={activeShot} size="version" accent={controller.shotAccent(activeShot.id)} caption={version.label} />
              </button>
              <div className={styles.versionCardMeta}>
                <strong>{version.label}</strong>
                <small>{version.modelId}</small>
                <em>{active ? '当前生效' : pending ? '待替换' : '历史版本'}</em>
              </div>
              <div className={styles.versionCardActions}>
                {pending ? (
                  <button type="button" className={styles.miniActionButton} onClick={() => controller.applySelectedVersion(activeShot.id, version.id)}>
                    <CreationIcon name="replace" className={styles.buttonGlyph} />
                    <span>替换</span>
                  </button>
                ) : null}
                <button type="button" className={styles.miniActionButton} onClick={() => controller.downloadVersion(activeShot.id, version.id)}>
                  <CreationIcon name="download" className={styles.buttonGlyph} />
                  <span>下载</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </aside>
  );
}
