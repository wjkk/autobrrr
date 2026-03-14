import { PlannerAgentDebugPage } from '@/features/planner-debug/components/planner-agent-debug-page';

interface PageProps {
  searchParams?: Promise<{ subAgentSlug?: string }>;
}

export default async function InternalPlannerAgentsPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : undefined;
  return <PlannerAgentDebugPage mode="manage" initialSubAgentSlug={params?.subAgentSlug} />;
}
