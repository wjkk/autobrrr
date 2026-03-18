import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ subAgentSlug: string }>;
  searchParams?: Promise<{
    replayRunId?: string;
    autoRun?: string;
    projectId?: string;
    episodeId?: string;
    projectTitle?: string;
    episodeTitle?: string;
  }>;
}

export default async function InternalPlannerDebugDetailPage({ params, searchParams }: PageProps) {
  const { subAgentSlug } = await params;
  const nextSearchParams = searchParams ? await searchParams : undefined;
  const query = new URLSearchParams();
  if (nextSearchParams?.replayRunId) query.set('replayRunId', nextSearchParams.replayRunId);
  if (nextSearchParams?.autoRun) query.set('autoRun', nextSearchParams.autoRun);
  if (nextSearchParams?.projectId) query.set('projectId', nextSearchParams.projectId);
  if (nextSearchParams?.episodeId) query.set('episodeId', nextSearchParams.episodeId);
  if (nextSearchParams?.projectTitle) query.set('projectTitle', nextSearchParams.projectTitle);
  if (nextSearchParams?.episodeTitle) query.set('episodeTitle', nextSearchParams.episodeTitle);
  redirect(`/admin/planner-debug/${encodeURIComponent(subAgentSlug)}${query.toString() ? `?${query}` : ''}`);
}
