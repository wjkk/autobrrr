'use client';

import type { CreationViewMode } from '@aiv/domain';
import { useEffect, useRef, useState } from 'react';

import type { CreationRuntimeApiContext } from '../lib/creation-api';
import type { CreationPageData } from '../lib/creation-page-data';
import { useCreationWorkspace } from '../lib/use-creation-workspace';
import { CreationCanvasEditor } from './creation-canvas-editor';
import { CreationDialogs } from './creation-dialogs';
import { CreationLipsyncEditor } from './creation-lipsync-editor';
import { CreationPageHeader } from './creation-page-header';
import { CreationSidebar } from './creation-sidebar';
import { CreationTrackRail } from './creation-track-rail';
import { CreationWorkspaceCenter } from './creation-workspace-center';
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
        <CreationPageHeader
          studio={studio}
          episodeTitle={episodeTitle}
          controller={controller}
          hasGeneratingShot={hasGeneratingShot}
          exportMenuOpen={exportMenuOpen}
          exportWatermark={exportWatermark}
          exportMenuRef={exportMenuRef}
          setExportMenuOpen={setExportMenuOpen}
          setExportWatermark={setExportWatermark}
          triggerExport={triggerExport}
        />

        <div className={styles.workspaceFrame}>
          <CreationTrackRail controller={controller} />
          <CreationSidebar controller={controller} />
          <CreationWorkspaceCenter controller={controller} />
        </div>
      </div>

      <CreationCanvasEditor controller={controller} />
      <CreationLipsyncEditor controller={controller} />
      <CreationDialogs controller={controller} />
    </>
  );
}
