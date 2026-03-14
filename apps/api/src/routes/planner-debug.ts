import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

import { requireUser } from '../lib/auth.js';
import { resolveModelSelection } from '../lib/model-registry.js';
import { resolvePlannerAgentSelection } from '../lib/planner-agent-registry.js';
import { parsePlannerAssistantPackage } from '../lib/planner-agent-schemas.js';
import { buildPlannerGenerationPrompt } from '../lib/planner-orchestrator.js';
import { extractPlannerText } from '../lib/planner-text-extraction.js';
import { prisma } from '../lib/prisma.js';
import { resolveProviderRuntimeConfigForUser } from '../lib/provider-runtime-config.js';
import { submitArkTextResponse } from '../lib/ark-client.js';
import { submitPlatouChatCompletion } from '../lib/platou-client.js';

const detailJsonSchema = z.record(z.string(), z.unknown());

const debugRunSchema = z.object({
  contentType: z.string().trim().min(1).max(64),
  subtype: z.string().trim().min(1).max(64),
  targetStage: z.enum(['outline', 'refinement']).default('refinement'),
  projectTitle: z.string().trim().min(1).max(255).default('调试项目'),
  episodeTitle: z.string().trim().min(1).max(255).default('第1集'),
  userPrompt: z.string().trim().min(1).max(20000),
  scriptContent: z.string().trim().max(50000).optional(),
  selectedSubjectName: z.string().trim().max(255).optional(),
  selectedStyleName: z.string().trim().max(255).optional(),
  selectedImageModelLabel: z.string().trim().max(255).optional(),
  priorMessages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    text: z.string().trim().min(1).max(4000),
  })).max(12).default([]),
  currentStructuredDoc: detailJsonSchema.optional(),
  modelFamily: z.string().trim().max(120).optional(),
  modelEndpoint: z.string().trim().max(120).optional(),
});

const debugRunListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  subAgentSlug: z.string().trim().max(120).optional(),
  compareGroupKey: z.string().trim().max(191).optional(),
});

const debugCompareSchema = debugRunSchema.extend({
  leftSubAgentId: z.string().trim().min(1).max(191),
  rightSubAgentId: z.string().trim().min(1).max(191),
});

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
  status: z.enum(['DRAFT', 'ACTIVE', 'DEPRECATED', 'ARCHIVED']).optional(),
});

const releaseListParamsSchema = z.object({
  id: z.string().min(1),
});

async function runPlannerTextDebug(args: {
  providerCode: string | null;
  baseUrl: string | null;
  apiKey: string | null;
  remoteModelKey: string;
  prompt: string;
}) {
  if (!args.providerCode || !args.baseUrl || !args.apiKey) {
    return null;
  }

  if (args.providerCode === 'ark') {
    return submitArkTextResponse({
      model: args.remoteModelKey,
      prompt: args.prompt,
      baseUrl: args.baseUrl,
      apiKey: args.apiKey,
    });
  }

  if (args.providerCode === 'platou') {
    return submitPlatouChatCompletion({
      baseUrl: args.baseUrl,
      apiKey: args.apiKey,
      model: args.remoteModelKey,
      prompt: args.prompt,
    });
  }

  return null;
}

function toPrismaJsonInput(value: Prisma.JsonValue | null | undefined) {
  if (value === null || value === undefined) {
    return undefined;
  }

  return value as Prisma.InputJsonValue;
}

