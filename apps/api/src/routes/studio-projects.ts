import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { requireUser } from '../lib/auth.js';
import {
  createStudioProject,
  getStudioProject,
  listStudioProjects,
} from '../lib/studio-project-service.js';

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

const projectParamsSchema = z.object({
  projectId: z.string().min(1),
});

export async function registerStudioProjectRoutes(app: FastifyInstance) {
  app.get('/api/studio/projects', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    return reply.send({
      ok: true,
      data: await listStudioProjects(user.id),
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

    const result = await createStudioProject(user.id, payload.data);
    if (!result.ok) {
      const errorMap = {
        INVALID_IMAGE_MODEL: {
          code: 'INVALID_IMAGE_MODEL',
          message: 'Selected image model is not available.',
        },
        INVALID_SUBJECT_PROFILE: {
          code: 'INVALID_SUBJECT_PROFILE',
          message: 'Selected subject is not available.',
        },
        INVALID_STYLE_PRESET: {
          code: 'INVALID_STYLE_PRESET',
          message: 'Selected style is not available.',
        },
      } as const;

      return reply.code(400).send({
        ok: false,
        error: errorMap[result.error],
      });
    }

    return reply.code(201).send({
      ok: true,
      data: result.data,
    });
  });

  app.get('/api/studio/projects/:projectId', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = projectParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid project id.',
        },
      });
    }

    const project = await getStudioProject(user.id, params.data.projectId);
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
      data: project,
    });
  });
}
