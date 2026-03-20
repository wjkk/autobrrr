'use client';

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent } from 'react';

import type { CanvasDraft } from '../lib/ui-state';
import type { CreationWorkspaceController } from '../lib/use-creation-workspace';
import {
  clamp,
  createEditorId,
  type AddedElement,
  type BrushStroke,
  type CanvasEditorTool,
  type EditorPoint,
  TRANSFORM_ZOOM_MAX,
  TRANSFORM_ZOOM_MIN,
  VIEWPORT_SCALE_MAX,
  VIEWPORT_SCALE_MIN,
} from './creation-canvas-editor-helpers';

interface UseCreationCanvasEditorStateOptions {
  controller: CreationWorkspaceController;
  isOpen: boolean;
  shotId?: string;
  canvasDraft: CanvasDraft;
}

function getRelativePoint(event: ReactPointerEvent<HTMLDivElement>, surface: HTMLDivElement | null): EditorPoint | null {
  const rect = surface?.getBoundingClientRect();
  if (!rect) {
    return null;
  }

  const x = clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100);
  const y = clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100);
  return { x, y };
}

export function useCreationCanvasEditorState({ controller, isOpen, shotId, canvasDraft }: UseCreationCanvasEditorStateOptions) {
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
    if (!isOpen) {
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
  }, [isOpen, shotId]);

  useEffect(() => {
    if (!isOpen) {
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

      if (!withMeta || event.key.toLowerCase() !== 'z') {
        return;
      }

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

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [controller, isOpen, redoStrokes, strokes]);

  const updateViewportScale = (value: number) => {
    setViewportScale(clamp(value, VIEWPORT_SCALE_MIN, VIEWPORT_SCALE_MAX));
  };

  const updateCanvasZoom = (nextZoom: number) => {
    controller.setCanvasField('zoom', clamp(nextZoom, TRANSFORM_ZOOM_MIN, TRANSFORM_ZOOM_MAX));
  };

  const handleSurfacePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!surfaceRef.current) {
      return;
    }

    if (tool === 'add') {
      const point = getRelativePoint(event, surfaceRef.current);
      if (!point) {
        return;
      }

      setElements((current) => [
        ...current,
        {
          id: createEditorId('element'),
          x: point.x,
          y: point.y,
          label: `元素 ${current.length + 1}`,
        },
      ]);
      return;
    }

    if (tool === 'erase' || tool === 'redraw') {
      const point = getRelativePoint(event, surfaceRef.current);
      if (!point) {
        return;
      }

      const stroke: BrushStroke = {
        id: createEditorId('stroke'),
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
      const point = getRelativePoint(event, surfaceRef.current);
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

  return {
    tool,
    viewportScale,
    brushSize,
    strokes,
    redoStrokes,
    elements,
    currentStroke,
    surfaceRef,
    activeStrokeCount: strokes.length + (currentStroke ? 1 : 0),
    setTool,
    setBrushSize,
    updateViewportScale,
    updateCanvasZoom,
    handleSurfacePointerDown,
    handleSurfacePointerMove,
    handleSurfacePointerUp,
    handleSurfaceWheel,
    undoStroke,
    redoStroke,
    closeEditor,
    applyEditor,
  };
}
