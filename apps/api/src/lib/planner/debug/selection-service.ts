import type { PrismaClient } from '@prisma/client';

import { prisma } from '../../prisma.js';
import { resolveModelSelection } from '../../model-registry.js';
import { resolvePlannerAgentSelection, type ResolvedPlannerAgentSelection } from '../agent/registry.js';
import { resolvePlannerTargetVideoModel } from '../target-video-model.js';

interface PlannerDebugSelectionDeps {
  prisma: typeof prisma;
  resolvePlannerAgentSelection: typeof resolvePlannerAgentSelection;
}

export interface PlannerDebugSelection extends ResolvedPlannerAgentSelection {
  sourceMetadata: {
    configSource: 'draft' | 'published';
    releaseVersion: number | null;
  };
}

export const defaultPlannerDebugSelectionDeps: PlannerDebugSelectionDeps = {
  prisma,
  resolvePlannerAgentSelection,
};

export function buildPlannerDebugModelSelectionSnapshot(args: {
  requestedModelFamilySlug?: string;
  requestedModelEndpointSlug?: string;
  resolvedModel: Awaited<ReturnType<typeof resolveModelSelection>>;
  targetVideoModel: Awaited<ReturnType<typeof resolvePlannerTargetVideoModel>>;
}) {
  return {
    requestedTextModelFamilySlug: args.requestedModelFamilySlug ?? null,
    requestedTextModelEndpointSlug: args.requestedModelEndpointSlug ?? null,
    resolvedTextModel: args.resolvedModel
      ? {
          family: {
            id: args.resolvedModel.family.id,
            slug: args.resolvedModel.family.slug,
            name: args.resolvedModel.family.name,
          },
          provider: {
            id: args.resolvedModel.provider.id,
            code: args.resolvedModel.provider.code,
            name: args.resolvedModel.provider.name,
          },
          endpoint: {
            id: args.resolvedModel.endpoint.id,
            slug: args.resolvedModel.endpoint.slug,
            label: args.resolvedModel.endpoint.label,
            remoteModelKey: args.resolvedModel.endpoint.remoteModelKey,
          },
        }
      : null,
    targetVideoModel: args.targetVideoModel
      ? {
          familySlug: args.targetVideoModel.familySlug,
          familyName: args.targetVideoModel.familyName,
          summary: args.targetVideoModel.summary,
        }
      : null,
  } satisfies Record<string, unknown>;
}

export async function resolvePlannerDebugSelectionWithDeps(args: {
  contentType: string;
  subtype: string;
  subAgentId?: string;
  configSource: 'draft' | 'published';
}, deps: PlannerDebugSelectionDeps): Promise<PlannerDebugSelection | null> {
  if (args.configSource === 'draft') {
    if (!args.subAgentId) {
      const selection = await deps.resolvePlannerAgentSelection({
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

    const subAgent = await deps.prisma.plannerSubAgentProfile.findUnique({
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
        configSource: 'draft',
        releaseVersion: null,
      },
    };
  }

  const draftSelection = args.subAgentId
    ? await resolvePlannerDebugSelectionWithDeps({
        contentType: args.contentType,
        subtype: args.subtype,
        subAgentId: args.subAgentId,
        configSource: 'draft',
      }, deps)
    : await deps.resolvePlannerAgentSelection({
        contentType: args.contentType,
        subtype: args.subtype,
      });

  if (!draftSelection) {
    return null;
  }

  const latestRelease = await deps.prisma.plannerSubAgentProfileRelease.findFirst({
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
      configSource: 'published',
      releaseVersion: latestRelease.releaseVersion,
    },
  };
}

export async function resolvePlannerDebugSelection(args: {
  contentType: string;
  subtype: string;
  subAgentId?: string;
  configSource: 'draft' | 'published';
}) {
  return resolvePlannerDebugSelectionWithDeps(args, defaultPlannerDebugSelectionDeps);
}
