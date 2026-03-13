import { notFound } from 'next/navigation';

import { PublishPage } from '@/features/publish/components/publish-page';
import { fetchPublishStudioProject } from '@/features/publish/lib/publish-api.server';

interface PublishRouteProps {
  params: Promise<{ projectId: string }>;
}

export default async function PublishRoute({ params }: PublishRouteProps) {
  const { projectId } = await params;
  const { studio, runtimeApi, initialPublishWorkspace } = await fetchPublishStudioProject(projectId);

  if (!studio) {
    notFound();
  }

  return <PublishPage studio={studio} runtimeApi={runtimeApi} initialPublishWorkspace={initialPublishWorkspace} />;
}
