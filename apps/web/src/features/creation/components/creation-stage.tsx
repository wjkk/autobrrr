'use client';

import { Badge, cx } from '@aiv/ui';

import type { CreationWorkspaceController } from '../lib/use-creation-workspace';
import { ShotPoster } from './shot-poster';
import { CreationIcon } from './creation-icons';
import styles from './creation-page.module.css';

interface CreationStageProps {
  controller: CreationWorkspaceController;
}

export function CreationStage({ controller }: CreationStageProps) {
  const { activeShot, activeMaterial, creation, pendingVersion } = controller;

  if (!activeShot) {
    return null;
  }

  const accent = controller.shotAccent(activeShot.id);
  const stageCaption = creation.playback.subtitleVisible ? activeShot.subtitleText : '字幕已关闭';
  const topTools = creation.viewMode === 'storyboard'
    ? [
        { id: 'crop', label: '裁剪分镜', icon: 'crop' as const, onClick: () => controller.openStoryboardTool('crop') },
        { id: 'frame', label: '选帧生分镜', icon: 'frames' as const, onClick: () => controller.openStoryboardTool('frame') },
        { id: 'lipsync', label: '对口型', icon: 'lipsync' as const, onClick: () => controller.setViewMode('lipsync') },
      ]
    : [
        { id: 'canvas', label: '画布编辑', icon: 'canvas' as const, onClick: controller.openCanvasDialog },
        { id: 'frame', label: '选版本生分镜', icon: 'frames' as const, onClick: () => controller.openStoryboardTool('frame') },
        { id: 'lipsync', label: '对口型', icon: 'lipsync' as const, onClick: () => controller.setViewMode('lipsync') },
      ];

  return (
    <section className={styles.stageArea}>
      <div className={styles.stageToolbar}>
        <div className={styles.stageToolChips}>
          {topTools.map((item) => (
            <button key={item.id} type="button" className={styles.stageToolChip} onClick={item.onClick}>
              <CreationIcon name={item.icon} className={styles.buttonGlyph} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
        <Badge tone={activeShot.status === 'failed' ? 'danger' : activeShot.status === 'generating' ? 'warning' : 'success'}>
          {controller.statusLabel(activeShot.status)}
        </Badge>
      </div>

      {controller.notice ? <div className={styles.stageToast}>{controller.notice}</div> : null}

      <div className={styles.stageMain}>
        <div className={styles.stagePosterWrap}>
          <div className={styles.stagePosterActions}>
            <button type="button" className={styles.overlayAction} onClick={controller.openCanvasDialog}>
              <CreationIcon name="canvas" className={styles.buttonGlyph} />
              <span>画布编辑</span>
            </button>
            <button type="button" className={styles.overlayAction} onClick={() => controller.setViewMode('lipsync')}>
              <CreationIcon name="lipsync" className={styles.buttonGlyph} />
              <span>对口型</span>
            </button>
            {activeShot.activeVersionId ? (
              <button
                type="button"
                className={styles.overlayAction}
                onClick={() => controller.downloadVersion(activeShot.id, activeShot.pendingApplyVersionId ?? activeShot.selectedVersionId ?? activeShot.activeVersionId)}
              >
                <CreationIcon name="download" className={styles.buttonGlyph} />
                <span>下载</span>
              </button>
            ) : null}
            {pendingVersion ? (
              <button type="button" className={styles.overlayAction} onClick={() => controller.applySelectedVersion(activeShot.id, pendingVersion.id)}>
                <CreationIcon name="replace" className={styles.buttonGlyph} />
                <span>替换</span>
              </button>
            ) : null}
            {activeShot.status === 'failed' ? (
              <button type="button" className={cx(styles.overlayAction, styles.overlayActionDanger)} onClick={() => controller.retryShot(activeShot.id)}>
                <CreationIcon name="retry" className={styles.buttonGlyph} />
                <span>重试</span>
              </button>
            ) : null}
          </div>
          <ShotPoster
            shot={activeShot}
            size="stage"
            accent={accent}
            caption={stageCaption}
            activeMaterialLabel={activeMaterial?.label ?? null}
            statusLabel={activeShot.status === 'success' ? controller.formatShotDuration(activeShot.durationSeconds) : controller.statusLabel(activeShot.status)}
          />
        </div>
        <div className={styles.stageInfoRow}>
          <span>{activeShot.narrationText}</span>
          <small>{`${controller.formatClock(creation.playback.currentSecond)} / ${controller.formatClock(creation.playback.totalSecond)}`}</small>
        </div>
      </div>
    </section>
  );
}
