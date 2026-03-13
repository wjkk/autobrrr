'use client';

import { cx } from '@aiv/ui';
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent } from 'react';

import type { CreationWorkspaceController } from '../lib/use-creation-workspace';
import { CreationIcon } from './creation-icons';
import { ShotPoster } from './shot-poster';
import styles from './creation-canvas-editor.module.css';

type CanvasEditorTool = 'erase' | 'redraw' | 'add' | 'crop';

interface EditorPoint {
  x: number;
  y: number;
}

interface BrushStroke {
  id: string;
  tool: 'erase' | 'redraw';
  size: number;
  points: EditorPoint[];
}

interface AddedElement {
  id: string;
  x: number;
  y: number;
  label: string;
}

const TOOL_OPTIONS: Array<{ id: CanvasEditorTool; label: string; icon: 'erase' | 'magic' | 'add' | 'crop' }> = [
  { id: 'erase', label: '消除笔', icon: 'erase' },
  { id: 'redraw', label: '局部重绘', icon: 'magic' },
  { id: 'add', label: '元素添加', icon: 'add' },
  { id: 'crop', label: '剪裁', icon: 'crop' },
];

const RATIO_OPTIONS = ['9:16', '16:9', '1:1'] as const;
const VIEWPORT_SCALE_MIN = 30;
const VIEWPORT_SCALE_MAX = 150;
const TRANSFORM_ZOOM_MIN = 60;
const TRANSFORM_ZOOM_MAX = 180;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function nextEditorId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function pointsToPath(points: EditorPoint[]) {
  if (!points.length) {
    return '';
  }

  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
}

