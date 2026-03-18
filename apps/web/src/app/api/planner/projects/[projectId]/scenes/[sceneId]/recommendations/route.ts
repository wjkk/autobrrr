import { proxyAivApiRoute } from '@/lib/aiv-api';

interface RouteContext {
  params: Promise<{ projectId: string; sceneId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const { projectId, sceneId } = await context.params;
  const search = new URL(request.url).search;
  return proxyAivApiRoute(
    request,
    `/api/projects/${encodeURIComponent(projectId)}/planner/scenes/${encodeURIComponent(sceneId)}/recommendations${search}`,
  );
}
