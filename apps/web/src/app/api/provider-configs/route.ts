import { proxyAivApiRoute } from '@/lib/aiv-api';

export async function GET(request: Request) {
  return proxyAivApiRoute(request, '/api/provider-configs');
}
