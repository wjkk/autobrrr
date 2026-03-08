import type { CreationTrack, CreationViewMode, ShotStatus, ShotVersionStatus } from './shared';

export interface MaterialAsset {
  id: string;
  label: string;
  source: 'local' | 'history' | 'generated';
  kind: 'image' | 'video';
}

export interface CanvasTransform {
  ratio: '9:16' | '16:9' | '1:1';
  zoom: number;
  offsetX: number;
  offsetY: number;
}

export interface ShotVersion {
  id: string;
  label: string;
  modelId: string;
  status: ShotVersionStatus;
  mediaKind: 'image' | 'video';
  createdAt: string;
}

export interface Shot {
  id: string;
  title: string;
  subtitleText: string;
  narrationText: string;
  imagePrompt: string;
  motionPrompt: string;
  preferredModel: string;
  resolution: '720P' | '1080P';
  durationMode: '智能' | '4s' | '6s';
  durationSeconds: number;
  cropToVoice: boolean;
  status: ShotStatus;
  versions: ShotVersion[];
  activeVersionId: string;
  selectedVersionId: string | null;
  pendingApplyVersionId: string | null;
  materials: MaterialAsset[];
  activeMaterialId: string | null;
  canvasTransform: CanvasTransform;
  lastError: string;
}

export interface CreationPlayback {
  currentSecond: number;
  totalSecond: number;
  playing: boolean;
  subtitleVisible: boolean;
}

export interface VoiceWorkspace {
  voiceName: string;
  emotion: '默认' | '沉稳' | '开心' | '悲伤';
  volume: number;
  speed: number;
}

export interface MusicWorkspace {
  mode: 'ai' | 'library';
  prompt: string;
  trackName: string;
  progress: string;
  volume: number;
  generating: boolean;
  applied: boolean;
}

export interface LipsyncDialogue {
  id: string;
  speaker: string;
  text: string;
}

export interface LipsyncWorkspace {
  mode: 'single' | 'multi';
  inputMode: 'text' | 'audio';
  baseShotId: string;
  audioName: string;
  dialogues: LipsyncDialogue[];
  voiceModel: string;
  emotion: '默认' | '温暖' | '急促';
  volume: number;
  speed: number;
}

export interface CreationWorkspace {
  selectedShotId: string;
  activeTrack: CreationTrack;
  viewMode: CreationViewMode;
  points: number;
  shots: Shot[];
  playback: CreationPlayback;
  voice: VoiceWorkspace;
  music: MusicWorkspace;
  lipSync: LipsyncWorkspace;
}
