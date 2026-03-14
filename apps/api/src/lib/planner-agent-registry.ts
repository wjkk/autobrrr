import { prisma } from './prisma.js';

export interface ResolvedPlannerAgentSelection {
  contentType: string;
  subtype: string;
  agentProfile: {
    id: string;
    slug: string;
    displayName: string;
    defaultSystemPrompt: string;
    defaultDeveloperPrompt: string | null;
    defaultStepDefinitionsJson: unknown;
  };
  subAgentProfile: {
    id: string;
    slug: string;
    displayName: string;
    systemPromptOverride: string | null;
    developerPromptOverride: string | null;
    stepDefinitionsJson: unknown;
  };
}

function normalizeSubtype(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function resolvePlannerAgentSelection(args: {
  contentType: string;
  subtype?: string | null;
}) {
  const contentType = args.contentType.trim();
  const subtype = normalizeSubtype(args.subtype);

  const agentProfile = await prisma.plannerAgentProfile.findFirst({
    where: {
      contentType,
      enabled: true,
      status: 'ACTIVE',
    },
    include: {
      subAgentProfiles: {
        where: {
          enabled: true,
          status: 'ACTIVE',
          ...(subtype ? { subtype } : {}),
        },
        orderBy: [
          { version: 'desc' },
          { updatedAt: 'desc' },
        ],
        take: 1,
      },
    },
    orderBy: [
      { version: 'desc' },
      { updatedAt: 'desc' },
    ],
  });

  if (!agentProfile) {
    return null;
  }

  let subAgentProfile: (typeof agentProfile.subAgentProfiles)[number] | null = agentProfile.subAgentProfiles[0] ?? null;
  if (!subAgentProfile && subtype) {
    subAgentProfile = await prisma.plannerSubAgentProfile.findFirst({
      where: {
        agentProfileId: agentProfile.id,
        subtype,
        enabled: true,
        status: 'ACTIVE',
      },
      orderBy: [
        { version: 'desc' },
        { updatedAt: 'desc' },
      ],
    });
  }

  if (!subAgentProfile) {
    subAgentProfile = await prisma.plannerSubAgentProfile.findFirst({
      where: {
        agentProfileId: agentProfile.id,
        enabled: true,
        status: 'ACTIVE',
      },
      orderBy: [
        { version: 'desc' },
        { updatedAt: 'desc' },
      ],
    });
  }

  if (!subAgentProfile) {
    return null;
  }

  return {
    contentType,
    subtype: subAgentProfile.subtype,
    agentProfile: {
      id: agentProfile.id,
      slug: agentProfile.slug,
      displayName: agentProfile.displayName,
      defaultSystemPrompt: agentProfile.defaultSystemPrompt,
      defaultDeveloperPrompt: agentProfile.defaultDeveloperPrompt,
      defaultStepDefinitionsJson: agentProfile.defaultStepDefinitionsJson,
    },
    subAgentProfile: {
      id: subAgentProfile.id,
      slug: subAgentProfile.slug,
      displayName: subAgentProfile.displayName,
      systemPromptOverride: subAgentProfile.systemPromptOverride,
      developerPromptOverride: subAgentProfile.developerPromptOverride,
      stepDefinitionsJson: subAgentProfile.stepDefinitionsJson,
    },
  } satisfies ResolvedPlannerAgentSelection;
}
