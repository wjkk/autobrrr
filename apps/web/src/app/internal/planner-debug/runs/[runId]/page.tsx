import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ runId: string }>;
}

export default async function InternalPlannerDebugRunDetailPage({ params }: PageProps) {
  const { runId } = await params;
  redirect(`/admin/planner-debug/runs/${encodeURIComponent(runId)}`);
}
