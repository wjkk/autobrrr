import { proxyAivApiRoute } from '@/lib/aiv-api';

interface RouteContext {
  params: Promise<{ projectId: string; shotId: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const { projectId, shotId } = await context.params;
  return proxyAivApiRoute(request, `/api/projects/${encodeURIComponent(projectId)}/shots/${encodeURIComponent(shotId)}/generate-video`);
}
