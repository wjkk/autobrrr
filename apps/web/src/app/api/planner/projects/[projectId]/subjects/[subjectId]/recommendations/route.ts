import { proxyAivApiRoute } from '@/lib/aiv-api';

interface RouteContext {
  params: Promise<{ projectId: string; subjectId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const { projectId, subjectId } = await context.params;
  const search = new URL(request.url).search;
  return proxyAivApiRoute(
    request,
    `/api/projects/${encodeURIComponent(projectId)}/planner/subjects/${encodeURIComponent(subjectId)}/recommendations${search}`,
  );
}
