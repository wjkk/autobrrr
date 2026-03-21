export type PlannerRefinementEntityError =
  | 'REFINEMENT_REQUIRED'
  | 'REFINEMENT_LOCKED'
  | 'ASSET_NOT_OWNED'
  | 'SUBJECT_NOT_FOUND'
  | 'SCENE_NOT_FOUND'
  | 'SHOT_NOT_FOUND';

export type EntityResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: PlannerRefinementEntityError;
    };

export type PlannerRecommendationEntityError =
  | 'REFINEMENT_REQUIRED'
  | 'SUBJECT_NOT_FOUND'
  | 'SCENE_NOT_FOUND';

export type PlannerRecommendationResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: PlannerRecommendationEntityError;
    };

export interface ScopedEntityArgs {
  projectId: string;
  episodeId: string;
  userId: string;
}
