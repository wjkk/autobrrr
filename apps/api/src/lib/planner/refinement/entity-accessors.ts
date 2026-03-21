import { findOwnedActivePlannerRefinement, verifyOwnedPlannerImageAssets } from './access.js';
import { prisma } from '../../prisma.js';
import { PLANNER_REFINEMENT_LOCKED_ERROR } from './drafts.js';
import type { ScopedEntityArgs } from './entity-service-types.js';

export async function requireEditableRefinementWithDeps(
  args: ScopedEntityArgs,
  deps: {
    findOwnedActivePlannerRefinement: typeof findOwnedActivePlannerRefinement;
  },
) {
  const activeRefinement = await deps.findOwnedActivePlannerRefinement(args.projectId, args.episodeId, args.userId);
  if (!activeRefinement) {
    return { ok: false as const, error: 'REFINEMENT_REQUIRED' as const };
  }

  if (activeRefinement.isConfirmed) {
    return { ok: false as const, error: 'REFINEMENT_LOCKED' as const };
  }

  return { ok: true as const, activeRefinement };
}

export async function requireEditableRefinement(args: ScopedEntityArgs) {
  return requireEditableRefinementWithDeps(args, { findOwnedActivePlannerRefinement });
}

export function readStringList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
}

export {
  findOwnedActivePlannerRefinement,
  prisma,
  PLANNER_REFINEMENT_LOCKED_ERROR,
  verifyOwnedPlannerImageAssets,
};
