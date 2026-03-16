import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

import { requireUser } from '../lib/auth.js';
import { resolveModelSelection } from '../lib/model-registry.js';
import { resolvePlannerAgentSelection, type ResolvedPlannerAgentSelection } from '../lib/planner-agent-registry.js';
import { parsePlannerAssistantPackage } from '../lib/planner-agent-schemas.js';
import { buildPlannerGenerationPrompt } from '../lib/planner-orchestrator.js';
import type { PlannerStructuredDoc } from '../lib/planner-doc.js';
import { applyPartialRerunScope, buildPartialDiffSummary } from '../lib/planner-refinement-partial.js';
import { resolvePlannerTargetVideoModel } from '../lib/planner-target-video-model.js';
import { extractPlannerText } from '../lib/planner-text-extraction.js';
import { prisma } from '../lib/prisma.js';
import { submitTextGeneration } from '../lib/provider-gateway.js';
import { resolveProviderRuntimeConfigForUser } from '../lib/provider-runtime-config.js';

const detailJsonSchema = z.record(z.string(), z.unknown());
const plannerAssetSchema = z.object({
  id: z.string().trim().min(1).max(191),
  fileName: z.string().trim().max(255).optional(),
  sourceUrl: z.string().trim().max(2000).nullable().optional(),
  sourceKind: z.string().trim().max(64).optional(),
  createdAt: z.string().trim().max(64).optional(),
});

const debugRunSchema = z.object({
  contentType: z.string().trim().min(1).max(64),
  subtype: z.string().trim().min(1).max(64),
  subAgentId: z.string().trim().min(1).max(191).optional(),
  configSource: z.enum(['draft', 'published']).default('draft'),
  targetStage: z.enum(['outline', 'refinement']).default('refinement'),
  partialRerunScope: z.enum(['none', 'subject_only', 'scene_only', 'shots_only']).default('none'),
  projectTitle: z.string().trim().min(1).max(255).default('调试项目'),
  episodeTitle: z.string().trim().min(1).max(255).default('第1集'),
  userPrompt: z.string().trim().min(1).max(20000),
  scriptContent: z.string().trim().max(50000).optional(),
  selectedSubjectName: z.string().trim().max(255).optional(),
  selectedStyleName: z.string().trim().max(255).optional(),
  selectedImageModelLabel: z.string().trim().max(255).optional(),
  targetVideoModelFamilySlug: z.string().trim().max(120).optional(),
  priorMessages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    text: z.string().trim().min(1).max(4000),
  })).max(12).default([]),
  currentOutlineDoc: detailJsonSchema.optional(),
  currentStructuredDoc: detailJsonSchema.optional(),
  targetEntity: detailJsonSchema.optional(),
  plannerAssets: z.array(plannerAssetSchema).max(48).default([]),
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
  inputSchemaJson: detailJsonSchema.optional(),
  outputSchemaJson: detailJsonSchema.optional(),
  toolPolicyJson: detailJsonSchema.optional(),
  defaultGenerationConfigJson: detailJsonSchema.optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'DEPRECATED', 'ARCHIVED']).optional(),
});

const releaseListParamsSchema = z.object({
  id: z.string().min(1),
});

async function runPlannerTextDebug(args: {
  userId: string;
  providerCode: string | null;
  baseUrl: string | null;
  apiKey: string | null;
  remoteModelKey: string;
  prompt: string;
}) {
  if (!args.providerCode || !args.baseUrl || !args.apiKey) {
    return null;
  }

  return submitTextGeneration({
    providerCode: args.providerCode,
    model: args.remoteModelKey,
    prompt: args.prompt,
    baseUrl: args.baseUrl,
    apiKey: args.apiKey,
    hookMetadata: {
      traceId: `planner-debug:${args.userId}:${args.remoteModelKey}`,
      userId: args.userId,
      resourceType: 'planner_debug',
    },
  });
}

function toPrismaJsonInput(value: Prisma.JsonValue | null | undefined) {
  if (value === null || value === undefined) {
    return undefined;
  }

  return value as Prisma.InputJsonValue;
}

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function readString(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function readNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readStructuredDoc(value: unknown): PlannerStructuredDoc | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as PlannerStructuredDoc) : null;
}

function estimateTokens(text: string | null | undefined) {
  if (!text) {
    return 0;
  }

  return Math.max(1, Math.ceil(text.length / 4));
}

