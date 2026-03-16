import { proxyAivApiRoute } from '@/lib/aiv-api';

interface RouteContext {
  params: Promise<{ projectId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const { projectId } = await context.params;
  const url = new URL(request.url);
  const episodeId = url.searchParams.get('episodeId') ?? '';
  const modelSlug = url.searchParams.get('modelSlug') ?? '';
  const search = new URLSearchParams();
  if (episodeId) {
    search.set('episodeId', episodeId);
  }
  if (modelSlug) {
    search.set('modelSlug', modelSlug);
  }

  return proxyAivApiRoute(
    request,
    `/api/projects/${encodeURIComponent(projectId)}/planner/shot-prompts${search.size > 0 ? `?${search.toString()}` : ''}`,
  );
}