export function CreationCanvasEditor({ controller }: { controller: CreationWorkspaceController }) {
  const { dialog, activeShot, activeVersion, selectedVersion, canvasDraft } = controller;
  const [tool, setTool] = useState<CanvasEditorTool>('crop');
  const [viewportScale, setViewportScale] = useState(52);
  const [brushSize, setBrushSize] = useState(28);
  const [strokes, setStrokes] = useState<BrushStroke[]>([]);
  const [redoStrokes, setRedoStrokes] = useState<BrushStroke[]>([]);
  const [elements, setElements] = useState<AddedElement[]>([]);
  const [currentStroke, setCurrentStroke] = useState<BrushStroke | null>(null);
  const [dragOrigin, setDragOrigin] = useState<{ pointerId: number; clientX: number; clientY: number; offsetX: number; offsetY: number } | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (dialog.type !== 'canvas') {
      return;
    }

    setTool('crop');
    setViewportScale(52);
    setBrushSize(28);
    setStrokes([]);
    setRedoStrokes([]);
    setElements([]);
    setCurrentStroke(null);
    setDragOrigin(null);
  }, [dialog.type, activeShot?.id]);

  useEffect(() => {
    if (dialog.type !== 'canvas') {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      const withMeta = event.metaKey || event.ctrlKey;
      if (event.key === 'Escape') {
        event.preventDefault();
        controller.resetCanvasDraft();
        controller.setDialog({ type: 'none' });
        return;
      }

      if (withMeta && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          if (!redoStrokes.length) {
            return;
          }
          const nextStroke = redoStrokes[redoStrokes.length - 1];
          setRedoStrokes((current) => current.slice(0, -1));
          setStrokes((current) => [...current, nextStroke]);
          return;
        }

        if (!strokes.length) {
          return;
        }
        const nextStroke = strokes[strokes.length - 1];
        setStrokes((current) => current.slice(0, -1));
        setRedoStrokes((current) => [...current, nextStroke]);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [controller, dialog.type, redoStrokes, strokes]);

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
  const hasDraftChange =
    activeShot.canvasTransform.ratio !== canvasDraft.ratio ||
    activeShot.canvasTransform.zoom !== canvasDraft.zoom ||
    activeShot.canvasTransform.offsetX !== canvasDraft.offsetX ||
    activeShot.canvasTransform.offsetY !== canvasDraft.offsetY ||
    activeShot.canvasTransform.flipX !== canvasDraft.flipX;

  const activeStrokeCount = strokes.length + (currentStroke ? 1 : 0);

  const closeEditor = () => {
    controller.resetCanvasDraft();
    controller.setDialog({ type: 'none' });
  };

  const applyEditor = () => {
    controller.applyCanvasDraft();
    if (strokes.length || elements.length) {
      controller.setNotice('画布构图已应用。局部重绘与元素添加已复刻交互壳，当前仍为前端 mock。');
    }
  };

  const updateViewportScale = (value: number) => {
    setViewportScale(clamp(value, VIEWPORT_SCALE_MIN, VIEWPORT_SCALE_MAX));
  };

  const updateCanvasZoom = (nextZoom: number) => {
    controller.setCanvasField('zoom', clamp(nextZoom, TRANSFORM_ZOOM_MIN, TRANSFORM_ZOOM_MAX));
  };

  const getRelativePoint = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = surfaceRef.current?.getBoundingClientRect();
    if (!rect) {
      return null;
    }

    const x = clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100);
    const y = clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100);
    return { x, y };
  };

  const handleSurfacePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!surfaceRef.current) {
      return;
    }

    if (tool === 'add') {
      const point = getRelativePoint(event);
      if (!point) {
        return;
      }

      setElements((current) => [
        ...current,
        {
          id: nextEditorId('element'),
          x: point.x,
          y: point.y,
          label: `元素 ${current.length + 1}`,
        },
      ]);
      return;
    }

    if (tool === 'erase' || tool === 'redraw') {
      const point = getRelativePoint(event);
      if (!point) {
        return;
      }

      const stroke: BrushStroke = {
        id: nextEditorId('stroke'),
        tool,
        size: brushSize,
        points: [point],
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      setRedoStrokes([]);
      setCurrentStroke(stroke);
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    setDragOrigin({
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      offsetX: canvasDraft.offsetX,
      offsetY: canvasDraft.offsetY,
    });
  };

  const handleSurfacePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (currentStroke) {
      const point = getRelativePoint(event);
      if (!point) {
        return;
      }
      setCurrentStroke((current) => (current ? { ...current, points: [...current.points, point] } : current));
      return;
    }

    if (!dragOrigin || dragOrigin.pointerId !== event.pointerId) {
      return;
    }

    const scaleFactor = viewportScale / 52;
    const nextOffsetX = dragOrigin.offsetX + (event.clientX - dragOrigin.clientX) / scaleFactor;
    const nextOffsetY = dragOrigin.offsetY + (event.clientY - dragOrigin.clientY) / scaleFactor;
    controller.setCanvasField('offsetX', Math.round(nextOffsetX));
    controller.setCanvasField('offsetY', Math.round(nextOffsetY));
  };

  const handleSurfacePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (currentStroke) {
      event.currentTarget.releasePointerCapture(event.pointerId);
      setStrokes((current) => (currentStroke.points.length > 1 ? [...current, currentStroke] : current));
      setCurrentStroke(null);
      return;
    }

    if (dragOrigin && dragOrigin.pointerId === event.pointerId) {
      event.currentTarget.releasePointerCapture(event.pointerId);
      setDragOrigin(null);
    }
  };

  const handleSurfaceWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -4 : 4;
    updateCanvasZoom(canvasDraft.zoom + delta);
  };

  const undoStroke = () => {
    if (!strokes.length) {
      return;
    }

    const nextStroke = strokes[strokes.length - 1];
    setStrokes((current) => current.slice(0, -1));
    setRedoStrokes((current) => [...current, nextStroke]);
  };

  const redoStroke = () => {
    if (!redoStrokes.length) {
      return;
    }

    const nextStroke = redoStrokes[redoStrokes.length - 1];
    setRedoStrokes((current) => current.slice(0, -1));
    setStrokes((current) => [...current, nextStroke]);
  };

  return (
    <div className={styles.editorShell}>
      <div className={styles.editorHeader}>
        <div className={styles.editorHeaderEdge}>
          <button type="button" className={styles.backButton} onClick={closeEditor}>
            <CreationIcon name="back" className={styles.backButtonIcon} />
            <span>返回</span>
          </button>
        </div>

        <div className={styles.zoomBar}>
          <button type="button" className={styles.zoomButton} onClick={() => updateViewportScale(viewportScale - 10)}>
            <CreationIcon name="minus" className={styles.zoomButtonIcon} />
          </button>
          <button type="button" className={styles.zoomValue}>
            <span>{`${viewportScale}%`}</span>
            <CreationIcon name="chevron" className={styles.zoomChevron} />
          </button>
          <button type="button" className={styles.zoomButton} onClick={() => updateViewportScale(viewportScale + 10)}>
            <CreationIcon name="plus" className={styles.zoomButtonIcon} />
          </button>
          <button type="button" className={styles.zoomButton} onClick={() => updateViewportScale(52)}>
            <CreationIcon name="fit" className={styles.zoomButtonIcon} />
          </button>
          <button type="button" className={styles.zoomButton} onClick={undoStroke} disabled={!strokes.length}>
            <CreationIcon name="undo" className={styles.zoomButtonIcon} />
          </button>
          <button type="button" className={styles.zoomButton} onClick={redoStroke} disabled={!redoStrokes.length}>
            <CreationIcon name="redo" className={styles.zoomButtonIcon} />
          </button>
        </div>

        <div className={styles.editorHeaderEdge}>
          <button type="button" className={styles.applyButton} onClick={applyEditor}>
            应用修改
          </button>
        </div>
      </div>

      <div className={styles.editorBody}>
        <div className={styles.editorMain}>
          <div className={styles.toolDock}>
            {(tool === 'erase' || tool === 'redraw') ? (
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

        <aside className={styles.sidePanel}>
          <section className={styles.panelSection}>
            <div className={styles.panelHeader}>
              <strong>生成记录</strong>
              <CreationIcon name="history" className={styles.panelHeaderIcon} />
            </div>
            <div className={styles.historyList}>
              {historyRecords.map((item) => (
                <div key={item.id} className={cx(styles.historyCard, item.id === 'current' && styles.historyCardActive)}>
                  <div className={styles.historyPoster}>
                    <ShotPoster shot={item.shot} size="version" accent={accent} showCaption={false} showTag={false} />
                  </div>
                  <div className={styles.historyMeta}>
                    <strong>{item.title}</strong>
                    <small>{item.detail}</small>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.panelSection}>
            <div className={styles.panelHeader}>
              <strong>构图调整</strong>
              <span className={styles.panelHint}>{hasDraftChange ? '有未应用修改' : '与当前分镜一致'}</span>
            </div>
            <div className={styles.inspectorGroup}>
              <div className={styles.inlineChipRow}>
                {RATIO_OPTIONS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={cx(styles.optionChip, canvasDraft.ratio === item && styles.optionChipActive)}
                    onClick={() => controller.setCanvasField('ratio', item)}
                  >
                    {item}
                  </button>
                ))}
              </div>

              <label className={styles.inspectorField}>
                <span>{`缩放 ${canvasDraft.zoom}%`}</span>
                <input type="range" min={TRANSFORM_ZOOM_MIN} max={TRANSFORM_ZOOM_MAX} value={canvasDraft.zoom} onChange={(event) => updateCanvasZoom(Number(event.target.value))} />
              </label>

              <label className={styles.inspectorField}>
                <span>{`水平偏移 ${canvasDraft.offsetX}px`}</span>
                <input type="range" min="-160" max="160" value={canvasDraft.offsetX} onChange={(event) => controller.setCanvasField('offsetX', Number(event.target.value))} />
              </label>

              <label className={styles.inspectorField}>
                <span>{`垂直偏移 ${canvasDraft.offsetY}px`}</span>
                <input type="range" min="-160" max="160" value={canvasDraft.offsetY} onChange={(event) => controller.setCanvasField('offsetY', Number(event.target.value))} />
              </label>
            </div>
          </section>

          <section className={styles.panelSection}>
            <div className={styles.panelHeader}>
              <strong>当前会话</strong>
              <span className={styles.panelHint}>{`笔触 ${activeStrokeCount} · 元素 ${elements.length}`}</span>
            </div>
            <div className={styles.sessionList}>
              <div className={styles.sessionItem}>
                <span>拖拽画布</span>
                <small>在预览区直接拖拽调整构图，滚轮缩放内容。</small>
              </div>
              <div className={styles.sessionItem}>
                <span>局部重绘</span>
                <small>已复刻笔刷与撤销交互，当前不调用真实图像编辑后端。</small>
              </div>
              <div className={styles.sessionItem}>
                <span>元素添加</span>
                <small>点击画布可落点，用于先复刻源站的操作流。</small>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
