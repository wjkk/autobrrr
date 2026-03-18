import { PlannerAgentDebugPage } from '@/features/planner-debug/components/planner-agent-debug-page';

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

export default async function AdminPlannerDebugPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : undefined;
  return (
    <PlannerAgentDebugPage
      mode="debug"
      initialReplayRunId={params?.replayRunId}
      initialAutoRun={params?.autoRun === '1'}
      initialProjectId={params?.projectId}
      initialEpisodeId={params?.episodeId}
      initialProjectTitle={params?.projectTitle}
      initialEpisodeTitle={params?.episodeTitle}
      chrome="admin"
    />
  );
}
