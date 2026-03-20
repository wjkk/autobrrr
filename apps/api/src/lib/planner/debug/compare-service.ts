import { randomUUID } from 'node:crypto';

import { prisma } from '../../prisma.js';
import type { PlannerDebugCompareInput } from './contract.js';
import { executePlannerDebugRun } from './execution-service.js';

async function comparePlannerDebugRunsWithDeps(
  userId: string,
  payload: PlannerDebugCompareInput,
  deps: {
    prisma: typeof prisma;
    executePlannerDebugRun: typeof executePlannerDebugRun;
  },
) {
  const [leftSubAgent, rightSubAgent] = await Promise.all([
    deps.prisma.plannerSubAgentProfile.findUnique({
      where: { id: payload.leftSubAgentId },
      include: { agentProfile: true },
    }),
    deps.prisma.plannerSubAgentProfile.findUnique({
      where: { id: payload.rightSubAgentId },
      include: { agentProfile: true },
    }),
  ]);

  if (!leftSubAgent || !rightSubAgent) {
    return null;
  }

  const compareGroupKey = randomUUID();

  const [leftResult, rightResult] = await Promise.all([
    deps.executePlannerDebugRun({
      userId,
      contentType: leftSubAgent.agentProfile.contentType,
      subtype: leftSubAgent.subtype,
      subAgentId: leftSubAgent.id,
      configSource: payload.configSource,
      targetStage: payload.targetStage,
      projectTitle: payload.projectTitle,
      episodeTitle: payload.episodeTitle,
      userPrompt: payload.userPrompt,
      scriptContent: payload.scriptContent,
      selectedSubjectName: payload.selectedSubjectName,
      selectedStyleName: payload.selectedStyleName,
      selectedImageModelLabel: payload.selectedImageModelLabel,
      targetVideoModelFamilySlug: payload.targetVideoModelFamilySlug,
      priorMessages: payload.priorMessages,
      currentOutlineDoc: payload.currentOutlineDoc,
      currentStructuredDoc: payload.currentStructuredDoc,
      partialRerunScope: payload.partialRerunScope,
      targetEntity: payload.targetEntity,
      plannerAssets: payload.plannerAssets,
      modelFamily: payload.modelFamily,
      modelEndpoint: payload.modelEndpoint,
      compareGroupKey,
      compareLabel: 'A',
    }),
    deps.executePlannerDebugRun({
      userId,
      contentType: rightSubAgent.agentProfile.contentType,
      subtype: rightSubAgent.subtype,
      subAgentId: rightSubAgent.id,
      configSource: payload.configSource,
      targetStage: payload.targetStage,
      projectTitle: payload.projectTitle,
      episodeTitle: payload.episodeTitle,
      userPrompt: payload.userPrompt,
      scriptContent: payload.scriptContent,
      selectedSubjectName: payload.selectedSubjectName,
      selectedStyleName: payload.selectedStyleName,
      selectedImageModelLabel: payload.selectedImageModelLabel,
      targetVideoModelFamilySlug: payload.targetVideoModelFamilySlug,
      priorMessages: payload.priorMessages,
      currentOutlineDoc: payload.currentOutlineDoc,
      currentStructuredDoc: payload.currentStructuredDoc,
      partialRerunScope: payload.partialRerunScope,
      targetEntity: payload.targetEntity,
      plannerAssets: payload.plannerAssets,
      modelFamily: payload.modelFamily,
      modelEndpoint: payload.modelEndpoint,
      compareGroupKey,
      compareLabel: 'B',
    }),
  ]);

  return {
    compareGroupKey,
    left: leftResult,
    right: rightResult,
  };
}

export async function comparePlannerDebugRuns(userId: string, payload: PlannerDebugCompareInput) {
  return comparePlannerDebugRunsWithDeps(userId, payload, {
    prisma,
    executePlannerDebugRun,
  });
}

export const __testables = {
  comparePlannerDebugRunsWithDeps,
};
