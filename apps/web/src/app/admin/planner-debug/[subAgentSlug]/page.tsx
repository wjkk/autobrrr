import { PlannerAgentDebugPage } from '@/features/planner-debug/components/planner-agent-debug-page';

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

export default async function AdminPlannerDebugDetailPage({ params, searchParams }: PageProps) {
  const { subAgentSlug } = await params;
  const nextSearchParams = searchParams ? await searchParams : undefined;
  return (
    <PlannerAgentDebugPage
      initialSubAgentSlug={decodeURIComponent(subAgentSlug)}
      mode="debug"
      initialReplayRunId={nextSearchParams?.replayRunId}
      initialAutoRun={nextSearchParams?.autoRun === '1'}
      initialProjectId={nextSearchParams?.projectId}
      initialEpisodeId={nextSearchParams?.episodeId}
      initialProjectTitle={nextSearchParams?.projectTitle}
      initialEpisodeTitle={nextSearchParams?.episodeTitle}
      chrome="admin"
    />
  );
}
