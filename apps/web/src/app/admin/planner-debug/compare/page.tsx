import { PlannerAgentDebugPage } from '@/features/planner-debug/components/planner-agent-debug-page';

interface PageProps {
  searchParams?: Promise<{
    projectId?: string;
    episodeId?: string;
    projectTitle?: string;
    episodeTitle?: string;
  }>;
}

export default async function AdminPlannerDebugComparePage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : undefined;
  return (
    <PlannerAgentDebugPage
      mode="debug"
      initialProjectId={params?.projectId}
      initialEpisodeId={params?.episodeId}
      initialProjectTitle={params?.projectTitle}
      initialEpisodeTitle={params?.episodeTitle}
      chrome="admin"
    />
  );
}
