import type { CreationWorkspaceController } from '../lib/use-creation-workspace';

export type ComposerMode = 'edit' | 'image' | 'video';

export const EDIT_COST = 1;
export const IMAGE_COST = 2;
export const VIDEO_COST = 8;

export const IMAGE_PROMPT_ASSIST_OPTIONS = [
  { id: 'style', label: '补充画风', suffix: '，现代科技感，电影级灯光，角色形象统一。' },
  { id: 'detail', label: '增强细节', suffix: '，补充材质细节、表情层次和环境质感。' },
  { id: 'camera', label: '加入镜头感', suffix: '，加入景深、构图层次和主体聚焦。' },
] as const;

export function hasVideoResult(shot: CreationWorkspaceController['activeShot']) {
  if (!shot) {
    return false;
  }

  return shot.versions.some((version) => version.mediaKind === 'video');
}

export function getShotBadgeLabel(shotId: string, fallback: string) {
  const index = Number(shotId.match(/(\d+)(?!.*\d)/)?.[1] ?? 0);
  return index > 0 ? `分镜${index}` : fallback;
}

export function getDurationLabel(durationMode: string) {
  if (durationMode === '4s' || durationMode === '6s') {
    return durationMode;
  }

  return '智能';
}

export function canElementConsumeWheel(target: EventTarget | null, boundary: HTMLElement | null, deltaY: number) {
  if (typeof window === 'undefined' || !(target instanceof HTMLElement)) {
    return false;
  }

  let current: HTMLElement | null = target;

  while (current && current !== boundary) {
    const { overflowY } = window.getComputedStyle(current);
    const isScrollable = (overflowY === 'auto' || overflowY === 'scroll') && current.scrollHeight > current.clientHeight + 1;

    if (isScrollable) {
      const atTop = current.scrollTop <= 0;
      const atBottom = current.scrollTop + current.clientHeight >= current.scrollHeight - 1;

      if ((deltaY < 0 && !atTop) || (deltaY > 0 && !atBottom)) {
        return true;
      }
    }

    current = current.parentElement;
  }

  return false;
}
