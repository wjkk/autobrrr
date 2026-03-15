import { redirect } from 'next/navigation';

interface PageProps {
  searchParams?: Promise<{ replayRunId?: string; autoRun?: string }>;
}

export default async function InternalPlannerDebugPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : undefined;
  const query = new URLSearchParams();
  if (params?.replayRunId) query.set('replayRunId', params.replayRunId);
  if (params?.autoRun) query.set('autoRun', params.autoRun);
  redirect(`/admin/planner-debug${query.toString() ? `?${query}` : ''}`);
}
