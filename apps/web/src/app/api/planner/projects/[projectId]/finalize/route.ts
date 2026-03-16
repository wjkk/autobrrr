import { proxyAivApiRoute } from '@/lib/aiv-api';

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await context.params;
  return proxyAivApiRoute(request, `/api/projects/${encodeURIComponent(projectId)}/planner/finalize`);
}
