export interface PlannerVideoModelOption {
  id: string;
  name: string;
  hint: string;
}

export const PLANNER_VIDEO_MODEL_OPTIONS: PlannerVideoModelOption[] = [
  {
    id: 'ark-seedance-2-video',
    name: 'Seedance 2.0 多镜头',
    hint: '支持多镜头叙事，适合连续镜头切换预览',
  },
  {
    id: 'platou-veo-video',
    name: 'Veo 3.1 叙事模型',
    hint: '偏电影术语表达，适合英文 cinematic prompt 预览',
  },
  {
    id: 'seko-video',
    name: 'Seko Video 基线',
    hint: '作为保底单镜头模型基线对照',
  },
];

export function findPlannerVideoModelOption(modelSlug: string | null | undefined) {
  if (!modelSlug) {
    return null;
  }

  return PLANNER_VIDEO_MODEL_OPTIONS.find((item) => item.id === modelSlug) ?? null;
}
