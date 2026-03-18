import { redirect } from 'next/navigation';

interface PageProps {
  searchParams?: Promise<{
    projectId?: string;
    episodeId?: string;
    projectTitle?: string;
    episodeTitle?: string;
  }>;
}

export default async function InternalPlannerDebugRunsPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : undefined;
  const query = new URLSearchParams();
  if (params?.projectId) query.set('projectId', params.projectId);
  if (params?.episodeId) query.set('episodeId', params.episodeId);
  if (params?.projectTitle) query.set('projectTitle', params.projectTitle);
  if (params?.episodeTitle) query.set('episodeTitle', params.episodeTitle);
  redirect(`/admin/planner-debug/runs${query.toString() ? `?${query}` : ''}`);
}
