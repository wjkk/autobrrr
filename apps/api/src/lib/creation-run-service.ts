import type { Run } from '@prisma/client';

import { prisma } from './prisma.js';
import { resolveModelSelection } from './model-registry.js';
import { findOwnedShot } from './ownership.js';
import { serializeRunInput } from './run-input.js';
import { resolveUserDefaultModelSelection } from './user-model-defaults.js';

type GenerationRunType = 'IMAGE_GENERATION' | 'VIDEO_GENERATION';
type GenerationModelKind = 'IMAGE' | 'VIDEO';
type ShotPromptField = 'imagePrompt' | 'motionPrompt';

export interface QueueShotGenerationRunArgs {
  projectId: string;
  shotId: string;
  userId: string;
  runType: GenerationRunType;
  modelKind: GenerationModelKind;
  promptField: ShotPromptField;
  promptOverride?: string;
  modelFamily?: string;
  modelEndpoint?: string;
  referenceAssetIds: string[];
  idempotencyKey?: string;
  options?: Record<string, unknown>;
}

export type QueueShotGenerationRunResult =
  | {
      ok: true;
      shot: {
        id: string;
        status: string;
        imagePrompt: string;
        motionPrompt: string;
      };
      run: Run;
    }
  | { ok: false; error: 'NOT_FOUND' | 'MODEL_NOT_FOUND' };

async function queueShotGenerationRunWithDeps(
  args: QueueShotGenerationRunArgs,
  deps: {
    findOwnedShot: typeof findOwnedShot;
    resolveUserDefaultModelSelection: typeof resolveUserDefaultModelSelection;
    resolveModelSelection: typeof resolveModelSelection;
    prisma: Pick<typeof prisma, '$transaction'>;
  },
): Promise<QueueShotGenerationRunResult> {
  const shot = await deps.findOwnedShot(args.projectId, args.shotId, args.userId);
  if (!shot) {
    return { ok: false, error: 'NOT_FOUND' };
  }

  const userDefaultModel = !args.modelFamily && !args.modelEndpoint
    ? await deps.resolveUserDefaultModelSelection(args.userId, args.modelKind)
    : null;

  const resolvedModel = await deps.resolveModelSelection({
    modelKind: args.modelKind,
    familySlug: args.modelFamily ?? shot.targetVideoModelFamilySlug ?? userDefaultModel?.familySlug,
    endpointSlug: args.modelEndpoint ?? userDefaultModel?.endpointSlug,
    strategy: 'default',
  });
  if (!resolvedModel) {
    return { ok: false, error: 'MODEL_NOT_FOUND' };
  }

  const effectivePrompt = args.promptOverride ?? shot[args.promptField];

  const result = await deps.prisma.$transaction(async (tx) => {
    await tx.project.update({
      where: { id: shot.projectId },
      data: { status: 'CREATING' },
    });

    await tx.episode.update({
      where: { id: shot.episodeId },
      data: { status: 'CREATING' },
    });

    const updatedShot = await tx.shot.update({
      where: { id: shot.id },
      data: {
        status: 'QUEUED',
        ...(args.promptOverride
          ? args.promptField === 'imagePrompt'
            ? { imagePrompt: args.promptOverride }
            : { motionPrompt: args.promptOverride }
          : {}),
      },
      select: {
        id: true,
        status: true,
        imagePrompt: true,
        motionPrompt: true,
      },
    });

    const run = await tx.run.create({
      data: {
        projectId: shot.projectId,
        episodeId: shot.episodeId,
        modelFamilyId: resolvedModel.family.id,
        modelProviderId: resolvedModel.provider.id,
        modelEndpointId: resolvedModel.endpoint.id,
        runType: args.runType,
        resourceType: 'shot',
        resourceId: shot.id,
        status: 'QUEUED',
        executorType: 'SYSTEM_WORKER',
        idempotencyKey: args.idempotencyKey ?? null,
        inputJson: serializeRunInput({
          shotId: shot.id,
          prompt: effectivePrompt,
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
          referenceAssetIds: args.referenceAssetIds,
          options: args.options ?? null,
        }),
      },
    });

    return { shot: updatedShot, run };
  });

  return {
    ok: true,
    shot: {
      id: result.shot.id,
      status: result.shot.status.toLowerCase(),
      imagePrompt: result.shot.imagePrompt,
      motionPrompt: result.shot.motionPrompt,
    },
    run: result.run,
  };
}

export async function queueShotGenerationRun(args: QueueShotGenerationRunArgs): Promise<QueueShotGenerationRunResult> {
  return queueShotGenerationRunWithDeps(args, {
    findOwnedShot,
    resolveUserDefaultModelSelection,
    resolveModelSelection,
    prisma,
  });
}

export const __testables = {
  queueShotGenerationRunWithDeps,
};
