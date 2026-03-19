import { Prisma } from '@prisma/client';
import type { PlannerSession, Run } from '@prisma/client';

import { readObject, readString, toInputJsonObject } from '../../json-helpers.js';
import { parsePlannerAssistantPackage, type PlannerStepAnalysisItem } from '../agent/schemas.js';
import { prisma } from '../../prisma.js';
import type { PlannerStructuredDoc } from '../doc/planner-doc.js';
import { applyPartialRerunScope, buildPartialDiffSummary } from '../refinement/partial.js';
import { syncPlannerRefinementDerivedData } from '../refinement/sync.js';
import { autoGeneratePlannerSubjectAssetsForRefinement } from '../subject-auto-assets.js';

type PlannerDbClient = Prisma.TransactionClient | typeof prisma;

function normalizeStepStatus(status: string) {
  switch (status) {
    case 'pending':
      return 'PENDING' as const;
    case 'running':
      return 'RUNNING' as const;
    case 'failed':
      return 'FAILED' as const;
    default:
      return 'DONE' as const;
  }
}

function normalizeSteps(rawValue: unknown): PlannerStepAnalysisItem[] {
  if (!Array.isArray(rawValue)) {
    return [];
  }

  return rawValue
    .map((value, index) => {
      const record = readObject(value);
      const id = readString(record.id) ?? `step-${index + 1}`;
      const title = readString(record.title);
      if (!title) {
        return null;
      }

      const status = readString(record.status) ?? 'done';
      const details = Array.isArray(record.details)
        ? record.details.filter((detail): detail is string => typeof detail === 'string' && detail.trim().length > 0)
        : [];

      return {
        id,
        title,
        status: status === 'pending' || status === 'running' || status === 'failed' ? status : 'done',
        details,
      } satisfies PlannerStepAnalysisItem;
    })
    .filter((value): value is PlannerStepAnalysisItem => value !== null);
}

function readStructuredDoc(value: unknown): PlannerStructuredDoc | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as PlannerStructuredDoc) : null;
}

function applyTargetVideoModelToStructuredDoc(doc: PlannerStructuredDoc, targetVideoModelFamilySlug: string | null) {
  if (!targetVideoModelFamilySlug) {
    return doc;
  }

  return {
    ...doc,
    acts: doc.acts.map((act) => ({
      ...act,
      shots: act.shots.map((shot) => ({
        ...shot,
        targetModelFamilySlug: readString(shot.targetModelFamilySlug) ?? targetVideoModelFamilySlug,
      })),
    })),
  } satisfies PlannerStructuredDoc;
}

function buildPersistedPromptArtifact(input: Record<string, unknown>) {
  const promptText = readString(input.prompt);
  const targetVideoModelFamilySlug = readString(input.targetVideoModelFamilySlug);
  const contextSnapshot = readObject(input.contextSnapshot);
  const selectedVideoModel = readObject(contextSnapshot.selectedVideoModel);
  const targetVideoModelSummary = readString(selectedVideoModel.capabilitySummary);
  const promptSnapshot = readObject(input.promptSnapshot);

  return {
    promptText,
    targetVideoModelFamilySlug,
    targetVideoModelSummary,
    stepDefinitions: normalizeSteps(input.stepDefinitions),
    promptSnapshot,
  } satisfies Record<string, unknown>;
}

export async function createPlannerUserMessage(args: {
  db: PlannerDbClient;
  plannerSessionId: string;
  userId: string;
  prompt: string;
}) {
  return args.db.plannerMessage.create({
    data: {
      plannerSessionId: args.plannerSessionId,
      role: 'USER',
      messageType: 'USER_INPUT',
      contentJson: {
        text: args.prompt,
      } satisfies Prisma.InputJsonValue,
      createdById: args.userId,
    },
  });
}

