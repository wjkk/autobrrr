import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ subAgentSlug: string }>;
  searchParams?: Promise<{ replayRunId?: string; autoRun?: string }>;
}

export default async function InternalPlannerDebugDetailPage({ params, searchParams }: PageProps) {
  const { subAgentSlug } = await params;
  const nextSearchParams = searchParams ? await searchParams : undefined;
  const query = new URLSearchParams();
  if (nextSearchParams?.replayRunId) query.set('replayRunId', nextSearchParams.replayRunId);
  if (nextSearchParams?.autoRun) query.set('autoRun', nextSearchParams.autoRun);
  redirect(`/admin/planner-debug/${encodeURIComponent(subAgentSlug)}${query.toString() ? `?${query}` : ''}`);
}
