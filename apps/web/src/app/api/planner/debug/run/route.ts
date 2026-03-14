import { proxyAivApiRoute } from '@/lib/aiv-api';

export async function POST(request: Request) {
  return proxyAivApiRoute(request, '/api/planner/debug/run');
}
