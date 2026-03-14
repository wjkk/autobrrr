import { proxyAivApiRoute } from '@/lib/aiv-api';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const search = url.searchParams.toString();
  return proxyAivApiRoute(request, `/api/explore/subjects${search ? `?${search}` : ''}`);
}

export async function POST(request: Request) {
  return proxyAivApiRoute(request, '/api/explore/subjects');
}
