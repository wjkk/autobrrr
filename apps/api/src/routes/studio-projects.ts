import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { requireUser } from '../lib/auth.js';
import { buildProjectTitleFromPrompt } from '../lib/project-title.js';
import { prisma } from '../lib/prisma.js';

const createProjectSchema = z.object({
  prompt: z.string().trim().min(1).max(2000),
  contentMode: z.enum(['single', 'series']).default('single'),
});

function mapProjectStatus(status: string) {
  return status.toLowerCase();
}

export async function registerStudioProjectRoutes(app: FastifyInstance) {
  app.get('/api/studio/projects', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const projects = await prisma.project.findMany({
      where: { createdById: user.id },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        status: true,
        contentMode: true,
        updatedAt: true,
      },
    });

    return reply.send({
      ok: true,
      data: projects.map((project) => ({
        id: project.id,
        title: project.title,
        status: project.status.toLowerCase(),
        contentMode: project.contentMode.toLowerCase(),
        updatedAt: project.updatedAt.toISOString(),
      })),
    });
  });

  app.post('/api/studio/projects', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const payload = createProjectSchema.safeParse(request.body);
    if (!payload.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid project payload.',
          details: payload.error.flatten(),
        },
      });
    }

    const contentMode = payload.data.contentMode === 'series' ? 'SERIES' : 'SINGLE';
    const title = buildProjectTitleFromPrompt(payload.data.prompt);

    const result = await prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          title,
          brief: payload.data.prompt,
          contentMode,
          status: 'PLANNING',
          createdById: user.id,
        },
      });

      const episode = await tx.episode.create({
        data: {
          projectId: project.id,
          episodeNo: 1,
          title: '第1集',
          summary: payload.data.prompt,
          status: 'PLANNING',
        },
      });

      const plannerSession = await tx.plannerSession.create({
        data: {
          projectId: project.id,
          episodeId: episode.id,
          status: 'IDLE',
          isActive: true,
          createdById: user.id,
        },
      });

      await tx.episode.update({
        where: { id: episode.id },
        data: {
          activePlannerSessionId: plannerSession.id,
        },
      });

      const updatedProject = await tx.project.update({
        where: { id: project.id },
        data: {
          currentEpisodeId: episode.id,
        },
      });

      return { project: updatedProject, episode };
    });

    return reply.code(201).send({
      ok: true,
      data: {
        projectId: result.project.id,
        redirectUrl: `/projects/${result.project.id}/planner`,
        project: {
          id: result.project.id,
          title: result.project.title,
          contentMode: result.project.contentMode.toLowerCase(),
          status: mapProjectStatus(result.project.status),
        },
      },
    });
  });

  app.get('/api/studio/projects/:projectId', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = z.object({ projectId: z.string().min(1) }).safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid project id.',
        },
      });
    }

    const project = await prisma.project.findFirst({
      where: {
        id: params.data.projectId,
        createdById: user.id,
      },
      include: {
        episodes: {
          orderBy: { episodeNo: 'asc' },
          select: {
            id: true,
            episodeNo: true,
            title: true,
            status: true,
          },
        },
      },
    });

    if (!project) {
      return reply.code(404).send({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Project not found.',
        },
      });
    }

    return reply.send({
      ok: true,
      data: {
        id: project.id,
        title: project.title,
        brief: project.brief,
        contentMode: project.contentMode.toLowerCase(),
        status: project.status.toLowerCase(),
        currentEpisodeId: project.currentEpisodeId,
        episodes: project.episodes.map((episode) => ({
          id: episode.id,
          episodeNo: episode.episodeNo,
          title: episode.title,
          status: episode.status.toLowerCase(),
        })),
      },
    });
  });
}
