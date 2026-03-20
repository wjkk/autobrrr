import { Prisma } from '@prisma/client';
import type { PlannerSession, Run } from '@prisma/client';

import { prisma } from '../../prisma.js';
import type { PlannerStepAnalysisItem } from '../agent/schemas.js';
import type { PlannerOutlineDoc } from '../doc/outline-doc.js';
import type { PlannerStructuredDoc } from '../doc/planner-doc.js';
import { syncPlannerRefinementDerivedData } from '../refinement/sync.js';
import { autoGeneratePlannerSubjectAssetsForRefinement } from '../subject-auto-assets.js';

import { normalizeStepStatus, readRunOutputObject } from './conversation-finalizer-shared.js';

export type PlannerDbClient = Prisma.TransactionClient | typeof prisma;

interface PersistedOutlineAssistantPackage {
  assistantMessage: string;
  documentTitle?: string | null;
  outlineDoc: PlannerOutlineDoc;
  operations: unknown;
}

interface PersistedRefinementAssistantPackage {
  assistantMessage: string;
  documentTitle?: string | null;
  structuredDoc: PlannerStructuredDoc;
  operations: unknown;
  stepAnalysis: PlannerStepAnalysisItem[];
}

export async function persistOutlineConversation(args: {
  tx: PlannerDbClient;
  run: Run;
  plannerSession: PlannerSession;
  assistantPackage: PersistedOutlineAssistantPackage;
  triggerType: string;
  inputSnapshot: Record<string, unknown>;
  promptArtifact: Record<string, unknown>;
  modelSnapshot: Prisma.InputJsonObject;
  userPrompt: string;
  episodeTitle: string;
  generatedText: string;
  output: Record<string, unknown>;
  createdById?: string | null;
}) {
  const nextVersionNumber =
    (
      await args.tx.plannerOutlineVersion.aggregate({
        where: { plannerSessionId: args.plannerSession.id },
        _max: { versionNumber: true },
      })
    )._max.versionNumber ?? 0;

  await args.tx.plannerOutlineVersion.updateMany({
    where: {
      plannerSessionId: args.plannerSession.id,
      isActive: true,
    },
    data: {
      isActive: false,
    },
  });

  const outlineVersion = await args.tx.plannerOutlineVersion.create({
    data: {
      plannerSessionId: args.plannerSession.id,
      sourceRunId: args.run.id,
      versionNumber: nextVersionNumber + 1,
      triggerType: args.triggerType,
      status: 'READY',
      instruction: args.userPrompt,
      assistantMessage: args.assistantPackage.assistantMessage,
      documentTitle: args.assistantPackage.documentTitle ?? args.assistantPackage.outlineDoc.projectTitle,
      generatedText: args.generatedText,
      outlineDocJson: args.assistantPackage.outlineDoc as Prisma.InputJsonValue,
      inputSnapshotJson: {
        ...args.inputSnapshot,
        promptArtifact: args.promptArtifact,
      } as Prisma.InputJsonValue,
      modelSnapshotJson: args.modelSnapshot,
      operationsJson: args.assistantPackage.operations as Prisma.InputJsonValue,
      isActive: true,
      createdById: args.createdById ?? null,
    },
  });

  await args.tx.plannerMessage.createMany({
    data: [
      {
        plannerSessionId: args.plannerSession.id,
        outlineVersionId: outlineVersion.id,
        role: 'ASSISTANT',
        messageType: 'ASSISTANT_TEXT',
        contentJson: {
          text: args.assistantPackage.assistantMessage,
        } satisfies Prisma.InputJsonValue,
        createdById: args.createdById ?? null,
      },
      {
        plannerSessionId: args.plannerSession.id,
        outlineVersionId: outlineVersion.id,
        role: 'ASSISTANT',
        messageType: 'ASSISTANT_OUTLINE_CARD',
        contentJson: {
          text: '已生成可确认的大纲版本。',
          documentTitle: outlineVersion.documentTitle,
          outlineDoc: args.assistantPackage.outlineDoc,
        } satisfies Prisma.InputJsonValue,
        createdById: args.createdById ?? null,
      },
    ],
  });

  await args.tx.plannerSession.update({
    where: { id: args.plannerSession.id },
    data: {
      status: 'READY',
    },
  });

  const firstStoryArc = args.assistantPackage.outlineDoc.storyArc[0]?.summary ?? null;
  await args.tx.project.update({
    where: { id: args.plannerSession.projectId },
    data: {
      title: args.assistantPackage.outlineDoc.projectTitle,
      brief: args.assistantPackage.outlineDoc.premise,
      status: 'PLANNING',
    },
  });

  await args.tx.episode.update({
    where: { id: args.plannerSession.episodeId },
    data: {
      title: args.assistantPackage.outlineDoc.storyArc[0]?.title ?? args.episodeTitle,
      summary: firstStoryArc,
      status: 'PLANNING',
    },
  });

  await args.tx.run.update({
    where: { id: args.run.id },
    data: {
      status: 'COMPLETED',
      providerStatus: args.run.providerStatus ?? 'succeeded',
      outputJson: {
        ...args.output,
        targetStage: 'outline',
        generatedText: args.generatedText,
        outlineDoc: args.assistantPackage.outlineDoc,
        assistantPackage: args.assistantPackage as unknown as Prisma.InputJsonValue,
        plannerSessionId: args.plannerSession.id,
        outlineVersionId: outlineVersion.id,
      } satisfies Prisma.InputJsonValue,
      finishedAt: new Date(),
      nextPollAt: null,
    },
  });

  return outlineVersion;
}

