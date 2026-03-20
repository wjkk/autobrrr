import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { Prisma } from '@prisma/client';

import { requireUser } from '../lib/auth.js';
import { toPrismaJsonInput } from '../lib/planner/debug/service.js';
import { prisma } from '../lib/prisma.js';

const subAgentPatchSchema = z.object({
  displayName: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(4000).nullable().optional(),
  systemPromptOverride: z.string().trim().max(20000).nullable().optional(),
  developerPromptOverride: z.string().trim().max(20000).nullable().optional(),
  stepDefinitionsJson: z.array(z.object({
    id: z.string().trim().min(1).max(120),
    title: z.string().trim().min(1).max(255),
    status: z.enum(['pending', 'running', 'done', 'failed']).default('done'),
    details: z.array(z.string().trim().min(1).max(500)).max(8).default([]),
  })).max(12).optional(),
  inputSchemaJson: z.record(z.string(), z.unknown()).optional(),
  outputSchemaJson: z.record(z.string(), z.unknown()).optional(),
  toolPolicyJson: z.record(z.string(), z.unknown()).optional(),
  defaultGenerationConfigJson: z.record(z.string(), z.unknown()).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'DEPRECATED', 'ARCHIVED']).optional(),
});

const releaseListParamsSchema = z.object({
  id: z.string().min(1),
});

export async function registerPlannerDebugSubAgentRoutes(app: FastifyInstance) {
  app.patch('/api/planner/sub-agent-profiles/:id', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = z.object({ id: z.string().min(1) }).safeParse(request.params);
    const payload = subAgentPatchSchema.safeParse(request.body);
    if (!params.success || !payload.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid planner sub-agent patch payload.',
          details: payload.success ? undefined : payload.error.flatten(),
        },
      });
    }

    const updated = await prisma.plannerSubAgentProfile.update({
      where: { id: params.data.id },
      data: {
        ...(payload.data.displayName !== undefined ? { displayName: payload.data.displayName } : {}),
        ...(payload.data.description !== undefined ? { description: payload.data.description } : {}),
        ...(payload.data.systemPromptOverride !== undefined ? { systemPromptOverride: payload.data.systemPromptOverride } : {}),
        ...(payload.data.developerPromptOverride !== undefined ? { developerPromptOverride: payload.data.developerPromptOverride } : {}),
        ...(payload.data.stepDefinitionsJson !== undefined ? { stepDefinitionsJson: payload.data.stepDefinitionsJson } : {}),
        ...(payload.data.inputSchemaJson !== undefined ? { inputSchemaJson: payload.data.inputSchemaJson as Prisma.InputJsonValue } : {}),
        ...(payload.data.outputSchemaJson !== undefined ? { outputSchemaJson: payload.data.outputSchemaJson as Prisma.InputJsonValue } : {}),
        ...(payload.data.toolPolicyJson !== undefined ? { toolPolicyJson: payload.data.toolPolicyJson as Prisma.InputJsonValue } : {}),
        ...(payload.data.defaultGenerationConfigJson !== undefined
          ? { defaultGenerationConfigJson: payload.data.defaultGenerationConfigJson as Prisma.InputJsonValue }
          : {}),
        ...(payload.data.status !== undefined
          ? {
              status: payload.data.status,
              publishedAt: payload.data.status === 'ACTIVE' ? new Date() : undefined,
              archivedAt: payload.data.status === 'ARCHIVED' ? new Date() : null,
            }
          : {}),
      },
      select: {
        id: true,
        slug: true,
        subtype: true,
        displayName: true,
        description: true,
        systemPromptOverride: true,
        developerPromptOverride: true,
        stepDefinitionsJson: true,
        status: true,
        updatedAt: true,
      },
    });

    return reply.send({
      ok: true,
      data: {
        ...updated,
        status: updated.status.toLowerCase(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  });

  app.get('/api/planner/sub-agent-profiles/:id/releases', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = releaseListParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid planner sub-agent release query.',
        },
      });
    }

    const releases = await prisma.plannerSubAgentProfileRelease.findMany({
      where: { subAgentProfileId: params.data.id },
      orderBy: [{ releaseVersion: 'desc' }],
      select: {
        id: true,
        releaseVersion: true,
        displayName: true,
        description: true,
        systemPromptOverride: true,
        developerPromptOverride: true,
        stepDefinitionsJson: true,
        inputSchemaJson: true,
        outputSchemaJson: true,
        toolPolicyJson: true,
        defaultGenerationConfigJson: true,
        publishedAt: true,
      },
    });

    return reply.send({
      ok: true,
      data: releases.map((release) => ({
        ...release,
        publishedAt: release.publishedAt.toISOString(),
      })),
    });
  });

  app.post('/api/planner/sub-agent-profiles/:id/publish', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = z.object({ id: z.string().min(1) }).safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid planner sub-agent publish payload.',
        },
      });
    }

    const subAgent = await prisma.plannerSubAgentProfile.findUnique({
      where: { id: params.data.id },
    });

    if (!subAgent) {
      return reply.code(404).send({
        ok: false,
        error: {
          code: 'PLANNER_SUB_AGENT_NOT_FOUND',
          message: 'Planner sub-agent not found.',
        },
      });
    }

    const published = await prisma.$transaction(async (tx) => {
      const aggregate = await tx.plannerSubAgentProfileRelease.aggregate({
        where: { subAgentProfileId: subAgent.id },
        _max: { releaseVersion: true },
      });
      const nextReleaseVersion = (aggregate._max.releaseVersion ?? 0) + 1;

      const release = await tx.plannerSubAgentProfileRelease.create({
        data: {
          subAgentProfileId: subAgent.id,
          releaseVersion: nextReleaseVersion,
          displayName: subAgent.displayName,
          description: subAgent.description,
          systemPromptOverride: subAgent.systemPromptOverride,
          developerPromptOverride: subAgent.developerPromptOverride,
          stepDefinitionsJson: toPrismaJsonInput(subAgent.stepDefinitionsJson),
          outputSchemaJson: toPrismaJsonInput(subAgent.outputSchemaJson),
          inputSchemaJson: toPrismaJsonInput(subAgent.inputSchemaJson),
          toolPolicyJson: toPrismaJsonInput(subAgent.toolPolicyJson),
          defaultGenerationConfigJson: toPrismaJsonInput(subAgent.defaultGenerationConfigJson),
          publishedByUserId: user.id,
        },
        select: {
          id: true,
          releaseVersion: true,
          publishedAt: true,
        },
      });

      await tx.plannerSubAgentProfile.update({
        where: { id: subAgent.id },
        data: {
          status: 'ACTIVE',
          publishedAt: new Date(),
          archivedAt: null,
        },
      });

      return release;
    });

    return reply.send({
      ok: true,
      data: {
        id: subAgent.id,
        status: 'active',
        publishedAt: published.publishedAt.toISOString(),
        release: {
          id: published.id,
          releaseVersion: published.releaseVersion,
          publishedAt: published.publishedAt.toISOString(),
        },
      },
    });
  });
}
