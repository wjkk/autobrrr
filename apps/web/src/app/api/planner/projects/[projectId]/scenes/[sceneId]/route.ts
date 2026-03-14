import { proxyAivApiRoute } from '@/lib/aiv-api';

interface RouteContext {
  params: Promise<{ projectId: string; sceneId: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const { projectId, sceneId } = await context.params;
  return proxyAivApiRoute(
    request,
    `/api/projects/${encodeURIComponent(projectId)}/planner/scenes/${encodeURIComponent(sceneId)}`,
  );
}
