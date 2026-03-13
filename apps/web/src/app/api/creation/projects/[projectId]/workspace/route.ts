import { proxyAivApiRoute } from '@/lib/aiv-api';

interface RouteContext {
  params: Promise<{ projectId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const { projectId } = await context.params;
  const url = new URL(request.url);
  const episodeId = url.searchParams.get('episodeId') ?? '';
  const search = episodeId ? `?episodeId=${encodeURIComponent(episodeId)}` : '';
  return proxyAivApiRoute(request, `/api/projects/${encodeURIComponent(projectId)}/creation/workspace${search}`);
}