export async function persistRefinementConversation(args: {
  tx: PlannerDbClient;
  run: Run;
  plannerSession: PlannerSession;
  assistantPackage: PersistedRefinementAssistantPackage;
  diffSummary: unknown[];
  triggerType: string;
  inputSnapshot: Record<string, unknown>;
  promptArtifact: Record<string, unknown>;
  modelSnapshot: Prisma.InputJsonObject;
  agentProfile: Record<string, unknown>;
  subAgentProfile: Record<string, unknown>;
  inputSourceOutlineVersionId: string | null;
  projectTitle: string;
  episodeTitle: string;
  generatedText: string;
  output: Record<string, unknown>;
  createdById?: string | null;
}) {
  const confirmedAt = args.triggerType === 'confirm_outline' ? new Date() : null;
  const activeOutlineVersion = await args.tx.plannerOutlineVersion.findFirst({
    where: {
      plannerSessionId: args.plannerSession.id,
      isActive: true,
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
    },
  });
  const previousActiveRefinement = await args.tx.plannerRefinementVersion.findFirst({
    where: {
      plannerSessionId: args.plannerSession.id,
      isActive: true,
    },
    select: {
      structuredDocJson: true,
    },
  });

  const nextVersionNumber =
    (
      await args.tx.plannerRefinementVersion.aggregate({
        where: { plannerSessionId: args.plannerSession.id },
        _max: { versionNumber: true },
      })
    )._max.versionNumber ?? 0;

  await args.tx.plannerRefinementVersion.updateMany({
    where: {
      plannerSessionId: args.plannerSession.id,
      isActive: true,
    },
    data: {
      isActive: false,
    },
  });

  const refinementVersion = await args.tx.plannerRefinementVersion.create({
    data: {
      plannerSessionId: args.plannerSession.id,
      agentProfileId: readStringOrNull(args.agentProfile.id),
      subAgentProfileId: readStringOrNull(args.subAgentProfile.id),
      sourceRunId: args.run.id,
      sourceOutlineVersionId: args.inputSourceOutlineVersionId ?? activeOutlineVersion?.id ?? null,
      versionNumber: nextVersionNumber + 1,
      triggerType: args.triggerType,
      status: 'READY',
      instruction: args.projectTitle,
      assistantMessage: args.assistantPackage.assistantMessage,
      documentTitle: args.assistantPackage.documentTitle ?? args.assistantPackage.structuredDoc.projectTitle,
      generatedText: args.generatedText,
      structuredDocJson: args.assistantPackage.structuredDoc as Prisma.InputJsonValue,
      inputSnapshotJson: {
        ...args.inputSnapshot,
        promptArtifact: args.promptArtifact,
      } as Prisma.InputJsonValue,
      modelSnapshotJson: args.modelSnapshot,
      operationsJson: args.assistantPackage.operations as Prisma.InputJsonValue,
      isActive: true,
      createdById: args.createdById ?? null,
    },
  });

  if (args.assistantPackage.stepAnalysis.length > 0) {
    await args.tx.plannerStepAnalysis.createMany({
      data: args.assistantPackage.stepAnalysis.map((step, index) => ({
        refinementVersionId: refinementVersion.id,
        stepKey: step.id,
        title: step.title,
        status: normalizeStepStatus(step.status),
        detailJson: {
          details: step.details,
        } satisfies Prisma.InputJsonValue,
        sortOrder: index + 1,
      })),
    });
  }

  await syncPlannerRefinementDerivedData({
    db: args.tx,
    refinementVersionId: refinementVersion.id,
    structuredDoc: args.assistantPackage.structuredDoc,
    previousProjection:
      previousActiveRefinement?.structuredDocJson && typeof previousActiveRefinement.structuredDocJson === 'object' && !Array.isArray(previousActiveRefinement.structuredDocJson)
        ? (previousActiveRefinement.structuredDocJson as Record<string, unknown>)
        : null,
  });

  await args.tx.plannerMessage.createMany({
    data: [
      {
        plannerSessionId: args.plannerSession.id,
        refinementVersionId: refinementVersion.id,
        role: 'ASSISTANT',
        messageType: 'ASSISTANT_TEXT',
        contentJson: {
          text: args.assistantPackage.assistantMessage,
        } satisfies Prisma.InputJsonValue,
        createdById: args.createdById ?? null,
      },
      {
        plannerSessionId: args.plannerSession.id,
        refinementVersionId: refinementVersion.id,
        role: 'ASSISTANT',
        messageType: 'ASSISTANT_STEPS',
        contentJson: {
          steps: args.assistantPackage.stepAnalysis,
        } satisfies Prisma.InputJsonValue,
        createdById: args.createdById ?? null,
      },
      {
        plannerSessionId: args.plannerSession.id,
        refinementVersionId: refinementVersion.id,
        role: 'ASSISTANT',
        messageType: 'ASSISTANT_DOCUMENT_RECEIPT',
        contentJson: {
          text: '我已按照您的要求完成策划并将内容更新到您右侧的策划文档。',
          documentTitle: refinementVersion.documentTitle,
          diffSummary: args.diffSummary as unknown as Prisma.InputJsonValue,
        } satisfies Prisma.InputJsonValue,
        createdById: args.createdById ?? null,
      },
    ],
  });

  await args.tx.plannerSession.update({
    where: { id: args.plannerSession.id },
    data: {
      status: 'READY',
      ...(confirmedAt ? { outlineConfirmedAt: confirmedAt } : {}),
    },
  });

  if (confirmedAt) {
    await args.tx.plannerOutlineVersion.updateMany({
      where: {
        plannerSessionId: args.plannerSession.id,
      },
      data: {
        isActive: false,
      },
    });

    const latestOutline = await args.tx.plannerOutlineVersion.findFirst({
      where: {
        plannerSessionId: args.plannerSession.id,
      },
      orderBy: { versionNumber: 'desc' },
      select: {
        id: true,
      },
    });

    if (latestOutline) {
      await args.tx.plannerOutlineVersion.update({
        where: { id: latestOutline.id },
        data: {
          isActive: true,
          isConfirmed: true,
          confirmedAt,
        },
      });
    }
  }

  await args.tx.project.update({
    where: { id: args.plannerSession.projectId },
    data: {
      title: args.assistantPackage.structuredDoc.projectTitle,
      brief: args.assistantPackage.structuredDoc.summaryBullets[0] ?? args.projectTitle,
      status: 'READY_FOR_STORYBOARD',
    },
  });

  await args.tx.episode.update({
    where: { id: args.plannerSession.episodeId },
    data: {
      title: args.assistantPackage.structuredDoc.episodeTitle,
      summary: args.assistantPackage.structuredDoc.summaryBullets[0] ?? args.episodeTitle,
      status: 'READY_FOR_STORYBOARD',
    },
  });

  await args.tx.run.update({
    where: { id: args.run.id },
    data: {
      status: 'COMPLETED',
      providerStatus: args.run.providerStatus ?? 'succeeded',
      outputJson: {
        ...args.output,
        targetStage: 'refinement',
        generatedText: args.generatedText,
        structuredDoc: args.assistantPackage.structuredDoc,
        assistantPackage: args.assistantPackage as unknown as Prisma.InputJsonValue,
        diffSummary: args.diffSummary as unknown as Prisma.InputJsonValue,
        plannerSessionId: args.plannerSession.id,
        refinementVersionId: refinementVersion.id,
      } satisfies Prisma.InputJsonValue,
      finishedAt: new Date(),
      nextPollAt: null,
    },
  });

  return refinementVersion;
}

