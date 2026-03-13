import { proxyAivApiRoute } from '@/lib/aiv-api';

export async function GET(request: Request) {
  return proxyAivApiRoute(request, '/api/studio/projects');
}

export async function POST(request: Request) {
  return proxyAivApiRoute(request, '/api/studio/projects');
}
