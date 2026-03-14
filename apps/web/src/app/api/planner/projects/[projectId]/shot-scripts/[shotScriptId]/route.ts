import { proxyAivApiRoute } from '@/lib/aiv-api';

interface RouteContext {
  params: Promise<{ projectId: string; shotScriptId: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const { projectId, shotScriptId } = await context.params;
  return proxyAivApiRoute(
    request,
    `/api/projects/${encodeURIComponent(projectId)}/planner/shot-scripts/${encodeURIComponent(shotScriptId)}`,
  );
}

export async function DELETE(request: Request, context: RouteContext) {
  const { projectId, shotScriptId } = await context.params;
  const url = new URL(request.url);
  const episodeId = url.searchParams.get('episodeId') ?? '';
  const search = episodeId ? `?episodeId=${encodeURIComponent(episodeId)}` : '';
  return proxyAivApiRoute(
    request,
    `/api/projects/${encodeURIComponent(projectId)}/planner/shot-scripts/${encodeURIComponent(shotScriptId)}${search}`,
  );
}
