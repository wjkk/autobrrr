import { notFound } from 'next/navigation';

import { PublishPage } from '@/features/publish/components/publish-page';
import { fetchStudioProject } from '@/lib/studio-service';

interface PublishRouteProps {
  params: Promise<{ projectId: string }>;
}

export default async function PublishRoute({ params }: PublishRouteProps) {
  const { projectId } = await params;
  const studio = await fetchStudioProject(projectId);

  if (!studio) {
    notFound();
  }

  return <PublishPage studio={studio} />;
}
