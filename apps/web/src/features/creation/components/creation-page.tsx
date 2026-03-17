'use client';

import type { CreationViewMode } from '@aiv/domain';
import Link from 'next/link';
import { cx } from '@aiv/ui';
import { useEffect, useRef, useState } from 'react';

import { StageLinks } from '@/features/shared/components/stage-links';

import type { CreationRuntimeApiContext } from '../lib/creation-api';
import type { CreationPageData } from '../lib/creation-page-data';
import { useCreationWorkspace } from '../lib/use-creation-workspace';
import { CreationCanvasEditor } from './creation-canvas-editor';
import { CreationDialogs } from './creation-dialogs';
import { CreationIcon } from './creation-icons';
import { CreationLipsyncEditor } from './creation-lipsync-editor';
import { CreationSidebar } from './creation-sidebar';
import { CreationStage } from './creation-stage';
import { CreationStoryboardView } from './creation-storyboard-view';
import { CreationTimeline } from './creation-timeline';
import styles from './creation-page.module.css';

interface CreationPageProps {
  studio: CreationPageData;
  runtimeApi?: CreationRuntimeApiContext;
  initialShotId?: string;
  initialView?: CreationViewMode;
}

export function CreationPage({ studio, runtimeApi, initialShotId, initialView }: CreationPageProps) {
  const controller = useCreationWorkspace({ studio, runtimeApi, initialShotId, initialView });
  const episodeTitle = studio.episodes[0]?.title ?? '第1集';
  const hasGeneratingShot = controller.creation.shots.some((shot) => shot.status === 'generating');
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exportWatermark, setExportWatermark] = useState(true);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (exportMenuRef.current && !exportMenuRef.current.contains(target)) {
        setExportMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const triggerExport = (target: 'full' | 'frames') => {
    setExportMenuOpen(false);
    controller.setNotice(target === 'full' ? `已开始导出${exportWatermark ? '完整视频（带水印）' : '完整视频'}。` : '已开始导出全部分镜。');
  };

  return (
    <>
      <div className={styles.creationShell}>
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

        <div className={styles.workspaceFrame}>
          <nav className={styles.trackRail} aria-label="分轨工作区">
            <span className={styles.railBrand} aria-hidden="true">
              <CreationIcon name="brand" className={styles.brandMark} />
            </span>
            {([
              { id: 'visual', label: '画面', icon: 'image' },
              { id: 'voice', label: '配音', icon: 'voice' },
              { id: 'music', label: '音乐', icon: 'music' },
            ] as const).map((item) => (
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

          <CreationSidebar controller={controller} />

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
        </div>
      </div>

      <CreationCanvasEditor controller={controller} />
      <CreationLipsyncEditor controller={controller} />
      <CreationDialogs controller={controller} />
    </>
  );
}
