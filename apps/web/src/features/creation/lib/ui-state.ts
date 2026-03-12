import type { CreationViewMode, Shot } from '@aiv/domain';

export type MaterialTab = 'local' | 'history';
export type BatchTarget = 'all' | 'missing';
export type StoryToolMode = 'crop' | 'frame';
export type StoryToolFocus = 'subject' | 'motion' | 'environment';

export type CreationDialogState =
  | { type: 'none' }
  | { type: 'generate' }
  | { type: 'batch'; target: BatchTarget }
  | { type: 'materials' }
  | { type: 'canvas' }
  | { type: 'lipsync' }
  | { type: 'story-tool'; mode: StoryToolMode }
  | { type: 'model-picker' }
  | { type: 'confirm-model-reset'; nextModel: string };

export interface GenerationDraft {
  model: string;
  resolution: '720P' | '1080P';
  durationMode: '智能' | '4s' | '6s';
  cropToVoice: boolean;
}

export interface CanvasDraft {
  ratio: '9:16' | '16:9' | '1:1';
  zoom: number;
  offsetX: number;
  offsetY: number;
}

export interface StoryToolDraft {
  ratio: CanvasDraft['ratio'];
  clipIn: number;
  clipOut: number;
  focus: StoryToolFocus;
  keepNarration: boolean;
  frameCount: 2 | 3 | 4;
  selectedFrames: number[];
  sourceVersionId: string;
}

export interface ModelPickerDraft {
  selectedModel: string;
  category: 'auto' | 'detail' | 'reference';
}

export function makeGenerationDraft(shot: Shot): GenerationDraft {
  return {
    model: shot.preferredModel,
    resolution: shot.resolution,
    durationMode: shot.durationMode,
    cropToVoice: shot.cropToVoice,
  };
}

export function makeCanvasDraft(shot: Shot): CanvasDraft {
  return {
    ratio: shot.canvasTransform.ratio,
    zoom: shot.canvasTransform.zoom,
    offsetX: shot.canvasTransform.offsetX,
    offsetY: shot.canvasTransform.offsetY,
  };
}

export function makeStoryToolDraft(shot: Shot): StoryToolDraft {
  return {
    ratio: shot.canvasTransform.ratio,
    clipIn: 0,
    clipOut: shot.durationSeconds,
    focus: 'subject',
    keepNarration: true,
    frameCount: 3,
    selectedFrames: [2, 4],
    sourceVersionId: shot.selectedVersionId ?? shot.activeVersionId,
  };
}

export function makeModelPickerDraft(shot: Shot): ModelPickerDraft {
  if (shot.preferredModel.includes('Detail')) {
    return { selectedModel: shot.preferredModel, category: 'detail' };
  }

  if (shot.preferredModel.includes('Reference')) {
    return { selectedModel: shot.preferredModel, category: 'reference' };
  }

  return { selectedModel: shot.preferredModel, category: 'auto' };
}

export function normalizeViewMode(initialView: CreationViewMode | undefined, fallback: CreationViewMode): CreationViewMode {
  return initialView ?? fallback;
}
