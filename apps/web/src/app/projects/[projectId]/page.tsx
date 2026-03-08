import { notFound, redirect } from 'next/navigation';

import { resolveProjectStage } from '@/features/shared/lib/project-stage';
import { fetchStudioProject } from '@/lib/studio-service';

interface ProjectEntryPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectEntryPage({ params }: ProjectEntryPageProps) {
  const { projectId } = await params;
  const studio = await fetchStudioProject(projectId);

  if (!studio) {
    notFound();
  }

  const stage = resolveProjectStage(studio.project.status);
  redirect(`/projects/${projectId}/${stage}`);
}
