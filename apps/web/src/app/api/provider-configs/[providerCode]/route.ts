import { proxyAivApiRoute } from '@/lib/aiv-api';

interface RouteContext {
  params: Promise<{ providerCode: string }>;
}

export async function PUT(request: Request, context: RouteContext) {
  const { providerCode } = await context.params;
  return proxyAivApiRoute(request, `/api/provider-configs/${encodeURIComponent(providerCode)}`);
}
