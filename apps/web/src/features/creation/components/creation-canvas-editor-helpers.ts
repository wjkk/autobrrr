'use client';

import type { Shot } from '@aiv/domain';

import type { CanvasDraft } from '../lib/ui-state';

export type CanvasEditorTool = 'erase' | 'redraw' | 'add' | 'crop';

export interface EditorPoint {
  x: number;
  y: number;
}

export interface BrushStroke {
  id: string;
  tool: 'erase' | 'redraw';
  size: number;
  points: EditorPoint[];
}

export interface AddedElement {
  id: string;
  x: number;
  y: number;
  label: string;
}

export const TOOL_OPTIONS: Array<{ id: CanvasEditorTool; label: string; icon: 'erase' | 'magic' | 'add' | 'crop' }> = [
  { id: 'erase', label: '消除笔', icon: 'erase' },
  { id: 'redraw', label: '局部重绘', icon: 'magic' },
  { id: 'add', label: '元素添加', icon: 'add' },
  { id: 'crop', label: '剪裁', icon: 'crop' },
];

export const RATIO_OPTIONS = ['9:16', '16:9', '1:1'] as const;
export const VIEWPORT_SCALE_MIN = 30;
export const VIEWPORT_SCALE_MAX = 150;
export const TRANSFORM_ZOOM_MIN = 60;
export const TRANSFORM_ZOOM_MAX = 180;

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function createEditorId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function pointsToPath(points: EditorPoint[]) {
  if (!points.length) {
    return '';
  }

  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
}

export function hasCanvasDraftChange(shot: Shot, canvasDraft: CanvasDraft) {
  return (
    shot.canvasTransform.ratio !== canvasDraft.ratio ||
    shot.canvasTransform.zoom !== canvasDraft.zoom ||
    shot.canvasTransform.offsetX !== canvasDraft.offsetX ||
    shot.canvasTransform.offsetY !== canvasDraft.offsetY ||
    shot.canvasTransform.flipX !== canvasDraft.flipX
  );
}
