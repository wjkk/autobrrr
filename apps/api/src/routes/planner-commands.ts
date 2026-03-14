import type { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

import { mapRun } from '../lib/api-mappers.js';
import { requireUser } from '../lib/auth.js';
import { resolveModelSelection } from '../lib/model-registry.js';
import { resolvePlannerAgentSelection } from '../lib/planner-agent-registry.js';
import { buildPlannerGenerationPrompt, createPlannerUserMessage } from '../lib/planner-orchestrator.js';
import { findOwnedEpisode } from '../lib/ownership.js';
import { prisma } from '../lib/prisma.js';
import { resolveUserDefaultModelSelection } from '../lib/user-model-defaults.js';

const paramsSchema = z.object({
  projectId: z.string().min(1),
});

const payloadSchema = z.object({
  episodeId: z.string().min(1),
  prompt: z.string().trim().min(1).max(10000).optional(),
  subtype: z.string().trim().min(1).max(64).optional(),
  modelFamily: z.string().trim().max(120).optional(),
  modelEndpoint: z.string().trim().max(120).optional(),
  idempotencyKey: z.string().trim().max(191).optional(),
});

async function findOrCreateActivePlannerSession(projectId: string, episodeId: string, userId: string) {
  const existing = await prisma.plannerSession.findFirst({
    where: {
      projectId,
      episodeId,
      isActive: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (existing) {
    return existing;
  }

  const created = await prisma.plannerSession.create({
    data: {
      projectId,
      episodeId,
      status: 'IDLE',
      isActive: true,
      createdById: userId,
    },
  });

  await prisma.episode.update({
    where: { id: episodeId },
    data: {
      activePlannerSessionId: created.id,
    },
  });

  return created;
}

export async function registerPlannerCommandRoutes(app: FastifyInstance) {
  app.post('/api/projects/:projectId/planner/generate-doc', async (request, reply) => {
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
          message: 'Invalid planner generation payload.',
          details: payload.success ? undefined : payload.error.flatten(),
        },
      });
    }

    const episode = await findOwnedEpisode(params.data.projectId, payload.data.episodeId, user.id);
    if (!episode) {
      return reply.code(404).send({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Episode not found.',
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

    const plannerSession = await findOrCreateActivePlannerSession(episode.project.id, episode.id, user.id);
    const creationConfig = await prisma.projectCreationConfig.findUnique({
      where: {
        projectId: episode.project.id,
      },
      include: {
        subjectProfile: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        stylePreset: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        imageModelEndpoint: {
          select: {
            id: true,
            slug: true,
            label: true,
          },
        },
      },
    });
    const rawPrompt = payload.data.prompt ?? episode.summary ?? episode.project.title;
    const selectedContentType = creationConfig?.selectedTab ?? '短剧漫剧';
    const selection = await resolvePlannerAgentSelection({
      contentType: selectedContentType,
      subtype: payload.data.subtype ?? creationConfig?.selectedSubtype,
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

    const recentMessages = await prisma.plannerMessage.findMany({
      where: {
        plannerSessionId: plannerSession.id,
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
    });

    const activeOutline = await prisma.plannerOutlineVersion.findFirst({
      where: {
        plannerSessionId: plannerSession.id,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        versionNumber: true,
        outlineDocJson: true,
      },
    });

    const activeRefinement = await prisma.plannerRefinementVersion.findFirst({
      where: {
        plannerSessionId: plannerSession.id,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        versionNumber: true,
        structuredDocJson: true,
      },
    });

    const targetStage: 'outline' | 'refinement' = plannerSession.outlineConfirmedAt ? 'refinement' : 'outline';
    const triggerType = targetStage === 'outline'
      ? (activeOutline ? 'update_outline' : 'generate_outline')
      : (activeRefinement ? 'follow_up' : 'generate_doc');

    const promptPackage = buildPlannerGenerationPrompt({
      selection,
      targetStage,
      userPrompt: rawPrompt,
      projectTitle: episode.project.title,
      episodeTitle: episode.title,
      contentMode: episode.project.contentMode,
      scriptContent: creationConfig?.scriptContent,
      selectedSubjectName: creationConfig?.subjectProfile?.name,
      selectedStyleName: creationConfig?.stylePreset?.name,
      selectedImageModelLabel: creationConfig?.imageModelEndpoint?.label,
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
      currentOutlineDoc: activeOutline?.outlineDocJson,
      currentStructuredDoc: activeRefinement?.structuredDocJson,
    });

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
        prompt: rawPrompt,
      });

      const run = await tx.run.create({
        data: {
          projectId: episode.project.id,
          episodeId: episode.id,
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
            episodeId: episode.id,
            projectId: episode.project.id,
            prompt: promptPackage.promptText,
            rawPrompt,
            projectTitle: episode.project.title,
            episodeTitle: episode.title,
            contentMode: episode.project.contentMode,
            contentType: selection.contentType,
            subtype: selection.subtype,
            targetStage,
            triggerType,
            stepDefinitions: promptPackage.stepDefinitions,
            agentProfile: selection.agentProfile,
            subAgentProfile: selection.subAgentProfile,
            contextSnapshot: {
              selectedTab: creationConfig?.selectedTab ?? selection.contentType,
              selectedSubtype: payload.data.subtype ?? creationConfig?.selectedSubtype ?? selection.subtype,
              scriptSourceName: creationConfig?.scriptSourceName ?? null,
              hasScriptContent: Boolean(creationConfig?.scriptContent),
              selectedSubject: creationConfig?.subjectProfile,
              selectedStyle: creationConfig?.stylePreset,
              selectedImageModel: creationConfig?.imageModelEndpoint,
              priorMessages: recentMessages.map((message) => ({
                role: message.role.toLowerCase(),
                messageType: message.messageType.toLowerCase(),
                content: message.contentJson,
                createdAt: message.createdAt.toISOString(),
              })),
              activeOutline: activeOutline
                ? {
                    id: activeOutline.id,
                    versionNumber: activeOutline.versionNumber,
                    outlineDoc: activeOutline.outlineDocJson,
                  }
                : null,
              activeRefinement: activeRefinement
                ? {
                    id: activeRefinement.id,
                    versionNumber: activeRefinement.versionNumber,
                    structuredDoc: activeRefinement.structuredDocJson,
                  }
                : null,
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
        targetStage,
        triggerType,
        run: mapRun(result),
      },
    });
  });
}
