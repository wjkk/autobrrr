import { PlannerDebugRunBrowser } from '@/features/planner-debug/components/planner-debug-run-browser';

interface PageProps {
  params: Promise<{ runId: string }>;
  searchParams?: Promise<{
    projectId?: string;
    episodeId?: string;
    projectTitle?: string;
    episodeTitle?: string;
  }>;
}

export default async function AdminPlannerDebugRunDetailPage({ params, searchParams }: PageProps) {
  const { runId } = await params;
  const nextSearchParams = searchParams ? await searchParams : undefined;
  return (
    <PlannerDebugRunBrowser
      initialRunId={decodeURIComponent(runId)}
      initialProjectId={nextSearchParams?.projectId}
      initialEpisodeId={nextSearchParams?.episodeId}
      initialProjectTitle={nextSearchParams?.projectTitle}
      initialEpisodeTitle={nextSearchParams?.episodeTitle}
      chrome="admin"
    />
  );
}