function findUsageLikeObject(value: unknown): Record<string, unknown> | null {
  const queue: unknown[] = [value];

  while (queue.length > 0) {
    const current = queue.shift();
    const record = readObject(current);
    if (!Object.keys(record).length) {
      continue;
    }

    if (
      'input_tokens' in record ||
      'output_tokens' in record ||
      'prompt_tokens' in record ||
      'completion_tokens' in record ||
      'total_tokens' in record
    ) {
      return record;
    }

    for (const next of Object.values(record)) {
      if (next && typeof next === 'object') {
        queue.push(next);
      }
    }
  }

  return null;
}

function readCostRate(costConfig: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = readNumber(costConfig[key]);
    if (value !== null) {
      return value;
    }
  }

  return null;
}

function buildUsageSummary(args: {
  providerOutput: unknown;
  prompt: string;
  rawText: string | null;
  modelSnapshot: unknown;
}) {
  const usage = findUsageLikeObject(args.providerOutput);
  const promptTokens =
    readNumber(usage?.['input_tokens']) ??
    readNumber(usage?.['prompt_tokens']) ??
    readNumber(usage?.['inputTokens']) ??
    readNumber(usage?.['promptTokens']);
  const completionTokens =
    readNumber(usage?.['output_tokens']) ??
    readNumber(usage?.['completion_tokens']) ??
    readNumber(usage?.['outputTokens']) ??
    readNumber(usage?.['completionTokens']);
  const totalTokens =
    readNumber(usage?.['total_tokens']) ??
    readNumber(usage?.['totalTokens']) ??
    (promptTokens !== null || completionTokens !== null
      ? (promptTokens ?? 0) + (completionTokens ?? 0)
      : null);

  const modelSnapshot = readObject(args.modelSnapshot);
  const endpoint = readObject(modelSnapshot.endpoint);
  const costConfig = readObject(endpoint.costConfig);
  const inputRate = readCostRate(costConfig, [
    'inputPer1kTokens',
    'input_per_1k_tokens',
    'promptPer1kTokens',
    'prompt_per_1k_tokens',
  ]);
  const outputRate = readCostRate(costConfig, [
    'outputPer1kTokens',
    'output_per_1k_tokens',
    'completionPer1kTokens',
    'completion_per_1k_tokens',
  ]);
  const currency = readString(costConfig.currency);

  const promptTokenValue = promptTokens ?? estimateTokens(args.prompt);
  const completionTokenValue = completionTokens ?? estimateTokens(args.rawText);
  const totalTokenValue = totalTokens ?? promptTokenValue + completionTokenValue;
  const hasProviderUsage = promptTokens !== null || completionTokens !== null || totalTokens !== null;
  const cost =
    inputRate !== null || outputRate !== null
      ? ((promptTokenValue / 1000) * (inputRate ?? 0)) + ((completionTokenValue / 1000) * (outputRate ?? 0))
      : null;

  return {
    promptTokens: promptTokenValue,
    completionTokens: completionTokenValue,
    totalTokens: totalTokenValue,
    cost,
    currency,
    source: hasProviderUsage ? ('provider' as const) : ('estimated' as const),
  };
}

function readPromptSnapshot(value: unknown) {
  const record = readObject(value);
  const messages = Array.isArray(record.messagesFinal)
    ? record.messagesFinal
        .map((item) => {
          const next = readObject(item);
          const role = readString(next.role);
          const content = readString(next.content);
          if (!role || !content) {
            return null;
          }

          return {
            role,
            content,
          };
        })
        .filter((item): item is { role: string; content: string } => item !== null)
    : [];

  if (!messages.length) {
    return null;
  }

  return {
    systemPromptFinal: readString(record.systemPromptFinal) ?? '',
    developerPromptFinal: readString(record.developerPromptFinal) ?? '',
    messagesFinal: messages,
    inputContextSnapshot: readObject(record.inputContextSnapshot),
  };
}

function parseStoredDebugInput(value: unknown) {
  const parsed = debugRunSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error('Stored planner debug run input is invalid.');
  }

  return parsed.data;
}

function deriveDiffSummary(args: {
  targetStage: 'outline' | 'refinement';
  partialRerunScope?: 'none' | 'subject_only' | 'scene_only' | 'shots_only';
  currentStructuredDoc?: Record<string, unknown>;
  targetEntity?: Record<string, unknown>;
  assistantPackage: Record<string, unknown>;
}) {
  if (args.targetStage !== 'refinement' || !args.partialRerunScope || args.partialRerunScope === 'none') {
    return [] as string[];
  }

  const nextDoc = readStructuredDoc(args.assistantPackage.structuredDoc);
  if (!nextDoc) {
    return [];
  }

  return buildPartialDiffSummary({
    previousDoc: readStructuredDoc(args.currentStructuredDoc),
    nextDoc,
    input: {
      scope: args.partialRerunScope,
      targetEntity: args.targetEntity ?? {},
    },
  });
}

