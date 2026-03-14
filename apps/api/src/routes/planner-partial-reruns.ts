import type { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

import { mapRun } from '../lib/api-mappers.js';
import { requireUser } from '../lib/auth.js';
import { resolveModelSelection } from '../lib/model-registry.js';
import { resolvePlannerAgentSelection } from '../lib/planner-agent-registry.js';
import { buildPlannerGenerationPrompt, createPlannerUserMessage } from '../lib/planner-orchestrator.js';
import { prisma } from '../lib/prisma.js';
import { resolveUserDefaultModelSelection } from '../lib/user-model-defaults.js';

const paramsSchema = z.object({
  projectId: z.string().min(1),
});

const payloadSchema = z.object({
  episodeId: z.string().min(1),
  scope: z.enum(['subject_only', 'scene_only', 'shots_only']),
  targetId: z.string().min(1),
  prompt: z.string().trim().min(1).max(10000).optional(),
  modelFamily: z.string().trim().max(120).optional(),
  modelEndpoint: z.string().trim().max(120).optional(),
  idempotencyKey: z.string().trim().max(191).optional(),
});

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function buildScopeInstruction(args: {
  scope: 'subject_only' | 'scene_only' | 'shots_only';
  targetEntity: Record<string, unknown>;
  prompt: string | undefined;
}) {
  const customPrompt = args.prompt?.trim();

  if (args.scope === 'subject_only') {
    return [
      '你只允许调整一个主体设定，并同步更新与该主体强相关的分镜表述。',
      '不要重写整个故事主题，不要扩张场景数量。',
      `当前目标主体：${JSON.stringify(args.targetEntity)}`,
      customPrompt ? `用户补充要求：${customPrompt}` : '请根据当前主体设定自动优化角色形象、主体列表、以及关联镜头中的主体描写。',
    ].join('\n');
  }

  if (args.scope === 'scene_only') {
    return [
      '你只允许调整一个场景设定，并同步更新与该场景强相关的分镜表述。',
      '不要改动主体关系和故事主线。',
      `当前目标场景：${JSON.stringify(args.targetEntity)}`,
      customPrompt ? `用户补充要求：${customPrompt}` : '请根据当前场景设定自动优化场景列表、环境描述、以及关联镜头中的空间表述。',
    ].join('\n');
  }

  return [
    '你只允许调整一个分镜脚本，输出完整的 refinement 文档，但仅局部修改该分镜及其必要的上下文描述。',
    '不要改动无关主体和场景设定。',
    `当前目标分镜：${JSON.stringify(args.targetEntity)}`,
    customPrompt ? `用户补充要求：${customPrompt}` : '请根据当前分镜内容自动优化画面描述、构图、运镜和台词。',
  ].join('\n');
}

export async function registerPlannerPartialRerunRoutes(app: FastifyInstance) {
  app.post('/api/projects/:projectId/planner/partial-rerun', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = paramsSchema.safeParse(request.params);
    const payload = payloadSchema.safeParse(request.body);
    if (!params.success || !payload.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid planner partial rerun payload.',
          details: payload.success ? undefined : payload.error.flatten(),
        },
      });
    }

    const plannerSession = await prisma.plannerSession.findFirst({
      where: {
        projectId: params.data.projectId,
        episodeId: payload.data.episodeId,
        isActive: true,
        project: {
          createdById: user.id,
        },
      },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            contentMode: true,
            creationConfig: {
              include: {
                subjectProfile: {
                  select: { id: true, name: true, slug: true },
                },
                stylePreset: {
                  select: { id: true, name: true, slug: true },
                },
                imageModelEndpoint: {
                  select: { id: true, slug: true, label: true },
                },
              },
            },
          },
        },
        episode: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!plannerSession) {
      return reply.code(404).send({
        ok: false,
        error: {
          code: 'PLANNER_SESSION_NOT_FOUND',
          message: 'Planner session not found.',
        },
      });
    }

    const activeRefinement = await prisma.plannerRefinementVersion.findFirst({
      where: {
        plannerSessionId: plannerSession.id,
        isActive: true,
      },
      select: {
        id: true,
        structuredDocJson: true,
        subAgentProfileId: true,
      },
    });

    if (!activeRefinement?.structuredDocJson) {
      return reply.code(409).send({
        ok: false,
        error: {
          code: 'PLANNER_REFINEMENT_REQUIRED',
          message: 'No active refinement document found.',
        },
      });
    }

    const [targetSubject, targetScene, targetShot, recentMessages] = await Promise.all([
      payload.data.scope === 'subject_only'
        ? prisma.plannerSubject.findFirst({
            where: {
              id: payload.data.targetId,
              refinementVersionId: activeRefinement.id,
            },
          })
        : Promise.resolve(null),
      payload.data.scope === 'scene_only'
        ? prisma.plannerScene.findFirst({
            where: {
              id: payload.data.targetId,
              refinementVersionId: activeRefinement.id,
            },
          })
        : Promise.resolve(null),
      payload.data.scope === 'shots_only'
        ? prisma.plannerShotScript.findFirst({
            where: {
              id: payload.data.targetId,
              refinementVersionId: activeRefinement.id,
            },
          })
        : Promise.resolve(null),
      prisma.plannerMessage.findMany({
        where: {
          plannerSessionId: plannerSession.id,
        },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
    ]);

    const targetEntity = targetSubject ?? targetScene ?? targetShot;
    if (!targetEntity) {
      return reply.code(404).send({
        ok: false,
        error: {
          code: 'PLANNER_SCOPE_TARGET_NOT_FOUND',
          message: 'Target entity for partial rerun was not found.',
        },
      });
    }

    const userDefaultModel = !payload.data.modelFamily && !payload.data.modelEndpoint
      ? await resolveUserDefaultModelSelection(user.id, 'TEXT')
      : null;

    const resolvedModel = await resolveModelSelection({
      modelKind: 'TEXT',
      familySlug: payload.data.modelFamily ?? userDefaultModel?.familySlug,
      endpointSlug: payload.data.modelEndpoint ?? userDefaultModel?.endpointSlug,
      strategy: 'default',
    });
    if (!resolvedModel) {
      return reply.code(404).send({
        ok: false,
        error: {
          code: 'MODEL_NOT_FOUND',
          message: 'No active text model endpoint matched the selection.',
        },
      });
    }

    const selectedContentType = plannerSession.project.creationConfig?.selectedTab ?? '短剧漫剧';
    const selection = await resolvePlannerAgentSelection({
      contentType: selectedContentType,
      subtype: plannerSession.project.creationConfig?.selectedSubtype ?? undefined,
    });
    if (!selection) {
      return reply.code(409).send({
        ok: false,
        error: {
          code: 'PLANNER_AGENT_NOT_CONFIGURED',
          message: 'No active planner sub-agent matched the current content type and subtype.',
        },
      });
    }

    const scopeInstruction = buildScopeInstruction({
      scope: payload.data.scope,
      targetEntity: JSON.parse(JSON.stringify(targetEntity)) as Record<string, unknown>,
      prompt: payload.data.prompt,
    });

    const promptPackage = buildPlannerGenerationPrompt({
      selection,
      targetStage: 'refinement',
      userPrompt: scopeInstruction,
      projectTitle: plannerSession.project.title,
      episodeTitle: plannerSession.episode.title,
      contentMode: plannerSession.project.contentMode,
      scriptContent: plannerSession.project.creationConfig?.scriptContent ?? null,
      selectedSubjectName: plannerSession.project.creationConfig?.subjectProfile?.name ?? null,
      selectedStyleName: plannerSession.project.creationConfig?.stylePreset?.name ?? null,
      selectedImageModelLabel: plannerSession.project.creationConfig?.imageModelEndpoint?.label ?? null,
      priorMessages: recentMessages
        .reverse()
        .map((message) => {
          const content = message.contentJson && typeof message.contentJson === 'object' && !Array.isArray(message.contentJson)
            ? (message.contentJson as Record<string, unknown>)
            : {};

          return {
            role: message.role.toLowerCase(),
            text: typeof content.text === 'string' ? content.text : JSON.stringify(content),
          };
        }),
      currentStructuredDoc: activeRefinement.structuredDocJson,
    });

    const triggerType = payload.data.scope;
    const result = await prisma.$transaction(async (tx) => {
      await tx.plannerSession.update({
        where: { id: plannerSession.id },
        data: {
          status: 'UPDATING',
        },
      });

      await createPlannerUserMessage({
        db: tx,
        plannerSessionId: plannerSession.id,
        userId: user.id,
        prompt: payload.data.prompt?.trim() || `${payload.data.scope}:${payload.data.targetId}`,
      });

      const run = await tx.run.create({
        data: {
          projectId: plannerSession.project.id,
          episodeId: plannerSession.episode.id,
          modelFamilyId: resolvedModel.family.id,
          modelProviderId: resolvedModel.provider.id,
          modelEndpointId: resolvedModel.endpoint.id,
          runType: 'PLANNER_DOC_UPDATE',
          resourceType: 'planner_session',
          resourceId: plannerSession.id,
          status: 'QUEUED',
          executorType: 'SYSTEM_WORKER',
          idempotencyKey: payload.data.idempotencyKey ?? null,
          inputJson: {
            plannerSessionId: plannerSession.id,
            episodeId: plannerSession.episode.id,
            projectId: plannerSession.project.id,
            prompt: promptPackage.promptText,
            rawPrompt: payload.data.prompt?.trim() || `${payload.data.scope}:${payload.data.targetId}`,
            projectTitle: plannerSession.project.title,
            episodeTitle: plannerSession.episode.title,
            contentMode: plannerSession.project.contentMode,
            contentType: selection.contentType,
            subtype: selection.subtype,
            targetStage: 'refinement',
            triggerType,
            scope: payload.data.scope,
            targetEntityId: payload.data.targetId,
            targetEntity: targetEntity as Prisma.InputJsonValue,
            stepDefinitions: promptPackage.stepDefinitions,
            agentProfile: selection.agentProfile,
            subAgentProfile: selection.subAgentProfile,
            contextSnapshot: {
              selectedTab: plannerSession.project.creationConfig?.selectedTab ?? selection.contentType,
              selectedSubtype: plannerSession.project.creationConfig?.selectedSubtype ?? selection.subtype,
              selectedSubject: plannerSession.project.creationConfig?.subjectProfile,
              selectedStyle: plannerSession.project.creationConfig?.stylePreset,
              selectedImageModel: plannerSession.project.creationConfig?.imageModelEndpoint,
              activeRefinement: {
                id: activeRefinement.id,
                structuredDoc: activeRefinement.structuredDocJson,
              },
            },
            modelFamily: {
              id: resolvedModel.family.id,
              slug: resolvedModel.family.slug,
              name: resolvedModel.family.name,
            },
            modelProvider: {
              id: resolvedModel.provider.id,
              code: resolvedModel.provider.code,
              name: resolvedModel.provider.name,
              providerType: resolvedModel.provider.providerType.toLowerCase(),
            },
            modelEndpoint: {
              id: resolvedModel.endpoint.id,
              slug: resolvedModel.endpoint.slug,
              label: resolvedModel.endpoint.label,
              remoteModelKey: resolvedModel.endpoint.remoteModelKey,
            },
          } as Prisma.InputJsonValue,
        },
      });

      return run;
    });

    return reply.code(202).send({
      ok: true,
      data: {
        plannerSession: {
          id: plannerSession.id,
          status: 'updating',
        },
        triggerType,
        scope: payload.data.scope,
        run: mapRun(result),
      },
    });
  });
}
