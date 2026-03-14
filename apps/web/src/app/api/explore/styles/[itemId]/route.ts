import { proxyAivApiRoute } from '@/lib/aiv-api';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ itemId: string }> },
) {
  const { itemId } = await context.params;
  return proxyAivApiRoute(request, `/api/explore/styles/${encodeURIComponent(itemId)}`);
}
