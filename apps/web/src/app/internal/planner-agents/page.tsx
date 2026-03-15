import { redirect } from 'next/navigation';

interface PageProps {
  searchParams?: Promise<{ subAgentSlug?: string }>;
}

export default async function InternalPlannerAgentsPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : undefined;
  const search = params?.subAgentSlug ? `?subAgentSlug=${encodeURIComponent(params.subAgentSlug)}` : '';
  redirect(`/admin/planner-agents${search}`);
}
