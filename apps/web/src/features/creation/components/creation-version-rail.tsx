'use client';

import { cx } from '@aiv/ui';

import type { CreationWorkspaceController } from '../lib/use-creation-workspace';
import { ShotPoster } from './shot-poster';
import styles from './creation-page.module.css';

interface CreationVersionRailProps {
  controller: CreationWorkspaceController;
}

export function CreationVersionRail({ controller }: CreationVersionRailProps) {
  const { activeShot, activeVersion, selectedVersion } = controller;

  if (!activeShot || !activeShot.versions.length) {
    return null;
  }

  return (
    <aside className={styles.versionRail} aria-label="版本轨">
      {activeShot.versions.map((version) => {
        const isSelected = version.id === selectedVersion?.id;
        const isActive = version.id === activeVersion?.id;
        const isPending = version.id === activeShot.pendingApplyVersionId;

        return (
          <button
            key={version.id}
            type="button"
            className={cx(
              styles.versionRailCompactCard,
              isSelected && styles.versionRailCompactCardActive,
              isActive && styles.versionRailCompactCardCurrent,
              isPending && styles.versionRailCompactCardPending,
            )}
            onClick={() => controller.selectVersion(version.id)}
            aria-pressed={isSelected}
            aria-label={`${version.label}${isActive ? '，当前生效版本' : isPending ? '，待替换版本' : '，历史版本'}`}
          >
            <ShotPoster
              shot={activeShot}
              versionId={version.id}
              size="version"
              accent={controller.shotAccent(activeShot.id)}
              caption={version.label}
              showTag={false}
              showCaption={false}
            />
          </button>
        );
      })}
    </aside>
  );
}