interface PlannerDebugSelection extends ResolvedPlannerAgentSelection {
  sourceMetadata: {
    configSource: 'draft' | 'published';
    releaseVersion: number | null;
  };
}

async function resolvePlannerDebugSelection(args: {
  contentType: string;
  subtype: string;
  subAgentId?: string;
  configSource: 'draft' | 'published';
}): Promise<PlannerDebugSelection | null> {
  if (args.configSource === 'draft') {
    if (!args.subAgentId) {
      const selection = await resolvePlannerAgentSelection({
        contentType: args.contentType,
        subtype: args.subtype,
      });
      if (!selection) {
        return null;
      }

      return {
        ...selection,
        sourceMetadata: {
          configSource: 'draft',
          releaseVersion: null,
        },
      };
    }

    const subAgent = await prisma.plannerSubAgentProfile.findUnique({
      where: { id: args.subAgentId },
      include: {
        agentProfile: true,
      },
    });
    if (!subAgent || !subAgent.agentProfile) {
      return null;
    }

    return {
      contentType: subAgent.agentProfile.contentType,
      subtype: subAgent.subtype,
      agentProfile: {
        id: subAgent.agentProfile.id,
        slug: subAgent.agentProfile.slug,
        displayName: subAgent.agentProfile.displayName,
        defaultSystemPrompt: subAgent.agentProfile.defaultSystemPrompt,
        defaultDeveloperPrompt: subAgent.agentProfile.defaultDeveloperPrompt,
        defaultStepDefinitionsJson: subAgent.agentProfile.defaultStepDefinitionsJson,
      },
      subAgentProfile: {
        id: subAgent.id,
        slug: subAgent.slug,
        displayName: subAgent.displayName,
        systemPromptOverride: subAgent.systemPromptOverride,
        developerPromptOverride: subAgent.developerPromptOverride,
        stepDefinitionsJson: subAgent.stepDefinitionsJson,
      },
      sourceMetadata: {
        configSource: 'draft' as const,
        releaseVersion: null,
      },
    };
  }

  const draftSelection: PlannerDebugSelection | ResolvedPlannerAgentSelection | null = args.subAgentId
    ? await resolvePlannerDebugSelection({
        contentType: args.contentType,
        subtype: args.subtype,
        subAgentId: args.subAgentId,
        configSource: 'draft',
      })
    : await resolvePlannerAgentSelection({
        contentType: args.contentType,
        subtype: args.subtype,
      });

  if (!draftSelection) {
    return null;
  }

  const latestRelease = await prisma.plannerSubAgentProfileRelease.findFirst({
    where: {
      subAgentProfileId: draftSelection.subAgentProfile.id,
    },
    orderBy: [{ releaseVersion: 'desc' }],
  });

  if (!latestRelease) {
    throw new Error('当前子 agent 还没有已发布快照，无法使用“已发布配置试跑”。');
  }

  return {
    contentType: draftSelection.contentType,
    subtype: draftSelection.subtype,
    agentProfile: draftSelection.agentProfile,
    subAgentProfile: {
      id: draftSelection.subAgentProfile.id,
      slug: draftSelection.subAgentProfile.slug,
      displayName: latestRelease.displayName,
      systemPromptOverride: latestRelease.systemPromptOverride,
      developerPromptOverride: latestRelease.developerPromptOverride,
      stepDefinitionsJson: latestRelease.stepDefinitionsJson,
    },
    sourceMetadata: {
      configSource: 'published' as const,
      releaseVersion: latestRelease.releaseVersion,
    },
  };
}

