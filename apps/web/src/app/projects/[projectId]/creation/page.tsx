import { notFound } from 'next/navigation';

import { CreationPage } from '@/features/creation/components/creation-page';
import { fetchCreationStudioProject } from '@/features/creation/lib/creation-api.server';

interface CreationRouteProps {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{
    shotId?: string;
    view?: 'storyboard' | 'default' | 'lipsync';
  }>;
}

export default async function CreationRoute({ params, searchParams }: CreationRouteProps) {
  const [{ projectId }, query] = await Promise.all([params, searchParams]);
  const { studio, error, runtimeApi } = await fetchCreationStudioProject(projectId);

  if (error) {
    throw new Error(error.message);
  }

  if (!studio) {
    notFound();
  }

  return <CreationPage studio={studio} runtimeApi={runtimeApi} initialShotId={query.shotId} initialView={query.view} />;
}
