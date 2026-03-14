import { proxyAivApiRoute } from '@/lib/aiv-api';

interface RouteContext {
  params: Promise<{ projectId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const { projectId } = await context.params;
  const url = new URL(request.url);
  const episodeId = url.searchParams.get('episodeId') ?? '';
  const mediaKind = url.searchParams.get('mediaKind') ?? '';
  const params = new URLSearchParams();
  if (episodeId) {
    params.set('episodeId', episodeId);
  }
  if (mediaKind) {
    params.set('mediaKind', mediaKind);
  }
  const search = params.toString() ? `?${params.toString()}` : '';
  return proxyAivApiRoute(request, `/api/projects/${encodeURIComponent(projectId)}/assets${search}`);
}