async function executePlannerDebugRun(args: {
  userId: string;
  contentType: string;
  subtype: string;
  subAgentId?: string;
  configSource: 'draft' | 'published';
  targetStage: 'outline' | 'refinement';
  partialRerunScope?: 'none' | 'subject_only' | 'scene_only' | 'shots_only';
  projectTitle: string;
  episodeTitle: string;
  userPrompt: string;
  scriptContent?: string;
  selectedSubjectName?: string;
  selectedStyleName?: string;
  selectedImageModelLabel?: string;
  targetVideoModelFamilySlug?: string;
  priorMessages?: Array<{ role: 'user' | 'assistant'; text: string }>;
  currentOutlineDoc?: Record<string, unknown>;
  currentStructuredDoc?: Record<string, unknown>;
  targetEntity?: Record<string, unknown>;
  plannerAssets?: Array<{
    id: string;
    fileName?: string;
    sourceUrl?: string | null;
    sourceKind?: string;
    createdAt?: string;
  }>;
  modelFamily?: string;
  modelEndpoint?: string;
  compareGroupKey?: string;
  compareLabel?: string;
  replaySourceRunId?: string;
}) {
  const selection = await resolvePlannerDebugSelection({
    contentType: args.contentType,
    subtype: args.subtype,
    subAgentId: args.subAgentId,
    configSource: args.configSource,
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
    ...(await resolvePlannerTargetVideoModel({
      requestedFamilySlug: args.targetVideoModelFamilySlug,
    }).then((targetVideoModel) => ({
      targetVideoModelFamilySlug: targetVideoModel?.familySlug ?? null,
      targetVideoModelSummary: targetVideoModel?.summary ?? null,
    }))),
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
    currentOutlineDoc: args.currentOutlineDoc,
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
      userId: args.userId,
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

  const parsedAssistantPackage = parsePlannerAssistantPackage({
    targetStage: args.targetStage,
    rawText: rawText ?? '',
    userPrompt: args.userPrompt,
    projectTitle: args.projectTitle,
    episodeTitle: args.episodeTitle,
    defaultSteps: promptPackage.stepDefinitions,
    contentType: selection.contentType,
    subtype: selection.subtype,
  });
  const assistantPackage =
    args.targetStage === 'refinement' &&
    args.partialRerunScope &&
    args.partialRerunScope !== 'none' &&
    parsedAssistantPackage.stage === 'refinement'
      ? {
          ...parsedAssistantPackage,
          structuredDoc: applyPartialRerunScope({
            previousDoc: readStructuredDoc(args.currentStructuredDoc),
            nextDoc: parsedAssistantPackage.structuredDoc,
            input: {
              scope: args.partialRerunScope,
              targetEntity: args.targetEntity ?? {},
            },
          }),
        }
      : parsedAssistantPackage;
  const diffSummary = deriveDiffSummary({
    targetStage: args.targetStage,
    partialRerunScope: args.partialRerunScope,
    currentStructuredDoc: args.currentStructuredDoc,
    targetEntity: args.targetEntity,
    assistantPackage: assistantPackage as Record<string, unknown>,
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
          costConfig: resolvedModel.endpoint.costConfigJson ?? null,
        },
      },
      inputJson: {
        contentType: args.contentType,
        subtype: args.subtype,
        subAgentId: args.subAgentId ?? null,
        configSource: args.configSource,
        targetStage: args.targetStage,
        partialRerunScope: args.partialRerunScope ?? 'none',
        projectTitle: args.projectTitle,
        episodeTitle: args.episodeTitle,
        userPrompt: args.userPrompt,
        scriptContent: args.scriptContent ?? null,
        selectedSubjectName: args.selectedSubjectName ?? null,
        selectedStyleName: args.selectedStyleName ?? null,
        selectedImageModelLabel: args.selectedImageModelLabel ?? null,
        priorMessages: args.priorMessages ?? [],
        currentOutlineDoc: args.currentOutlineDoc ?? null,
        currentStructuredDoc: args.currentStructuredDoc ?? null,
        targetEntity: args.targetEntity ?? null,
        plannerAssets: args.plannerAssets ?? [],
        replaySourceRunId: args.replaySourceRunId ?? null,
        promptSnapshot: promptPackage.promptSnapshot,
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
    configSource: selection.sourceMetadata.configSource,
    releaseVersion: selection.sourceMetadata.releaseVersion,
    replaySourceRunId: args.replaySourceRunId ?? null,
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
        costConfig: resolvedModel.endpoint.costConfigJson ?? null,
      },
    },
    finalPrompt: promptPackage.promptText,
    promptSnapshot: promptPackage.promptSnapshot,
    rawText,
    providerOutput,
    assistantPackage,
    input: {
      contentType: args.contentType,
      subtype: args.subtype,
      targetStage: args.targetStage,
      partialRerunScope: args.partialRerunScope ?? 'none',
      projectTitle: args.projectTitle,
      episodeTitle: args.episodeTitle,
      userPrompt: args.userPrompt,
      scriptContent: args.scriptContent ?? null,
      selectedSubjectName: args.selectedSubjectName ?? null,
      selectedStyleName: args.selectedStyleName ?? null,
      selectedImageModelLabel: args.selectedImageModelLabel ?? null,
      priorMessages: args.priorMessages ?? [],
      currentOutlineDoc: args.currentOutlineDoc ?? null,
      currentStructuredDoc: args.currentStructuredDoc ?? null,
      targetEntity: args.targetEntity ?? null,
      plannerAssets: args.plannerAssets ?? [],
    },
    usage: buildUsageSummary({
      providerOutput,
      prompt: promptPackage.promptText,
      rawText,
      modelSnapshot: {
        endpoint: {
          costConfig: resolvedModel.endpoint.costConfigJson ?? null,
        },
      },
    }),
    diffSummary,
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
        replaySourceRunId: readString(readObject(run.inputJson).replaySourceRunId),
        agentProfile: run.agentProfile,
        subAgentProfile: run.subAgentProfile,
        model: run.modelSnapshotJson,
        input: run.inputJson,
        finalPrompt: run.finalPrompt,
        promptSnapshot: readPromptSnapshot(readObject(run.inputJson).promptSnapshot),
        rawText: run.rawText,
        providerOutput: run.providerOutputJson,
        assistantPackage: run.assistantPackageJson,
        usage: buildUsageSummary({
          providerOutput: run.providerOutputJson,
          prompt: run.finalPrompt,
          rawText: run.rawText,
          modelSnapshot: run.modelSnapshotJson,
        }),
        diffSummary: deriveDiffSummary({
          targetStage: readObject(run.inputJson).targetStage === 'outline' ? 'outline' : 'refinement',
          partialRerunScope:
            readObject(run.inputJson).partialRerunScope === 'subject_only' ||
            readObject(run.inputJson).partialRerunScope === 'scene_only' ||
            readObject(run.inputJson).partialRerunScope === 'shots_only'
              ? (readObject(run.inputJson).partialRerunScope as 'subject_only' | 'scene_only' | 'shots_only')
              : 'none',
          currentStructuredDoc: readObject(run.inputJson).currentStructuredDoc as Record<string, unknown> | undefined,
          targetEntity: readObject(run.inputJson).targetEntity as Record<string, unknown> | undefined,
          assistantPackage: readObject(run.assistantPackageJson),
        }),
      },
    });
  });

  app.post('/api/planner/debug/runs/:id/replay', async (request, reply) => {
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
          message: 'Invalid planner debug replay run id.',
        },
      });
    }

    const run = await prisma.plannerDebugRun.findFirst({
      where: {
        id: params.data.id,
        userId: user.id,
      },
      select: {
        id: true,
        inputJson: true,
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

    try {
      const input = parseStoredDebugInput(run.inputJson);
      const result = await executePlannerDebugRun({
        userId: user.id,
        ...input,
        replaySourceRunId: run.id,
      });

      return reply.send({
        ok: true,
        data: result,
      });
    } catch (error) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'PLANNER_DEBUG_REPLAY_FAILED',
          message: error instanceof Error ? error.message : 'Planner debug replay failed.',
        },
      });
    }
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
          subAgentId: leftSubAgent.id,
          configSource: payload.data.configSource,
          targetStage: payload.data.targetStage,
          projectTitle: payload.data.projectTitle,
          episodeTitle: payload.data.episodeTitle,
          userPrompt: payload.data.userPrompt,
          scriptContent: payload.data.scriptContent,
          selectedSubjectName: payload.data.selectedSubjectName,
          selectedStyleName: payload.data.selectedStyleName,
          selectedImageModelLabel: payload.data.selectedImageModelLabel,
          priorMessages: payload.data.priorMessages,
          currentOutlineDoc: payload.data.currentOutlineDoc,
          currentStructuredDoc: payload.data.currentStructuredDoc,
          partialRerunScope: payload.data.partialRerunScope,
          targetEntity: payload.data.targetEntity,
          plannerAssets: payload.data.plannerAssets,
          modelFamily: payload.data.modelFamily,
          modelEndpoint: payload.data.modelEndpoint,
          compareGroupKey,
          compareLabel: 'A',
        }),
        executePlannerDebugRun({
          userId: user.id,
          contentType: rightSubAgent.agentProfile.contentType,
          subtype: rightSubAgent.subtype,
          subAgentId: rightSubAgent.id,
          configSource: payload.data.configSource,
          targetStage: payload.data.targetStage,
          projectTitle: payload.data.projectTitle,
          episodeTitle: payload.data.episodeTitle,
          userPrompt: payload.data.userPrompt,
          scriptContent: payload.data.scriptContent,
          selectedSubjectName: payload.data.selectedSubjectName,
          selectedStyleName: payload.data.selectedStyleName,
          selectedImageModelLabel: payload.data.selectedImageModelLabel,
          priorMessages: payload.data.priorMessages,
          currentOutlineDoc: payload.data.currentOutlineDoc,
          currentStructuredDoc: payload.data.currentStructuredDoc,
          partialRerunScope: payload.data.partialRerunScope,
          targetEntity: payload.data.targetEntity,
          plannerAssets: payload.data.plannerAssets,
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
