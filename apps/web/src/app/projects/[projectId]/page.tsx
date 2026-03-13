import { notFound, redirect } from 'next/navigation';

import { resolveProjectStage } from '@/features/shared/lib/project-stage';
import { requestAivApiFromServer } from '@/lib/aiv-api';

interface ProjectEntryPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectEntryPage({ params }: ProjectEntryPageProps) {
  const { projectId } = await params;
  const project = await requestAivApiFromServer<{
    id: string;
    status: string;
  }>(`/api/studio/projects/${encodeURIComponent(projectId)}`, { allowNotFound: true });

  if (!project) {
    notFound();
  }

  const stage = resolveProjectStage(project.status as Parameters<typeof resolveProjectStage>[0]);
  redirect(`/projects/${projectId}/${stage}`);
}
