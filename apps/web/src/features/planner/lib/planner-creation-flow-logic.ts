import type { ApiPlannerWorkspace } from './planner-api';
import type { SekoActDraft } from './seko-plan-data';

const READY_CREATION_STATUSES = new Set(['ready_for_storyboard', 'export_ready']);

export function hasPlannerShotDrafts(displayScriptActs: SekoActDraft[]) {
  return displayScriptActs.some((act) => act.shots.length > 0);
}

export function hasPlannerCreationReadyStatus(workspace: ApiPlannerWorkspace | null) {
  return READY_CREATION_STATUSES.has(workspace?.project.status ?? '') || READY_CREATION_STATUSES.has(workspace?.episode.status ?? '');
}

export function isPlannerModelSelectionAligned(args: {
  runtimeActiveRefinement: ApiPlannerWorkspace['activeRefinement'];
  storyboardModelId: string;
}) {
  const shots = args.runtimeActiveRefinement?.shotScripts ?? [];
  if (shots.length === 0) {
    return false;
  }

  return shots.every((shot) => !shot.targetModelFamilySlug || shot.targetModelFamilySlug === args.storyboardModelId);
}

export function resolvePlannerCreationActionState(args: {
  runtimeApi?: { projectId: string; episodeId: string };
  runtimeWorkspace: ApiPlannerWorkspace | null;
  runtimeActiveRefinement: ApiPlannerWorkspace['activeRefinement'];
  displayVersionStatus: string | null;
  displayScriptActs: SekoActDraft[];
  remainingPoints: number;
  pointCost: number;
  storyboardModelId: string;
  booting: boolean;
}) {
  const hasRuntimeRefinement = Boolean(args.runtimeActiveRefinement);
  const hasReadyShots = hasPlannerShotDrafts(args.displayScriptActs);
  const hasSufficientPoints = args.remainingPoints >= args.pointCost;
  const creationReady =
    hasRuntimeRefinement
    && (
      args.displayVersionStatus === 'ready'
      || Boolean(args.runtimeActiveRefinement?.isConfirmed)
      || hasPlannerCreationReadyStatus(args.runtimeWorkspace)
    );

  const shouldFinalizeBeforeNavigate =
    Boolean(args.runtimeApi && args.runtimeActiveRefinement)
    && (
      !args.runtimeActiveRefinement?.isConfirmed
      || !hasPlannerCreationReadyStatus(args.runtimeWorkspace)
      || !isPlannerModelSelectionAligned({
        runtimeActiveRefinement: args.runtimeActiveRefinement,
        storyboardModelId: args.storyboardModelId,
      })
    );

  const creationActionLabel = !hasRuntimeRefinement
    ? '确认大纲后可进入创作'
    : shouldFinalizeBeforeNavigate
      ? '确认策划，进入创作'
      : '进入创作';

  const creationActionDisabled =
    args.booting
    || !hasRuntimeRefinement
    || !creationReady
    || !hasReadyShots
    || !hasSufficientPoints;

  return {
    creationReady,
    hasReadyShots,
    hasSufficientPoints,
    shouldFinalizeBeforeNavigate,
    creationActionLabel,
    creationActionDisabled,
  };
}