async function executePlannerDebugRun(args: {
  userId: string;
  contentType: string;
  subtype: string;
  targetStage: 'outline' | 'refinement';
  projectTitle: string;
  episodeTitle: string;
  userPrompt: string;
  scriptContent?: string;
  selectedSubjectName?: string;
  selectedStyleName?: string;
  selectedImageModelLabel?: string;
  priorMessages?: Array<{ role: 'user' | 'assistant'; text: string }>;
  currentStructuredDoc?: Record<string, unknown>;
  modelFamily?: string;
  modelEndpoint?: string;
  compareGroupKey?: string;
  compareLabel?: string;
}) {
  const selection = await resolvePlannerAgentSelection({
    contentType: args.contentType,
    subtype: args.subtype,
  });
  if (!selection) {
    throw new Error('No active planner sub-agent matched the requested content type and subtype.');
  }

  const resolvedModel = await resolveModelSelection({
    modelKind: 'TEXT',
    familySlug: args.modelFamily,
    endpointSlug: args.modelEndpoint,
    strategy: 'default',
  });
  if (!resolvedModel) {
    throw new Error('No active text model endpoint matched the selection.');
  }

  const promptPackage = buildPlannerGenerationPrompt({
    selection,
    targetStage: args.targetStage,
    userPrompt: args.userPrompt,
    projectTitle: args.projectTitle,
    episodeTitle: args.episodeTitle,
    scriptContent: args.scriptContent,
    selectedSubjectName: args.selectedSubjectName,
    selectedStyleName: args.selectedStyleName,
    selectedImageModelLabel: args.selectedImageModelLabel,
    priorMessages: args.priorMessages ?? [],
    currentStructuredDoc: args.currentStructuredDoc,
  });

  const runtimeConfig = await resolveProviderRuntimeConfigForUser({
    userId: args.userId,
    providerId: resolvedModel.provider.id,
    fallbackCode: resolvedModel.provider.code,
    fallbackBaseUrl: resolvedModel.provider.baseUrl,
  });

  let providerOutput: Record<string, unknown> | null = null;
  let rawText: string | null = null;
  let errorMessage: string | null = null;
  let executionMode: 'live' | 'fallback' = 'fallback';

  try {
    providerOutput = await runPlannerTextDebug({
      providerCode: runtimeConfig.providerCode,
      baseUrl: runtimeConfig.baseUrl,
      apiKey: runtimeConfig.apiKey,
      remoteModelKey: resolvedModel.endpoint.remoteModelKey,
      prompt: promptPackage.promptText,
    });
    if (providerOutput) {
      rawText = extractPlannerText(providerOutput, args.userPrompt);
      executionMode = 'live';
    }
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : '调试调用失败，已回退到本地解析结果。';
    rawText = errorMessage;
  }

  const assistantPackage = parsePlannerAssistantPackage({
    targetStage: args.targetStage,
    rawText: rawText ?? '',
    userPrompt: args.userPrompt,
    projectTitle: args.projectTitle,
    episodeTitle: args.episodeTitle,
    defaultSteps: promptPackage.stepDefinitions,
    contentType: selection.contentType,
    subtype: selection.subtype,
  });

  const debugRun = await prisma.plannerDebugRun.create({
    data: {
      userId: args.userId,
      agentProfileId: selection.agentProfile.id,
      subAgentProfileId: selection.subAgentProfile.id,
      compareGroupKey: args.compareGroupKey ?? null,
      compareLabel: args.compareLabel ?? null,
      executionMode: executionMode.toUpperCase(),
      modelSnapshotJson: {
        family: {
          id: resolvedModel.family.id,
          slug: resolvedModel.family.slug,
          name: resolvedModel.family.name,
        },
        provider: {
          id: resolvedModel.provider.id,
          code: resolvedModel.provider.code,
          name: resolvedModel.provider.name,
        },
        endpoint: {
          id: resolvedModel.endpoint.id,
          slug: resolvedModel.endpoint.slug,
          label: resolvedModel.endpoint.label,
          remoteModelKey: resolvedModel.endpoint.remoteModelKey,
        },
      },
      inputJson: {
        contentType: args.contentType,
        subtype: args.subtype,
        targetStage: args.targetStage,
        projectTitle: args.projectTitle,
        episodeTitle: args.episodeTitle,
        userPrompt: args.userPrompt,
        scriptContent: args.scriptContent ?? null,
        selectedSubjectName: args.selectedSubjectName ?? null,
        selectedStyleName: args.selectedStyleName ?? null,
        selectedImageModelLabel: args.selectedImageModelLabel ?? null,
        priorMessages: args.priorMessages ?? [],
        currentStructuredDoc: args.currentStructuredDoc ?? null,
      } as Prisma.InputJsonValue,
      finalPrompt: promptPackage.promptText,
      rawText,
      providerOutputJson: (providerOutput ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      assistantPackageJson: assistantPackage as Prisma.InputJsonValue,
      errorMessage,
    },
    select: {
      id: true,
      createdAt: true,
    },
  });

  return {
    debugRunId: debugRun.id,
    createdAt: debugRun.createdAt.toISOString(),
    executionMode,
    errorMessage,
    agentProfile: {
      id: selection.agentProfile.id,
      slug: selection.agentProfile.slug,
      displayName: selection.agentProfile.displayName,
    },
    subAgentProfile: {
      id: selection.subAgentProfile.id,
      slug: selection.subAgentProfile.slug,
      subtype: selection.subtype,
      displayName: selection.subAgentProfile.displayName,
    },
    model: {
      family: {
        id: resolvedModel.family.id,
        slug: resolvedModel.family.slug,
        name: resolvedModel.family.name,
      },
      provider: {
        id: resolvedModel.provider.id,
        code: resolvedModel.provider.code,
        name: resolvedModel.provider.name,
      },
      endpoint: {
        id: resolvedModel.endpoint.id,
        slug: resolvedModel.endpoint.slug,
        label: resolvedModel.endpoint.label,
        remoteModelKey: resolvedModel.endpoint.remoteModelKey,
      },
    },
    finalPrompt: promptPackage.promptText,
    rawText,
    providerOutput,
    assistantPackage,
  };
}

export async function registerPlannerDebugRoutes(app: FastifyInstance) {
  app.get('/api/planner/debug/runs', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const query = debugRunListQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid planner debug run query.',
          details: query.error.flatten(),
        },
      });
    }

    const runs = await prisma.plannerDebugRun.findMany({
      where: {
        userId: user.id,
        ...(query.data.compareGroupKey ? { compareGroupKey: query.data.compareGroupKey } : {}),
        ...(query.data.subAgentSlug
          ? {
              subAgentProfile: {
                slug: query.data.subAgentSlug,
              },
            }
          : {}),
      },
      take: query.data.limit,
      orderBy: { createdAt: 'desc' },
      include: {
        agentProfile: {
          select: {
            id: true,
            slug: true,
            displayName: true,
          },
        },
        subAgentProfile: {
          select: {
            id: true,
            slug: true,
            subtype: true,
            displayName: true,
          },
        },
      },
    });

    return reply.send({
      ok: true,
      data: runs.map((run) => ({
        id: run.id,
        compareGroupKey: run.compareGroupKey,
        compareLabel: run.compareLabel,
        executionMode: run.executionMode.toLowerCase(),
        createdAt: run.createdAt.toISOString(),
        errorMessage: run.errorMessage,
        agentProfile: run.agentProfile,
        subAgentProfile: run.subAgentProfile,
      })),
    });
  });

  app.get('/api/planner/debug/runs/:id', async (request, reply) => {
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
          message: 'Invalid planner debug run id.',
        },
      });
    }

    const run = await prisma.plannerDebugRun.findFirst({
      where: {
        id: params.data.id,
        userId: user.id,
      },
      include: {
        agentProfile: {
          select: {
            id: true,
            slug: true,
            displayName: true,
          },
        },
        subAgentProfile: {
          select: {
            id: true,
            slug: true,
            subtype: true,
            displayName: true,
          },
        },
      },
    });

    if (!run) {
      return reply.code(404).send({
        ok: false,
        error: {
          code: 'PLANNER_DEBUG_RUN_NOT_FOUND',
          message: 'Planner debug run not found.',
        },
      });
    }

    return reply.send({
      ok: true,
      data: {
        id: run.id,
        compareGroupKey: run.compareGroupKey,
        compareLabel: run.compareLabel,
        executionMode: run.executionMode.toLowerCase(),
        createdAt: run.createdAt.toISOString(),
        errorMessage: run.errorMessage,
        agentProfile: run.agentProfile,
        subAgentProfile: run.subAgentProfile,
        model: run.modelSnapshotJson,
        input: run.inputJson,
        finalPrompt: run.finalPrompt,
        rawText: run.rawText,
        providerOutput: run.providerOutputJson,
        assistantPackage: run.assistantPackageJson,
      },
    });
  });

  app.post('/api/planner/debug/run', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const payload = debugRunSchema.safeParse(request.body);
    if (!payload.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid planner debug payload.',
          details: payload.error.flatten(),
        },
      });
    }

    try {
      const result = await executePlannerDebugRun({
        userId: user.id,
        ...payload.data,
      });

      return reply.send({
        ok: true,
        data: result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '调试运行失败。';
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'PLANNER_DEBUG_RUN_FAILED',
          message,
        },
      });
    }
  });

  app.post('/api/planner/debug/compare', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const payload = debugCompareSchema.safeParse(request.body);
    if (!payload.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid planner debug compare payload.',
          details: payload.error.flatten(),
        },
      });
    }

    const [leftSubAgent, rightSubAgent] = await Promise.all([
      prisma.plannerSubAgentProfile.findUnique({
        where: { id: payload.data.leftSubAgentId },
        include: { agentProfile: true },
      }),
      prisma.plannerSubAgentProfile.findUnique({
        where: { id: payload.data.rightSubAgentId },
        include: { agentProfile: true },
      }),
    ]);

    if (!leftSubAgent || !rightSubAgent) {
      return reply.code(404).send({
        ok: false,
        error: {
          code: 'PLANNER_SUB_AGENT_NOT_FOUND',
          message: 'Compare sub-agent not found.',
        },
      });
    }

    const compareGroupKey = randomUUID();

    try {
      const [leftResult, rightResult] = await Promise.all([
        executePlannerDebugRun({
          userId: user.id,
          contentType: leftSubAgent.agentProfile.contentType,
          subtype: leftSubAgent.subtype,
          targetStage: payload.data.targetStage,
          projectTitle: payload.data.projectTitle,
          episodeTitle: payload.data.episodeTitle,
          userPrompt: payload.data.userPrompt,
          scriptContent: payload.data.scriptContent,
          selectedSubjectName: payload.data.selectedSubjectName,
          selectedStyleName: payload.data.selectedStyleName,
          selectedImageModelLabel: payload.data.selectedImageModelLabel,
          priorMessages: payload.data.priorMessages,
          currentStructuredDoc: payload.data.currentStructuredDoc,
          modelFamily: payload.data.modelFamily,
          modelEndpoint: payload.data.modelEndpoint,
          compareGroupKey,
          compareLabel: 'A',
        }),
        executePlannerDebugRun({
          userId: user.id,
          contentType: rightSubAgent.agentProfile.contentType,
          subtype: rightSubAgent.subtype,
          targetStage: payload.data.targetStage,
          projectTitle: payload.data.projectTitle,
          episodeTitle: payload.data.episodeTitle,
          userPrompt: payload.data.userPrompt,
          scriptContent: payload.data.scriptContent,
          selectedSubjectName: payload.data.selectedSubjectName,
          selectedStyleName: payload.data.selectedStyleName,
          selectedImageModelLabel: payload.data.selectedImageModelLabel,
          priorMessages: payload.data.priorMessages,
          currentStructuredDoc: payload.data.currentStructuredDoc,
          modelFamily: payload.data.modelFamily,
          modelEndpoint: payload.data.modelEndpoint,
          compareGroupKey,
          compareLabel: 'B',
        }),
      ]);

      return reply.send({
        ok: true,
        data: {
          compareGroupKey,
          left: leftResult,
          right: rightResult,
        },
      });
    } catch (error) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'PLANNER_DEBUG_COMPARE_FAILED',
          message: error instanceof Error ? error.message : 'Planner debug compare failed.',
        },
      });
    }
  });

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
