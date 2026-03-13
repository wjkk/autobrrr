import { proxyAivApiRoute } from '@/lib/aiv-api';

interface RouteContext {
  params: Promise<{ runId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const { runId } = await context.params;
  return proxyAivApiRoute(request, `/api/runs/${encodeURIComponent(runId)}`);
}
