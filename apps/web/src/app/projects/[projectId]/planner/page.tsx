import { notFound } from 'next/navigation';

import { PlannerPage } from '@/features/planner/components/planner-page';
import { fetchStudioProject } from '@/lib/studio-service';

interface PlannerRouteProps {
  params: Promise<{ projectId: string }>;
}

export default async function PlannerRoute({ params }: PlannerRouteProps) {
  const { projectId } = await params;
  const studio = await fetchStudioProject(projectId);

  if (!studio) {
    notFound();
  }

  return <PlannerPage studio={studio} />;
}