export async function persistPlannerAutoSubjectImageSummary(args: {
  runId: string;
  plannerSession: PlannerSession;
  refinementVersionId: string;
}) {
  if (!args.plannerSession.createdById) {
    return;
  }

  try {
    const autoSubjectImageSummary = await autoGeneratePlannerSubjectAssetsForRefinement({
      userId: args.plannerSession.createdById,
      projectId: args.plannerSession.projectId,
      episodeId: args.plannerSession.episodeId,
      refinementVersionId: args.refinementVersionId,
    });

    await prisma.run.update({
      where: { id: args.runId },
      data: {
        outputJson: {
          ...readRunOutputObject((await prisma.run.findUnique({
            where: { id: args.runId },
            select: { outputJson: true },
          }))?.outputJson),
          autoSubjectImageSummary: autoSubjectImageSummary as unknown as Prisma.InputJsonValue,
        } satisfies Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    await prisma.run.update({
      where: { id: args.runId },
      data: {
        outputJson: {
          ...readRunOutputObject((await prisma.run.findUnique({
            where: { id: args.runId },
            select: { outputJson: true },
          }))?.outputJson),
          autoSubjectImageSummary: {
            refinementVersionId: args.refinementVersionId,
            attempted: 0,
            created: 0,
            skipped: 0,
            failed: 1,
            items: [
              {
                subjectId: '',
                name: 'planner_subject_auto',
                status: 'failed',
                reason: error instanceof Error ? error.message : '自动主体图生成失败。',
              },
            ],
          } as unknown as Prisma.InputJsonValue,
        } satisfies Prisma.InputJsonValue,
      },
    });
  }
}

function readStringOrNull(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : null;
}
