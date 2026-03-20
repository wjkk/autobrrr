'use client';

import Link from 'next/link';
import { cx } from '@aiv/ui';
import { type RefObject, type SetStateAction, type Dispatch } from 'react';

import { StageLinks } from '@/features/shared/components/stage-links';

import type { CreationPageData } from '../lib/creation-page-data';
import type { CreationWorkspaceController } from '../lib/use-creation-workspace';
import { CreationIcon } from './creation-icons';
import styles from './creation-page.module.css';

interface CreationPageHeaderProps {
  studio: CreationPageData;
  episodeTitle: string;
  controller: CreationWorkspaceController;
  hasGeneratingShot: boolean;
  exportMenuOpen: boolean;
  exportWatermark: boolean;
  exportMenuRef: RefObject<HTMLDivElement | null>;
  setExportMenuOpen: Dispatch<SetStateAction<boolean>>;
  setExportWatermark: Dispatch<SetStateAction<boolean>>;
  triggerExport: (target: 'full' | 'frames') => void;
}

export function CreationPageHeader({
  studio,
  episodeTitle,
  controller,
  hasGeneratingShot,
  exportMenuOpen,
  exportWatermark,
  exportMenuRef,
  setExportMenuOpen,
  setExportWatermark,
  triggerExport,
}: CreationPageHeaderProps) {
  return (
    <header className={styles.creationHeader}>
      <div className={styles.creationHeaderLeft}>
        <span className={styles.headerBrand} aria-hidden="true">
          <CreationIcon name="brand" className={styles.brandMark} />
        </span>
        <Link href={`/projects/${studio.project.id}/planner`} className={styles.backButton}>
          <CreationIcon name="back" className={styles.buttonGlyph} />
          <span>返回策划</span>
        </Link>
        <h1 className={styles.title}>{episodeTitle}</h1>
      </div>
      <div className={styles.creationHeaderActions}>
        <StageLinks projectId={studio.project.id} activeStage="creation" />
        <div className={styles.membershipPill}>
          <span className={styles.pointBadge}>{`✦ ${controller.creation.points}`}</span>
          <span className={styles.membershipDivider} aria-hidden="true" />
          <button type="button" className={styles.membershipButton}>
            开通会员
          </button>
        </div>
        <button type="button" className={styles.darkPrimaryButton} onClick={() => controller.openBatchDialog('all')} disabled={hasGeneratingShot}>
          一键转视频
        </button>
        <div className={styles.exportMenuWrap} ref={exportMenuRef}>
          <button type="button" className={styles.darkGhostButton} onClick={() => setExportMenuOpen((current) => !current)}>
            导出
          </button>
          {exportMenuOpen ? (
            <div className={styles.exportMenu}>
              <div className={styles.exportWatermarkRow}>
                <span>视频水印</span>
                <button
                  type="button"
                  className={cx(styles.exportSwitch, exportWatermark && styles.exportSwitchActive)}
                  aria-pressed={exportWatermark}
                  onClick={() => setExportWatermark((current) => !current)}
                >
                  <span className={styles.exportSwitchThumb} />
                </button>
              </div>
              <button type="button" className={styles.exportMenuButtonPrimary} onClick={() => triggerExport('full')}>
                导出完整视频
              </button>
              <button type="button" className={styles.exportMenuButton} onClick={() => triggerExport('frames')}>
                导出全部分镜
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
