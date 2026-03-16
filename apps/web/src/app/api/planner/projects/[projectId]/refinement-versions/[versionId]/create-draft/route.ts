import { proxyAivApiRoute } from '@/lib/aiv-api';

interface RouteContext {
  params: Promise<{ projectId: string; versionId: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const { projectId, versionId } = await context.params;
  return proxyAivApiRoute(
    request,
    `/api/projects/${encodeURIComponent(projectId)}/planner/refinement-versions/${encodeURIComponent(versionId)}/create-draft`,
  );
}
