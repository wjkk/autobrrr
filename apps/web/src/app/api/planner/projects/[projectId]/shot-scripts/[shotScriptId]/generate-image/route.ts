import { proxyAivApiRoute } from '@/lib/aiv-api';

interface RouteContext {
  params: Promise<{ projectId: string; shotScriptId: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const { projectId, shotScriptId } = await context.params;
  return proxyAivApiRoute(
    request,
    `/api/projects/${encodeURIComponent(projectId)}/planner/shot-scripts/${encodeURIComponent(shotScriptId)}/generate-image`,
  );
}
