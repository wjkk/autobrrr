'use client';

import type { CreationWorkspaceController } from '../lib/use-creation-workspace';
import { hasCanvasDraftChange } from './creation-canvas-editor-helpers';
import { CreationCanvasEditorSidebar } from './creation-canvas-editor-sidebar';
import { CreationCanvasEditorStage } from './creation-canvas-editor-stage';
import { useCreationCanvasEditorState } from './use-creation-canvas-editor-state';
import { CreationIcon } from './creation-icons';
import styles from './creation-canvas-editor.module.css';

export function CreationCanvasEditor({ controller }: { controller: CreationWorkspaceController }) {
  const { dialog, activeShot, activeVersion, selectedVersion, canvasDraft } = controller;
  const editorState = useCreationCanvasEditorState({
    controller,
    isOpen: dialog.type === 'canvas',
    shotId: activeShot?.id,
    canvasDraft,
  });

  if (dialog.type !== 'canvas' || !activeShot) {
    return null;
  }

  const displayVersion = selectedVersion ?? activeVersion;
  const previewShot = {
    ...activeShot,
    canvasTransform: {
      ...activeShot.canvasTransform,
      ...canvasDraft,
    },
  };
  const accent = controller.shotAccent(activeShot.id);
  const historyRecords = [
    {
      id: 'origin',
      title: '原图',
      detail: displayVersion ? `${displayVersion.label} · ${displayVersion.modelId}` : '当前分镜基线',
      shot: activeShot,
    },
    {
      id: 'current',
      title: '当前编辑',
      detail: `${canvasDraft.ratio} · ${canvasDraft.zoom}%${canvasDraft.flipX ? ' · 水平翻转' : ''}`,
      shot: previewShot,
    },
  ];

  return (
    <div className={styles.editorShell}>
      <div className={styles.editorHeader}>
        <div className={styles.editorHeaderEdge}>
          <button type="button" className={styles.backButton} onClick={editorState.closeEditor}>
            <CreationIcon name="back" className={styles.backButtonIcon} />
            <span>返回</span>
          </button>
        </div>
        <div className={styles.zoomBar}>
          <button type="button" className={styles.zoomButton} onClick={() => editorState.updateViewportScale(editorState.viewportScale - 10)}>
            <CreationIcon name="minus" className={styles.zoomButtonIcon} />
          </button>
          <button type="button" className={styles.zoomValue}>
            <span>{`${editorState.viewportScale}%`}</span>
            <CreationIcon name="chevron" className={styles.zoomChevron} />
          </button>
          <button type="button" className={styles.zoomButton} onClick={() => editorState.updateViewportScale(editorState.viewportScale + 10)}>
            <CreationIcon name="plus" className={styles.zoomButtonIcon} />
          </button>
          <button type="button" className={styles.zoomButton} onClick={() => editorState.updateViewportScale(52)}>
            <CreationIcon name="fit" className={styles.zoomButtonIcon} />
          </button>
          <button type="button" className={styles.zoomButton} onClick={editorState.undoStroke} disabled={!editorState.strokes.length}>
            <CreationIcon name="undo" className={styles.zoomButtonIcon} />
          </button>
          <button type="button" className={styles.zoomButton} onClick={editorState.redoStroke} disabled={!editorState.redoStrokes.length}>
            <CreationIcon name="redo" className={styles.zoomButtonIcon} />
          </button>
        </div>
        <div className={styles.editorHeaderEdge}>
          <button type="button" className={styles.applyButton} onClick={editorState.applyEditor}>
            应用修改
          </button>
        </div>
      </div>

      <div className={styles.editorBody}>
        <CreationCanvasEditorStage
          controller={controller}
          previewShot={previewShot}
          displayVersion={displayVersion}
          accent={accent}
          canvasDraft={canvasDraft}
          tool={editorState.tool}
          viewportScale={editorState.viewportScale}
          brushSize={editorState.brushSize}
          strokes={editorState.strokes}
          redoStrokes={editorState.redoStrokes}
          currentStroke={editorState.currentStroke}
          elements={editorState.elements}
          surfaceRef={editorState.surfaceRef}
          setTool={editorState.setTool}
          setBrushSize={editorState.setBrushSize}
          undoStroke={editorState.undoStroke}
          redoStroke={editorState.redoStroke}
          handleSurfacePointerDown={editorState.handleSurfacePointerDown}
          handleSurfacePointerMove={editorState.handleSurfacePointerMove}
          handleSurfacePointerUp={editorState.handleSurfacePointerUp}
          handleSurfaceWheel={editorState.handleSurfaceWheel}
        />

        <CreationCanvasEditorSidebar
          controller={controller}
          accent={accent}
          canvasDraft={canvasDraft}
          historyRecords={historyRecords}
          hasDraftChange={hasCanvasDraftChange(activeShot, canvasDraft)}
          activeStrokeCount={editorState.activeStrokeCount}
          elementCount={editorState.elements.length}
          updateCanvasZoom={editorState.updateCanvasZoom}
        />
      </div>
    </div>
  );
}
