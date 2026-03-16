'use client';

import type { SekoActDraft } from './seko-plan-data';

export interface PlannerShotPointer {
  actId: string;
  shotId: string;
}

export interface PlannerShotDraftState {
  visual: string;
  composition: string;
  motion: string;
  voice: string;
  line: string;
}

export function findPlannerShot(
  acts: SekoActDraft[],
  pointer: PlannerShotPointer | null,
) {
  if (!pointer) {
    return null;
  }

  const act = acts.find((item) => item.id === pointer.actId);
  return act?.shots.find((item) => item.id === pointer.shotId) ?? null;
}
