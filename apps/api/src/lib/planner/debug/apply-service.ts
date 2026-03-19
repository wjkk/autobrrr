import { Prisma } from '@prisma/client';

import { readObject, readString } from '../../json-helpers.js';
import { plannerRefinementAssistantPackageSchema } from '../agent/schemas.js';
import { prisma } from '../../prisma.js';
import { requireOwnedEpisode } from '../../workspace-shared.js';
import { syncPlannerRefinementDerivedData } from '../refinement/sync.js';

function readPlannerDebugWorkspaceContext(inputJson: unknown) {
  const record = readObject(inputJson);
  return {
    projectId: readString(record.projectId),
    episodeId: readString(record.episodeId),
  };
}

interface PlannerDebugApplyDeps {
  prisma: typeof prisma;
  requireOwnedEpisode: typeof requireOwnedEpisode;
}

const defaultPlannerDebugApplyDeps: PlannerDebugApplyDeps = {
  prisma,
  requireOwnedEpisode,
};

async function applyPlannerDebugRunToMainFlowWithDeps(
  userId: string,
  runId: string,
  deps: PlannerDebugApplyDeps,
) {
  const debugRun = await deps.prisma.plannerDebugRun.findFirst({
    where: {
      id: runId,
      userId,
    },
    select: {
      id: true,
      userId: true,
      agentProfileId: true,
      subAgentProfileId: true,
      inputJson: true,
      modelSnapshotJson: true,
      rawText: true,
      finalPrompt: true,
      assistantPackageJson: true,
      createdAt: true,
    },
  });

  if (!debugRun) {
    return null;
  }

  const workspaceContext = readPlannerDebugWorkspaceContext(debugRun.inputJson);
  if (!workspaceContext.projectId || !workspaceContext.episodeId) {
    throw new Error('This debug run does not include project/episode context, so it cannot be applied to the main planner flow.');
  }

  const ownedEpisode = await deps.requireOwnedEpisode(workspaceContext.projectId, workspaceContext.episodeId, userId);
  if (!ownedEpisode) {
    return null;
  }

  const assistantPackageResult = plannerRefinementAssistantPackageSchema.safeParse(debugRun.assistantPackageJson);
  if (!assistantPackageResult.success) {
    throw new Error('Only refinement debug runs with a valid structured assistant package can be applied to the main planner flow.');
  }

  const assistantPackage = assistantPackageResult.data;
  const instruction = readString(readObject(debugRun.inputJson).userPrompt) ?? '应用调试结果';
  const rawInputSnapshot = readObject(debugRun.inputJson);

  const plannerSession = await deps.prisma.plannerSession.findFirst({
    where: {
      projectId: workspaceContext.projectId,
      episodeId: workspaceContext.episodeId,
      isActive: true,
      project: {
        createdById: userId,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      id: true,
      projectId: true,
      episodeId: true,
      outlineVersions: {
        where: {
          isActive: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 1,
        select: {
          id: true,
        },
      },
      refinementVersions: {
        where: {
          isActive: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 1,
        select: {
          id: true,
          structuredDocJson: true,
        },
      },
    },
  });

  if (!plannerSession) {
    throw new Error('No active planner session was found for this project/episode.');
  }

  return deps.prisma.$transaction(async (tx) => {
    const nextVersionNumber =
      (
        await tx.plannerRefinementVersion.aggregate({
          where: { plannerSessionId: plannerSession.id },
          _max: { versionNumber: true },
        })
      )._max.versionNumber ?? 0;

    await tx.plannerRefinementVersion.updateMany({
      where: {
        plannerSessionId: plannerSession.id,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    const refinementVersion = await tx.plannerRefinementVersion.create({
      data: {
        plannerSessionId: plannerSession.id,
        agentProfileId: debugRun.agentProfileId,
        subAgentProfileId: debugRun.subAgentProfileId,
        sourceOutlineVersionId: plannerSession.outlineVersions[0]?.id ?? null,
        sourceRefinementVersionId: plannerSession.refinementVersions[0]?.id ?? null,
        versionNumber: nextVersionNumber + 1,
        triggerType: 'debug_apply',
        status: 'READY',
        instruction,
        assistantMessage: assistantPackage.assistantMessage,
        documentTitle: assistantPackage.documentTitle ?? assistantPackage.structuredDoc.projectTitle,
        generatedText: debugRun.rawText ?? debugRun.finalPrompt,
        structuredDocJson: assistantPackage.structuredDoc as Prisma.InputJsonValue,
        inputSnapshotJson: {
          ...rawInputSnapshot,
          appliedFromDebugRunId: debugRun.id,
          appliedFromDebugRunAt: debugRun.createdAt.toISOString(),
        } as Prisma.InputJsonValue,
        modelSnapshotJson:
          debugRun.modelSnapshotJson && typeof debugRun.modelSnapshotJson === 'object' && !Array.isArray(debugRun.modelSnapshotJson)
            ? (debugRun.modelSnapshotJson as Prisma.InputJsonValue)
            : undefined,
        operationsJson: assistantPackage.operations as Prisma.InputJsonValue,
        isActive: true,
        createdById: userId,
      },
      select: {
        id: true,
        documentTitle: true,
      },
    });

    if (assistantPackage.stepAnalysis.length > 0) {
      await tx.plannerStepAnalysis.createMany({
        data: assistantPackage.stepAnalysis.map((step, index) => ({
          refinementVersionId: refinementVersion.id,
          stepKey: step.id,
          title: step.title,
          status:
            step.status === 'pending'
              ? 'PENDING'
              : step.status === 'running'
                ? 'RUNNING'
                : step.status === 'failed'
                  ? 'FAILED'
                  : 'DONE',
          detailJson: {
            details: step.details,
          } satisfies Prisma.InputJsonValue,
          sortOrder: index + 1,
        })),
      });
    }

    await syncPlannerRefinementDerivedData({
      db: tx,
      refinementVersionId: refinementVersion.id,
      structuredDoc: assistantPackage.structuredDoc,
      previousProjection:
        plannerSession.refinementVersions[0]?.structuredDocJson
        && typeof plannerSession.refinementVersions[0].structuredDocJson === 'object'
        && !Array.isArray(plannerSession.refinementVersions[0].structuredDocJson)
          ? (plannerSession.refinementVersions[0].structuredDocJson as Record<string, unknown>)
          : null,
    });

    await tx.plannerMessage.createMany({
      data: [
        {
          plannerSessionId: plannerSession.id,
          refinementVersionId: refinementVersion.id,
          role: 'ASSISTANT',
          messageType: 'ASSISTANT_TEXT',
          contentJson: {
            text: assistantPackage.assistantMessage,
          } satisfies Prisma.InputJsonValue,
          createdById: userId,
        },
        {
          plannerSessionId: plannerSession.id,
          refinementVersionId: refinementVersion.id,
          role: 'ASSISTANT',
          messageType: 'ASSISTANT_STEPS',
          contentJson: {
            steps: assistantPackage.stepAnalysis,
          } satisfies Prisma.InputJsonValue,
          createdById: userId,
        },
        {
          plannerSessionId: plannerSession.id,
          refinementVersionId: refinementVersion.id,
          role: 'ASSISTANT',
          messageType: 'ASSISTANT_DOCUMENT_RECEIPT',
          contentJson: {
            text: '已将调试运行结果应用到主流程策划工作区。',
            documentTitle: refinementVersion.documentTitle,
            debugRunId: debugRun.id,
          } satisfies Prisma.InputJsonValue,
          createdById: userId,
        },
      ],
    });

    await tx.plannerSession.update({
      where: { id: plannerSession.id },
      data: {
        status: 'READY',
      },
    });

    await tx.project.update({
      where: { id: plannerSession.projectId },
      data: {
        title: assistantPackage.structuredDoc.projectTitle,
        brief: assistantPackage.structuredDoc.summaryBullets[0] ?? ownedEpisode.project.title,
        status: 'READY_FOR_STORYBOARD',
      },
    });

    await tx.episode.update({
      where: { id: plannerSession.episodeId },
      data: {
        title: assistantPackage.structuredDoc.episodeTitle,
        summary: assistantPackage.structuredDoc.summaryBullets[0] ?? ownedEpisode.title,
        status: 'READY_FOR_STORYBOARD',
      },
    });

    return {
      debugRunId: debugRun.id,
      projectId: plannerSession.projectId,
      episodeId: plannerSession.episodeId,
      plannerSessionId: plannerSession.id,
      refinementVersionId: refinementVersion.id,
    };
  });
}

export async function applyPlannerDebugRunToMainFlow(userId: string, runId: string) {
  return applyPlannerDebugRunToMainFlowWithDeps(userId, runId, defaultPlannerDebugApplyDeps);
}

export const __testables = {
  readPlannerDebugWorkspaceContext,
  applyPlannerDebugRunToMainFlowWithDeps,
};
