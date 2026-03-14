import { proxyAivApiRoute } from '@/lib/aiv-api';

interface RouteContext {
  params: Promise<{ projectId: string; subjectId: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const { projectId, subjectId } = await context.params;
  return proxyAivApiRoute(
    request,
    `/api/projects/${encodeURIComponent(projectId)}/planner/subjects/${encodeURIComponent(subjectId)}`,
  );
}
