export async function GET(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await context.params;
  const baseUrl = (process.env.AIV_API_BASE_URL?.trim() || 'http://localhost:8787').replace(/\/$/, '');
  const incomingUrl = new URL(request.url);
  const targetUrl = new URL(`/api/projects/${encodeURIComponent(projectId)}/planner/stream`, baseUrl);

  for (const [key, value] of incomingUrl.searchParams.entries()) {
    targetUrl.searchParams.set(key, value);
  }

  const response = await fetch(targetUrl, {
    method: 'GET',
    headers: {
      Accept: 'text/event-stream',
      ...(request.headers.get('cookie') ? { Cookie: request.headers.get('cookie') as string } : {}),
    },
    cache: 'no-store',
  });

  return new Response(response.body, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('content-type') ?? 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
