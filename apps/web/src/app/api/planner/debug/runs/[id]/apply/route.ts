import { proxyAivApiRoute } from '@/lib/aiv-api';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return proxyAivApiRoute(request, `/api/planner/debug/runs/${encodeURIComponent(id)}/apply`);
}
