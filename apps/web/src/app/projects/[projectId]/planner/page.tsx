import { notFound } from 'next/navigation';

import { PlannerPage } from '@/features/planner/components/planner-page';
import { fetchPlannerStudioProject } from '@/features/planner/lib/planner-api.server';

interface PlannerRouteProps {
  params: Promise<{ projectId: string }>;
}

export default async function PlannerRoute({ params }: PlannerRouteProps) {
  const { projectId } = await params;
  const { studio, runtimeApi, initialGeneratedText, initialPlannerReady, initialWorkspace } = await fetchPlannerStudioProject(projectId);

  if (!studio) {
    notFound();
  }

  return (
    <PlannerPage
      studio={studio}
      runtimeApi={runtimeApi}
      initialGeneratedText={initialGeneratedText}
      initialPlannerReady={initialPlannerReady}
      initialWorkspace={initialWorkspace}
    />
  );
}
