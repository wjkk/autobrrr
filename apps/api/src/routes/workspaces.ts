import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { notFound, parseOrThrow } from '../lib/app-error.js';
import { requireUser } from '../lib/auth.js';
import { getCreationWorkspace } from '../lib/creation-workspace-service.js';
import { getPlannerWorkspace } from '../lib/planner/workspace-service.js';
import { getPublishWorkspace } from '../lib/publish-workspace-service.js';

const workspaceParamsSchema = z.object({
  projectId: z.string().min(1),
});

const workspaceQuerySchema = z.object({
  episodeId: z.string().min(1),
});

async function resolveWorkspaceRequest(args: {
  request: { params: unknown; query: unknown };
}) {
  return {
    projectId: parseOrThrow(workspaceParamsSchema, args.request.params, 'Invalid workspace request.').projectId,
    episodeId: parseOrThrow(workspaceQuerySchema, args.request.query, 'Invalid workspace request.').episodeId,
  };
}

export async function registerWorkspaceRoutes(app: FastifyInstance) {
  app.get('/api/projects/:projectId/planner/workspace', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const resolved = await resolveWorkspaceRequest({ request });

    const workspace = await getPlannerWorkspace({
      ...resolved,
      userId: user.id,
    });
    if (!workspace) {
      throw notFound('Workspace not found.');
    }

    return reply.send({
      ok: true,
      data: workspace,
    });
  });

  app.get('/api/projects/:projectId/creation/workspace', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const resolved = await resolveWorkspaceRequest({ request });

    const workspace = await getCreationWorkspace({
      ...resolved,
      userId: user.id,
    });
    if (!workspace) {
      throw notFound('Workspace not found.');
    }

    return reply.send({
      ok: true,
      data: workspace,
    });
  });

  app.get('/api/projects/:projectId/publish/workspace', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const resolved = await resolveWorkspaceRequest({ request });

    const workspace = await getPublishWorkspace({
      ...resolved,
      userId: user.id,
    });
    if (!workspace) {
      throw notFound('Workspace not found.');
    }

    return reply.send({
      ok: true,
      data: workspace,
    });
  });
}
