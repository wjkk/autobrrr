import { NextResponse } from 'next/server';

import { proxyAivApiRoute } from '@/lib/aiv-api';
import { mapWebApiPathToAivApiPath } from '@/lib/api-route-proxy';

interface RouteContext {
  params: Promise<{ path?: string[] }>;
}

async function handleRequest(request: Request, context: RouteContext) {
  const { path = [] } = await context.params;
  const targetPath = mapWebApiPathToAivApiPath(path);

  if (!targetPath) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'API route not found.',
        },
      },
      { status: 404 },
    );
  }

  const url = new URL(request.url);
  const search = url.search ? url.search : '';
  return proxyAivApiRoute(request, `${targetPath}${search}`);
}

export const GET = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;
