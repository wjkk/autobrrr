import { redirect } from 'next/navigation';

interface PageProps {
  searchParams?: Promise<{
    replayRunId?: string;
    autoRun?: string;
    projectId?: string;
    episodeId?: string;
    projectTitle?: string;
    episodeTitle?: string;
  }>;
}

export default async function InternalPlannerDebugPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : undefined;
  const query = new URLSearchParams();
  if (params?.replayRunId) query.set('replayRunId', params.replayRunId);
  if (params?.autoRun) query.set('autoRun', params.autoRun);
  if (params?.projectId) query.set('projectId', params.projectId);
  if (params?.episodeId) query.set('episodeId', params.episodeId);
  if (params?.projectTitle) query.set('projectTitle', params.projectTitle);
  if (params?.episodeTitle) query.set('episodeTitle', params.episodeTitle);
  redirect(`/admin/planner-debug${query.toString() ? `?${query}` : ''}`);
}
