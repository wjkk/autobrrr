import { proxyAivApiRoute } from '@/lib/aiv-api';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return proxyAivApiRoute(request, `/api/planner/sub-agent-profiles/${encodeURIComponent(id)}`);
}
