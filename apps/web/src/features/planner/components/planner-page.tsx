'use client';

import type { ApiPlannerWorkspace, PlannerRuntimeApiContext } from '../lib/planner-api';
import { PlannerPageContextProvider } from '../lib/planner-page-context';
import type { PlannerPageData } from '../lib/planner-page-data';
import type { PlannerStructuredDoc } from '../lib/planner-structured-doc';
import { usePlannerPageState } from '../hooks/use-planner-page-state';
import { PlannerPageContent } from './planner-page-content';

interface PlannerPageProps {
  studio: PlannerPageData;
  runtimeApi?: PlannerRuntimeApiContext;
  initialGeneratedText?: string | null;
  initialStructuredDoc?: PlannerStructuredDoc | null;
  initialPlannerReady?: boolean;
  initialWorkspace?: ApiPlannerWorkspace | null;
}

export function PlannerPage(props: PlannerPageProps) {
  const state = usePlannerPageState(props);

  return (
    <PlannerPageContextProvider value={state}>
      <PlannerPageContent />
    </PlannerPageContextProvider>
  );
}