export async function finalizePlannerConversation(args: {
  run: Run;
  plannerSession: PlannerSession;
  generatedText: string;
  createdById?: string | null;
}) {
  const input = readObject(args.run.inputJson);
  const output = readObject(args.run.outputJson);
  const agentProfile = readObject(input.agentProfile);
  const subAgentProfile = readObject(input.subAgentProfile);
  const inputSnapshot = readObject(input.contextSnapshot);
  const modelSnapshot = {
    family: toInputJsonObject(readObject(input.modelFamily)),
    provider: toInputJsonObject(readObject(input.modelProvider)),
    endpoint: toInputJsonObject(readObject(input.modelEndpoint)),
  } as Prisma.InputJsonObject;
  const defaultSteps = normalizeSteps(input.stepDefinitions);
  const userPrompt = readString(input.rawPrompt) ?? '未命名策划';
  const projectTitle = readString(input.projectTitle) ?? '未命名项目';
  const episodeTitle = readString(input.episodeTitle) ?? '第1集';
  const contentType = readString(input.contentType) ?? '短剧漫剧';
  const subtype = readString(input.subtype) ?? '对话剧情';
  const contentMode = readString(input.contentMode) ?? null;
  const targetStage = readString(input.targetStage) === 'outline' ? 'outline' : 'refinement';
  const triggerType = readString(input.triggerType) ?? (targetStage === 'outline' ? 'generate_outline' : 'generate_doc');
  const inputSourceOutlineVersionId = readString(input.sourceOutlineVersionId);
  const targetVideoModelFamilySlug = readString(input.targetVideoModelFamilySlug);
  const promptArtifact = buildPersistedPromptArtifact(input);

  const rawAssistantPackage = parsePlannerAssistantPackage({
    targetStage,
    rawText: args.generatedText,
    userPrompt,
    projectTitle,
    episodeTitle,
    defaultSteps,
    contentType,
    subtype,
    contentMode,
  });
  const previousStructuredDoc = readStructuredDoc(
    input.contextSnapshot && typeof input.contextSnapshot === 'object' && !Array.isArray(input.contextSnapshot)
      ? readObject(readObject(input.contextSnapshot).activeRefinement).structuredDoc
      : null,
  );
  const assistantPackage =
    rawAssistantPackage.stage === 'refinement'
      ? {
          ...rawAssistantPackage,
          structuredDoc: applyPartialRerunScope({
            previousDoc: previousStructuredDoc,
            nextDoc: applyTargetVideoModelToStructuredDoc(rawAssistantPackage.structuredDoc, targetVideoModelFamilySlug),
            input,
          }),
        }
      : rawAssistantPackage;
  const diffSummary =
    assistantPackage.stage === 'refinement'
      ? buildPartialDiffSummary({
          previousDoc: previousStructuredDoc,
          nextDoc: assistantPackage.structuredDoc,
          input,
        })
      : [];

  if (assistantPackage.stage === 'outline') {
    const result = await prisma.$transaction(async (tx) => {
      const nextVersionNumber =
        (
          await tx.plannerOutlineVersion.aggregate({
            where: { plannerSessionId: args.plannerSession.id },
            _max: { versionNumber: true },
          })
        )._max.versionNumber ?? 0;

      await tx.plannerOutlineVersion.updateMany({
        where: {
          plannerSessionId: args.plannerSession.id,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });

      const outlineVersion = await tx.plannerOutlineVersion.create({
        data: {
          plannerSessionId: args.plannerSession.id,
          sourceRunId: args.run.id,
          versionNumber: nextVersionNumber + 1,
          triggerType,
          status: 'READY',
          instruction: userPrompt,
          assistantMessage: assistantPackage.assistantMessage,
          documentTitle: assistantPackage.documentTitle ?? assistantPackage.outlineDoc.projectTitle,
          generatedText: args.generatedText,
          outlineDocJson: assistantPackage.outlineDoc as Prisma.InputJsonValue,
          inputSnapshotJson: {
            ...inputSnapshot,
            promptArtifact,
          } as Prisma.InputJsonValue,
          modelSnapshotJson: modelSnapshot,
          operationsJson: assistantPackage.operations as Prisma.InputJsonValue,
          isActive: true,
          createdById: args.createdById ?? null,
        },
      });

      await tx.plannerMessage.createMany({
        data: [
          {
            plannerSessionId: args.plannerSession.id,
            outlineVersionId: outlineVersion.id,
            role: 'ASSISTANT',
            messageType: 'ASSISTANT_TEXT',
            contentJson: {
              text: assistantPackage.assistantMessage,
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
              outlineDoc: assistantPackage.outlineDoc,
            } satisfies Prisma.InputJsonValue,
            createdById: args.createdById ?? null,
          },
        ],
      });

      await tx.plannerSession.update({
        where: { id: args.plannerSession.id },
        data: {
          status: 'READY',
        },
      });

      const firstStoryArc = assistantPackage.outlineDoc.storyArc[0]?.summary ?? null;
      await tx.project.update({
        where: { id: args.plannerSession.projectId },
        data: {
          title: assistantPackage.outlineDoc.projectTitle,
          brief: assistantPackage.outlineDoc.premise,
          status: 'PLANNING',
        },
      });

      await tx.episode.update({
        where: { id: args.plannerSession.episodeId },
        data: {
          title: assistantPackage.outlineDoc.storyArc[0]?.title ?? episodeTitle,
          summary: firstStoryArc,
          status: 'PLANNING',
        },
      });

      await tx.run.update({
        where: { id: args.run.id },
        data: {
          status: 'COMPLETED',
          providerStatus: args.run.providerStatus ?? 'succeeded',
          outputJson: {
            ...output,
            targetStage,
            generatedText: args.generatedText,
            outlineDoc: assistantPackage.outlineDoc,
            assistantPackage,
            plannerSessionId: args.plannerSession.id,
            outlineVersionId: outlineVersion.id,
          } satisfies Prisma.InputJsonValue,
          finishedAt: new Date(),
          nextPollAt: null,
        },
      });

      return outlineVersion;
    });

    return {
      stage: 'outline' as const,
      outlineVersionId: result.id,
      outlineDoc: result.outlineDocJson,
    };
  }

  const result = await prisma.$transaction(async (tx) => {
    const confirmedAt = triggerType === 'confirm_outline' ? new Date() : null;
    const activeOutlineVersion = await tx.plannerOutlineVersion.findFirst({
      where: {
        plannerSessionId: args.plannerSession.id,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
      },
    });
    const previousActiveRefinement = await tx.plannerRefinementVersion.findFirst({
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
        await tx.plannerRefinementVersion.aggregate({
          where: { plannerSessionId: args.plannerSession.id },
          _max: { versionNumber: true },
        })
      )._max.versionNumber ?? 0;

    await tx.plannerRefinementVersion.updateMany({
      where: {
        plannerSessionId: args.plannerSession.id,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    const refinementVersion = await tx.plannerRefinementVersion.create({
      data: {
        plannerSessionId: args.plannerSession.id,
        agentProfileId: readString(agentProfile.id),
        subAgentProfileId: readString(subAgentProfile.id),
        sourceRunId: args.run.id,
        sourceOutlineVersionId: inputSourceOutlineVersionId ?? activeOutlineVersion?.id ?? null,
        versionNumber: nextVersionNumber + 1,
        triggerType,
        status: 'READY',
        instruction: userPrompt,
        assistantMessage: assistantPackage.assistantMessage,
        documentTitle: assistantPackage.documentTitle ?? assistantPackage.structuredDoc.projectTitle,
        generatedText: args.generatedText,
        structuredDocJson: assistantPackage.structuredDoc as Prisma.InputJsonValue,
        inputSnapshotJson: {
          ...inputSnapshot,
          promptArtifact,
        } as Prisma.InputJsonValue,
        modelSnapshotJson: modelSnapshot,
        operationsJson: assistantPackage.operations as Prisma.InputJsonValue,
        isActive: true,
        createdById: args.createdById ?? null,
      },
    });

    if (assistantPackage.stepAnalysis.length > 0) {
      await tx.plannerStepAnalysis.createMany({
        data: assistantPackage.stepAnalysis.map((step, index) => ({
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
      db: tx,
      refinementVersionId: refinementVersion.id,
      structuredDoc: assistantPackage.structuredDoc,
      previousProjection:
        previousActiveRefinement?.structuredDocJson && typeof previousActiveRefinement.structuredDocJson === 'object' && !Array.isArray(previousActiveRefinement.structuredDocJson)
          ? (previousActiveRefinement.structuredDocJson as Record<string, unknown>)
          : null,
    });

    await tx.plannerMessage.createMany({
      data: [
        {
          plannerSessionId: args.plannerSession.id,
          refinementVersionId: refinementVersion.id,
          role: 'ASSISTANT',
          messageType: 'ASSISTANT_TEXT',
          contentJson: {
            text: assistantPackage.assistantMessage,
          } satisfies Prisma.InputJsonValue,
          createdById: args.createdById ?? null,
        },
        {
          plannerSessionId: args.plannerSession.id,
          refinementVersionId: refinementVersion.id,
          role: 'ASSISTANT',
          messageType: 'ASSISTANT_STEPS',
          contentJson: {
            steps: assistantPackage.stepAnalysis,
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
            diffSummary,
          } satisfies Prisma.InputJsonValue,
          createdById: args.createdById ?? null,
        },
      ],
    });

    await tx.plannerSession.update({
      where: { id: args.plannerSession.id },
      data: {
        status: 'READY',
        ...(confirmedAt ? { outlineConfirmedAt: confirmedAt } : {}),
      },
    });

    if (confirmedAt) {
      await tx.plannerOutlineVersion.updateMany({
        where: {
          plannerSessionId: args.plannerSession.id,
        },
        data: {
          isActive: false,
        },
      });

      const latestOutline = await tx.plannerOutlineVersion.findFirst({
        where: {
          plannerSessionId: args.plannerSession.id,
        },
        orderBy: { versionNumber: 'desc' },
        select: {
          id: true,
        },
      });

      if (latestOutline) {
        await tx.plannerOutlineVersion.update({
          where: { id: latestOutline.id },
          data: {
            isActive: true,
            isConfirmed: true,
            confirmedAt,
          },
        });
      }
    }

    await tx.project.update({
      where: { id: args.plannerSession.projectId },
      data: {
        title: assistantPackage.structuredDoc.projectTitle,
        brief: assistantPackage.structuredDoc.summaryBullets[0] ?? projectTitle,
        status: 'READY_FOR_STORYBOARD',
      },
    });

    await tx.episode.update({
      where: { id: args.plannerSession.episodeId },
      data: {
        title: assistantPackage.structuredDoc.episodeTitle,
        summary: assistantPackage.structuredDoc.summaryBullets[0] ?? episodeTitle,
        status: 'READY_FOR_STORYBOARD',
      },
    });

    await tx.run.update({
      where: { id: args.run.id },
      data: {
        status: 'COMPLETED',
        providerStatus: args.run.providerStatus ?? 'succeeded',
        outputJson: {
          ...output,
          targetStage,
          generatedText: args.generatedText,
          structuredDoc: assistantPackage.structuredDoc,
          assistantPackage,
          diffSummary,
          plannerSessionId: args.plannerSession.id,
          refinementVersionId: refinementVersion.id,
        } satisfies Prisma.InputJsonValue,
        finishedAt: new Date(),
        nextPollAt: null,
      },
    });

    return refinementVersion;
  });

  if (args.plannerSession.createdById) {
    try {
      const autoSubjectImageSummary = await autoGeneratePlannerSubjectAssetsForRefinement({
        userId: args.plannerSession.createdById,
        projectId: args.plannerSession.projectId,
        episodeId: args.plannerSession.episodeId,
        refinementVersionId: result.id,
      });

      const currentRun = await prisma.run.findUnique({
        where: { id: args.run.id },
        select: { outputJson: true },
      });
      const currentOutput =
        currentRun?.outputJson && typeof currentRun.outputJson === 'object' && !Array.isArray(currentRun.outputJson)
          ? (currentRun.outputJson as Record<string, unknown>)
          : {};

      await prisma.run.update({
        where: { id: args.run.id },
        data: {
          outputJson: {
            ...currentOutput,
            autoSubjectImageSummary: autoSubjectImageSummary as unknown as Prisma.InputJsonValue,
          } satisfies Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      const currentRun = await prisma.run.findUnique({
        where: { id: args.run.id },
        select: { outputJson: true },
      });
      const currentOutput =
        currentRun?.outputJson && typeof currentRun.outputJson === 'object' && !Array.isArray(currentRun.outputJson)
          ? (currentRun.outputJson as Record<string, unknown>)
          : {};

      await prisma.run.update({
        where: { id: args.run.id },
        data: {
          outputJson: {
            ...currentOutput,
            autoSubjectImageSummary: {
              refinementVersionId: result.id,
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

  return {
    stage: 'refinement' as const,
    refinementVersionId: result.id,
    structuredDoc: result.structuredDocJson,
  };
}
