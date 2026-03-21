import { Prisma } from '@prisma/client';

import { buildProjectTitleFromPrompt } from './project-title.js';
import { prisma } from './prisma.js';
import { mapProjectStatus } from './studio-project-presenters.js';
import type { CreateStudioProjectInput, CreateStudioProjectResult } from './studio-project-service.js';

export async function createStudioProject(userId: string, input: CreateStudioProjectInput): Promise<CreateStudioProjectResult> {
  const contentMode = input.contentMode === 'series' ? 'SERIES' : 'SINGLE';
  const title = buildProjectTitleFromPrompt(input.prompt);
  const creationConfig = input.creationConfig;

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
                ownerUserId: userId,
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
                ownerUserId: userId,
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
    return { ok: false, error: 'INVALID_IMAGE_MODEL' };
  }

  if (creationConfig?.subjectProfileSlug && !subjectProfile) {
    return { ok: false, error: 'INVALID_SUBJECT_PROFILE' };
  }

  if (creationConfig?.stylePresetSlug && !stylePreset) {
    return { ok: false, error: 'INVALID_STYLE_PRESET' };
  }

  const result = await prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        title,
        brief: input.prompt,
        contentMode,
        status: 'PLANNING',
        createdById: userId,
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
        summary: input.prompt,
        status: 'PLANNING',
      },
    });

    const plannerSession = await tx.plannerSession.create({
      data: {
        projectId: project.id,
        episodeId: episode.id,
        status: 'IDLE',
        isActive: true,
        createdById: userId,
      },
    });

    await tx.episode.update({
      where: { id: episode.id },
      data: {
        activePlannerSessionId: plannerSession.id,
      },
    });

    return tx.project.update({
      where: { id: project.id },
      data: {
        currentEpisodeId: episode.id,
      },
    });
  });

  return {
    ok: true,
    data: {
      projectId: result.id,
      redirectUrl: `/projects/${result.id}/planner`,
      project: {
        id: result.id,
        title: result.title,
        contentMode: result.contentMode.toLowerCase(),
        status: mapProjectStatus(result.status),
      },
    },
  };
}
