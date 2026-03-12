'use client';

import { cx } from '@aiv/ui';

import { getPlaybackSubtitle, getStageMotionStyle } from '../lib/creation-playback';
import type { CreationWorkspaceController } from '../lib/use-creation-workspace';
import { CreationIcon } from './creation-icons';
import { CreationVersionRail } from './creation-version-rail';
import { ShotPoster } from './shot-poster';
import styles from './creation-page.module.css';

interface CreationStageProps {
  controller: CreationWorkspaceController;
}

export function CreationStage({ controller }: CreationStageProps) {
  const { activeShot, activeVersion, selectedVersion, creation, dialog } = controller;

  if (!activeShot) {
    return null;
  }

  const accent = controller.shotAccent(activeShot.id);
  const displayVersion = selectedVersion ?? activeVersion;
  const isGenerating = activeShot.status === 'generating';
  const showReplaceAction = !!displayVersion && displayVersion.id !== activeVersion?.id;
  const stageCaption = getPlaybackSubtitle(creation, activeShot);
  const stageStyle = getStageMotionStyle(creation, activeShot);
  const topTools = [
    {
      id: 'canvas',
      label: '画布编辑',
      icon: 'canvas' as const,
      active: dialog.type === 'canvas',
      onClick: controller.openCanvasDialog,
    },
    {
      id: 'lipsync',
      label: '对口型',
      icon: 'lipsync' as const,
      active: dialog.type === 'lipsync',
      onClick: controller.openLipsyncDialog,
    },
  ];

  return (
    <section className={styles.stageArea} data-tool-open={dialog.type === 'canvas' || dialog.type === 'lipsync' ? 'true' : 'false'}>
      <div className={styles.stageToolbar}>
        <div className={styles.stageToolChips}>
          {topTools.map((item, index) => (
            <div key={item.id} className={styles.stageToolItem}>
              {index > 0 ? <span className={styles.stageToolDivider} aria-hidden="true" /> : null}
              <button
                type="button"
                className={cx(styles.stageToolChip, styles.darkGhostButton, item.active && styles.stageToolChipActive)}
                onClick={item.onClick}
                aria-pressed={item.active}
              >
                <CreationIcon name={item.icon} className={styles.stageToolGlyph} />
                <span>{item.label}</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {controller.notice ? <div className={styles.stageToast}>{controller.notice}</div> : null}

      <div className={styles.stageMain}>
        <div className={styles.stagePreviewShell} data-playing={creation.playback.playing ? 'true' : 'false'} style={stageStyle}>
          <div className={styles.stageAmbientGlow} />

          <div className={styles.stagePosterWrap} data-playing={creation.playback.playing ? 'true' : 'false'}>
            <div className={styles.stagePosterFrame}>
              {displayVersion ? (
                <div className={styles.stagePosterActions} data-visible={showReplaceAction || isGenerating ? 'true' : 'false'}>
                  <button type="button" className={cx(styles.overlayAction, styles.stagePosterActionButton)} onClick={() => controller.downloadVersion(activeShot.id, displayVersion.id)}>
                    <CreationIcon name="download" className={styles.buttonGlyph} />
                    <span>下载</span>
                  </button>
                  {isGenerating ? (
                    <button type="button" className={cx(styles.overlayAction, styles.stagePosterActionButton)} onClick={() => controller.cancelGeneration(activeShot.id)}>
                      <CreationIcon name="close" className={styles.buttonGlyph} />
                      <span>取消生成</span>
                    </button>
                  ) : showReplaceAction ? (
                    <button type="button" className={cx(styles.overlayAction, styles.stagePosterActionButton)} onClick={() => controller.applySelectedVersion(activeShot.id, displayVersion.id)}>
                      <CreationIcon name="replace" className={styles.buttonGlyph} />
                      <span>替换</span>
                    </button>
                  ) : null}
                </div>
              ) : null}

              <div className={styles.stagePosterSurface}>
                <ShotPoster
                  shot={activeShot}
                  versionId={displayVersion?.id}
                  size="stage"
                  accent={accent}
                  showCaption={false}
                  showTag={false}
                />
              </div>

              <div className={styles.stageSubtitleDock} data-hidden={!creation.playback.subtitleVisible || !stageCaption}>
                <span key={`${activeShot.id}-${stageCaption}`} className={styles.stageSubtitleText}>
                  {stageCaption}
                </span>
              </div>
            </div>

            <CreationVersionRail controller={controller} />
          </div>
        </div>
      </div>
    </section>
  );
}
