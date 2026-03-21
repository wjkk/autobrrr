'use client';

import { useEffect, useState } from 'react';

import {
  fetchPlannerEntityRecommendations,
  type ApiPlannerEntityRecommendation,
  type PlannerRuntimeApiContext,
} from '../lib/planner-api';
import { buildPlannerNoticeFromError, type PlannerNoticeInput } from '../lib/planner-notice';
import type { EntityKind } from './planner-entity-asset-types';

export function usePlannerEntityRecommendations(args: {
  runtimeApi?: PlannerRuntimeApiContext;
  runtimeActiveRefinementId: string | null;
  entityKind: EntityKind;
  entityId: string | null;
  setNotice: (message: PlannerNoticeInput) => void;
  failureMessage: string;
}) {
  const [recommendations, setRecommendations] = useState<ApiPlannerEntityRecommendation[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);

  useEffect(() => {
    if (!args.runtimeApi || !args.runtimeActiveRefinementId || !args.entityId) {
      setRecommendations([]);
      setRecommendationsLoading(false);
      return;
    }

    const controller = new AbortController();
    setRecommendationsLoading(true);
    void fetchPlannerEntityRecommendations({
      projectId: args.runtimeApi.projectId,
      episodeId: args.runtimeApi.episodeId,
      entityKind: args.entityKind,
      entityId: args.entityId,
      signal: controller.signal,
    })
      .then((result) => {
        if (!controller.signal.aborted) {
          setRecommendations(result.recommendations);
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setRecommendations([]);
          args.setNotice(buildPlannerNoticeFromError(error, args.failureMessage));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setRecommendationsLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [args]);

  return {
    recommendations,
    recommendationsLoading,
  };
}
