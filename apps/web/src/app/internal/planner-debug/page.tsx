import { PlannerAgentDebugPage } from '@/features/planner-debug/components/planner-agent-debug-page';

interface PageProps {
  searchParams?: Promise<{ replayRunId?: string }>;
}

export default async function InternalPlannerDebugPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : undefined;
  return <PlannerAgentDebugPage mode="debug" initialReplayRunId={params?.replayRunId} />;
}
