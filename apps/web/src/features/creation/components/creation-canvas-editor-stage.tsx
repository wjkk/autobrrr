'use client';

import { cx } from '@aiv/ui';
import type { PointerEventHandler, RefObject, WheelEventHandler } from 'react';

import type { Shot, ShotVersion } from '@aiv/domain';

import type { CanvasDraft } from '../lib/ui-state';
import type { CreationWorkspaceController } from '../lib/use-creation-workspace';
import type { shotAccent } from '../lib/creation-utils';
import {
  pointsToPath,
  TOOL_OPTIONS,
  type AddedElement,
  type BrushStroke,
  type CanvasEditorTool,
} from './creation-canvas-editor-helpers';
import { CreationIcon } from './creation-icons';
import { ShotPoster } from './shot-poster';
import styles from './creation-canvas-editor.module.css';

interface CreationCanvasEditorStageProps {
  controller: CreationWorkspaceController;
  previewShot: Shot;
  displayVersion: ShotVersion | null;
  accent: ReturnType<typeof shotAccent>;
  canvasDraft: CanvasDraft;
  tool: CanvasEditorTool;
  viewportScale: number;
  brushSize: number;
  strokes: BrushStroke[];
  redoStrokes: BrushStroke[];
  currentStroke: BrushStroke | null;
  elements: AddedElement[];
  surfaceRef: RefObject<HTMLDivElement | null>;
  setTool: (tool: CanvasEditorTool) => void;
  setBrushSize: (value: number) => void;
  undoStroke: () => void;
  redoStroke: () => void;
  handleSurfacePointerDown: PointerEventHandler<HTMLDivElement>;
  handleSurfacePointerMove: PointerEventHandler<HTMLDivElement>;
  handleSurfacePointerUp: PointerEventHandler<HTMLDivElement>;
  handleSurfaceWheel: WheelEventHandler<HTMLDivElement>;
}

export function CreationCanvasEditorStage({
  controller,
  previewShot,
  displayVersion,
  accent,
  canvasDraft,
  tool,
  viewportScale,
  brushSize,
  strokes,
  redoStrokes,
  currentStroke,
  elements,
  surfaceRef,
  setTool,
  setBrushSize,
  undoStroke,
  redoStroke,
  handleSurfacePointerDown,
  handleSurfacePointerMove,
  handleSurfacePointerUp,
  handleSurfaceWheel,
}: CreationCanvasEditorStageProps) {
  return (
    <div className={styles.editorMain}>
      <div className={styles.toolDock}>
        {tool === 'erase' || tool === 'redraw' ? (
          <div className={styles.toolSubbar}>
            <button type="button" className={cx(styles.toolChip, styles.toolChipActive)} onClick={() => setTool(tool)}>
              <CreationIcon name={tool === 'erase' ? 'erase' : 'magic'} className={styles.toolIcon} />
              <span>{tool === 'erase' ? '消除笔' : '局部重绘'}</span>
            </button>
            <button type="button" className={styles.iconChip} onClick={undoStroke} disabled={!strokes.length}>
              <CreationIcon name="undo" className={styles.iconChipGlyph} />
            </button>
            <button type="button" className={styles.iconChip} onClick={redoStroke} disabled={!redoStrokes.length}>
              <CreationIcon name="redo" className={styles.iconChipGlyph} />
            </button>
            <div className={styles.sliderWrap}>
              <span>{`笔刷 ${brushSize}`}</span>
              <input type="range" min="8" max="72" value={brushSize} onChange={(event) => setBrushSize(Number(event.target.value))} />
            </div>
            <button type="button" className={styles.iconChip} onClick={() => setTool('crop')}>
              <CreationIcon name="close" className={styles.iconChipGlyph} />
            </button>
          </div>
        ) : (
          <div className={styles.toolPill}>
            {TOOL_OPTIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={cx(styles.toolChip, tool === item.id && styles.toolChipActive)}
                onClick={() => setTool(item.id)}
              >
                <CreationIcon name={item.icon} className={styles.toolIcon} />
                <span>{item.label}</span>
              </button>
            ))}
            <button
              type="button"
              className={cx(styles.toolChip, canvasDraft.flipX && styles.toolChipActive)}
              onClick={() => controller.setCanvasField('flipX', !canvasDraft.flipX)}
            >
              <CreationIcon name="flip" className={styles.toolIcon} />
              <span>水平翻转</span>
            </button>
          </div>
        )}
      </div>

      <div className={styles.canvasStage}>
        <div className={styles.canvasBackdrop} />
        <div
          ref={surfaceRef}
          className={styles.canvasViewport}
          onPointerDown={handleSurfacePointerDown}
          onPointerMove={handleSurfacePointerMove}
          onPointerUp={handleSurfacePointerUp}
          onPointerCancel={handleSurfacePointerUp}
          onWheel={handleSurfaceWheel}
        >
          <div className={styles.canvasViewportScale} style={{ transform: `scale(${viewportScale / 100})` }}>
            <div className={styles.canvasArtboard} style={{ aspectRatio: canvasDraft.ratio.replace(':', ' / ') }}>
              <ShotPoster
                shot={previewShot}
                versionId={displayVersion?.id}
                size="stage"
                accent={accent}
                showCaption={false}
                showTag={false}
                className={styles.editorPoster}
              />

              <svg className={styles.strokeOverlay} viewBox="0 0 100 100" preserveAspectRatio="none">
                {strokes.map((stroke) => (
                  <path
                    key={stroke.id}
                    d={pointsToPath(stroke.points)}
                    className={cx(styles.strokePath, stroke.tool === 'erase' ? styles.strokePathErase : styles.strokePathRedraw)}
                    style={{ strokeWidth: `${stroke.size / 4}` }}
                  />
                ))}
                {currentStroke ? (
                  <path
                    d={pointsToPath(currentStroke.points)}
                    className={cx(styles.strokePath, currentStroke.tool === 'erase' ? styles.strokePathErase : styles.strokePathRedraw)}
                    style={{ strokeWidth: `${currentStroke.size / 4}` }}
                  />
                ) : null}
              </svg>

              {elements.map((item) => (
                <div key={item.id} className={styles.elementToken} style={{ left: `${item.x}%`, top: `${item.y}%` }}>
                  <CreationIcon name="add" className={styles.elementTokenIcon} />
                  <span>{item.label}</span>
                </div>
              ))}

              <div className={styles.canvasHud}>
                <span>{`${canvasDraft.ratio} · ${canvasDraft.zoom}%`}</span>
                <span>{canvasDraft.flipX ? '已翻转' : '正常方向'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
