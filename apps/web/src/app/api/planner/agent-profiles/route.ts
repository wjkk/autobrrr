import { proxyAivApiRoute } from '@/lib/aiv-api';

export async function GET(request: Request) {
  const search = new URL(request.url).search;
  return proxyAivApiRoute(request, `/api/planner/agent-profiles${search}`);
}
