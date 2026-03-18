import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ runId: string }>;
  searchParams?: Promise<{
    projectId?: string;
    episodeId?: string;
    projectTitle?: string;
    episodeTitle?: string;
  }>;
}

export default async function InternalPlannerDebugRunDetailPage({ params, searchParams }: PageProps) {
  const { runId } = await params;
  const nextSearchParams = searchParams ? await searchParams : undefined;
  const query = new URLSearchParams();
  if (nextSearchParams?.projectId) query.set('projectId', nextSearchParams.projectId);
  if (nextSearchParams?.episodeId) query.set('episodeId', nextSearchParams.episodeId);
  if (nextSearchParams?.projectTitle) query.set('projectTitle', nextSearchParams.projectTitle);
  if (nextSearchParams?.episodeTitle) query.set('episodeTitle', nextSearchParams.episodeTitle);
  redirect(`/admin/planner-debug/runs/${encodeURIComponent(runId)}${query.toString() ? `?${query}` : ''}`);
}
