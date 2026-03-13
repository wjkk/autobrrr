import { proxyAivApiRoute } from '@/lib/aiv-api';

interface RouteContext {
  params: Promise<{ projectId: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const { projectId } = await context.params;
  return proxyAivApiRoute(request, `/api/projects/${encodeURIComponent(projectId)}/planner/generate-doc`);
}
