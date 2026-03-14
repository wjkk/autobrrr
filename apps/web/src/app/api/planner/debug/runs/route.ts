import { proxyAivApiRoute } from '@/lib/aiv-api';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const search = url.search || '';
  return proxyAivApiRoute(request, `/api/planner/debug/runs${search}`);
}
