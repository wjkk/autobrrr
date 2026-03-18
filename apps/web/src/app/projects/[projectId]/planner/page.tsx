import { notFound } from 'next/navigation';

import { PlannerPage } from '@/features/planner/components/planner-page';
import { fetchPlannerStudioProject } from '@/features/planner/lib/planner-api.server';

interface PlannerRouteProps {
  params: Promise<{ projectId: string }>;
  searchParams?: Promise<{
    episodeId?: string;
  }>;
}

export default async function PlannerRoute({ params, searchParams }: PlannerRouteProps) {
  const { projectId } = await params;
  const nextSearchParams = searchParams ? await searchParams : undefined;
  const { studio, error, runtimeApi, initialGeneratedText, initialPlannerReady, initialWorkspace } = await fetchPlannerStudioProject(
    projectId,
    nextSearchParams?.episodeId,
  );

  if (error) {
    throw new Error(error.message);
  }

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
