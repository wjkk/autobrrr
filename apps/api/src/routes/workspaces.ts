import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { requireUser } from '../lib/auth.js';
import { getCreationWorkspace } from '../lib/creation-workspace-service.js';
import { getPlannerWorkspace } from '../lib/planner-workspace-service.js';
import { getPublishWorkspace } from '../lib/publish-workspace-service.js';

const workspaceParamsSchema = z.object({
  projectId: z.string().min(1),
});

const workspaceQuerySchema = z.object({
  episodeId: z.string().min(1),
});

async function resolveWorkspaceRequest(args: {
  request: { params: unknown; query: unknown };
  reply: {
    code: (statusCode: number) => { send: (payload: unknown) => unknown };
  };
}) {
  const params = workspaceParamsSchema.safeParse(args.request.params);
  const query = workspaceQuerySchema.safeParse(args.request.query);
  if (!params.success || !query.success) {
    args.reply.code(400).send({
      ok: false,
      error: {
        code: 'INVALID_ARGUMENT',
        message: 'Invalid workspace request.',
      },
    });
    return null;
  }

  return {
    projectId: params.data.projectId,
    episodeId: query.data.episodeId,
  };
}

export async function registerWorkspaceRoutes(app: FastifyInstance) {
  app.get('/api/projects/:projectId/planner/workspace', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const resolved = await resolveWorkspaceRequest({ request, reply });
    if (!resolved) {
      return;
    }

    const workspace = await getPlannerWorkspace({
      ...resolved,
      userId: user.id,
    });
    if (!workspace) {
      return reply.code(404).send({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Workspace not found.',
        },
      });
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

    const resolved = await resolveWorkspaceRequest({ request, reply });
    if (!resolved) {
      return;
    }

    const workspace = await getCreationWorkspace({
      ...resolved,
      userId: user.id,
    });
    if (!workspace) {
      return reply.code(404).send({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Workspace not found.',
        },
      });
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

    const resolved = await resolveWorkspaceRequest({ request, reply });
    if (!resolved) {
      return;
    }

    const workspace = await getPublishWorkspace({
      ...resolved,
      userId: user.id,
    });
    if (!workspace) {
      return reply.code(404).send({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Workspace not found.',
        },
      });
    }

    return reply.send({
      ok: true,
      data: workspace,
    });
  });
}
