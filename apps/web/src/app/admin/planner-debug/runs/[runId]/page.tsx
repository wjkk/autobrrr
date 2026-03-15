import { PlannerDebugRunBrowser } from '@/features/planner-debug/components/planner-debug-run-browser';

interface PageProps {
  params: Promise<{ runId: string }>;
}

export default async function AdminPlannerDebugRunDetailPage({ params }: PageProps) {
  const { runId } = await params;
  return <PlannerDebugRunBrowser initialRunId={decodeURIComponent(runId)} chrome="admin" />;
}
