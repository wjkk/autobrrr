import { PlannerAgentDebugPage } from '@/features/planner-debug/components/planner-agent-debug-page';

interface PageProps {
  searchParams?: Promise<{ replayRunId?: string; autoRun?: string }>;
}

export default async function AdminPlannerDebugPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : undefined;
  return <PlannerAgentDebugPage mode="debug" initialReplayRunId={params?.replayRunId} initialAutoRun={params?.autoRun === '1'} chrome="admin" />;
}
