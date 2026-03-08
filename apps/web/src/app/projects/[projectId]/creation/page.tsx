import { notFound } from 'next/navigation';

import { CreationPage } from '@/features/creation/components/creation-page';
import { fetchStudioProject } from '@/lib/studio-service';

interface CreationRouteProps {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{
    shotId?: string;
    view?: 'storyboard' | 'default' | 'lipsync';
  }>;
}

export default async function CreationRoute({ params, searchParams }: CreationRouteProps) {
  const [{ projectId }, query] = await Promise.all([params, searchParams]);
  const studio = await fetchStudioProject(projectId);

  if (!studio) {
    notFound();
  }

  return <CreationPage studio={studio} initialShotId={query.shotId} initialView={query.view} />;
}
