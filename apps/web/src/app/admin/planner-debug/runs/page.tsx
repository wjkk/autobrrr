import { PlannerDebugRunBrowser } from '@/features/planner-debug/components/planner-debug-run-browser';

interface PageProps {
  searchParams?: Promise<{
    projectId?: string;
    episodeId?: string;
    projectTitle?: string;
    episodeTitle?: string;
  }>;
}

export default async function AdminPlannerDebugRunsPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : undefined;
  return (
    <PlannerDebugRunBrowser
      chrome="admin"
      initialProjectId={params?.projectId}
      initialEpisodeId={params?.episodeId}
      initialProjectTitle={params?.projectTitle}
      initialEpisodeTitle={params?.episodeTitle}
    />
  );
}
