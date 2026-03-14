import type { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

import { requireUser } from '../lib/auth.js';
import { buildProjectTitleFromPrompt } from '../lib/project-title.js';
import { prisma } from '../lib/prisma.js';

const MAX_SCRIPT_HAN_CHAR_COUNT = 10_000;

function countHanCharacters(value: string) {
  return (value.match(/\p{Script=Han}/gu) ?? []).length;
}

const createProjectSchema = z.object({
  prompt: z.string().trim().min(1).max(100_000).refine(
    (value) => countHanCharacters(value) <= MAX_SCRIPT_HAN_CHAR_COUNT,
    `Prompt 汉字数量不能超过 ${MAX_SCRIPT_HAN_CHAR_COUNT}。`,
  ),
  contentMode: z.enum(['single', 'series']).default('single'),
  creationConfig: z.object({
    selectedTab: z.enum(['短剧漫剧', '音乐MV', '知识分享']).default('短剧漫剧'),
    selectedSubtype: z.string().trim().min(1).max(64).optional(),
    scriptSourceName: z.string().trim().min(1).max(255).optional(),
    scriptContent: z.string().trim().min(1).max(100_000).refine(
      (value) => countHanCharacters(value) <= MAX_SCRIPT_HAN_CHAR_COUNT,
      `scriptContent 汉字数量不能超过 ${MAX_SCRIPT_HAN_CHAR_COUNT}。`,
    ).optional(),
    imageModelEndpointSlug: z.string().trim().min(1).max(120).optional(),
    subjectProfileSlug: z.string().trim().min(1).max(120).optional(),
    stylePresetSlug: z.string().trim().min(1).max(120).optional(),
    settings: z.record(z.string(), z.unknown()).optional(),
  }).optional(),
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
    const creationConfig = payload.data.creationConfig;

    const [imageModelEndpoint, subjectProfile, stylePreset] = await Promise.all([
      creationConfig?.imageModelEndpointSlug
        ? prisma.modelEndpoint.findFirst({
            where: {
              slug: creationConfig.imageModelEndpointSlug,
              status: 'ACTIVE',
              family: {
                modelKind: 'IMAGE',
              },
            },
            select: {
              id: true,
            },
          })
        : Promise.resolve(null),
      creationConfig?.subjectProfileSlug
        ? prisma.subjectProfile.findFirst({
            where: {
              slug: creationConfig.subjectProfileSlug,
              enabled: true,
              OR: [
                { visibility: 'PUBLIC' },
                {
                  visibility: 'PERSONAL',
                  ownerUserId: user.id,
                },
              ],
            },
            select: {
              id: true,
            },
          })
        : Promise.resolve(null),
      creationConfig?.stylePresetSlug
        ? prisma.stylePreset.findFirst({
            where: {
              slug: creationConfig.stylePresetSlug,
              enabled: true,
              OR: [
                { visibility: 'PUBLIC' },
                {
                  visibility: 'PERSONAL',
                  ownerUserId: user.id,
                },
              ],
            },
            select: {
              id: true,
            },
          })
        : Promise.resolve(null),
    ]);

    if (creationConfig?.imageModelEndpointSlug && !imageModelEndpoint) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_IMAGE_MODEL',
          message: 'Selected image model is not available.',
        },
      });
    }

    if (creationConfig?.subjectProfileSlug && !subjectProfile) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_SUBJECT_PROFILE',
          message: 'Selected subject is not available.',
        },
      });
    }

    if (creationConfig?.stylePresetSlug && !stylePreset) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_STYLE_PRESET',
          message: 'Selected style is not available.',
        },
      });
    }

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

      if (creationConfig) {
        await tx.projectCreationConfig.create({
          data: {
            projectId: project.id,
            selectedTab: creationConfig.selectedTab,
            selectedSubtype: creationConfig.selectedSubtype ?? null,
            scriptSourceName: creationConfig.scriptSourceName ?? null,
            scriptContent: creationConfig.scriptContent ?? null,
            imageModelEndpointId: imageModelEndpoint?.id ?? null,
            subjectProfileId: subjectProfile?.id ?? null,
            stylePresetId: stylePreset?.id ?? null,
            ...(creationConfig.settings ? { settingsJson: creationConfig.settings as Prisma.InputJsonValue } : {}),
          },
        });
      }

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
        creationConfig: {
          include: {
            imageModelEndpoint: {
              select: {
                id: true,
                slug: true,
                label: true,
              },
            },
            subjectProfile: {
              select: {
                id: true,
                slug: true,
                name: true,
              },
            },
            stylePreset: {
              select: {
                id: true,
                slug: true,
                name: true,
              },
            },
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
        creationConfig: project.creationConfig
          ? {
              selectedTab: project.creationConfig.selectedTab,
              selectedSubtype: project.creationConfig.selectedSubtype,
              scriptSourceName: project.creationConfig.scriptSourceName,
              hasScriptContent: Boolean(project.creationConfig.scriptContent),
              imageModelEndpoint: project.creationConfig.imageModelEndpoint,
              subjectProfile: project.creationConfig.subjectProfile,
              stylePreset: project.creationConfig.stylePreset,
              settings: project.creationConfig.settingsJson,
            }
          : null,
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
