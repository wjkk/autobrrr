import { Prisma } from '@prisma/client';
import type { PlannerSession, Run } from '@prisma/client';

import { readObject, readString, toInputJsonObject } from '../../json-helpers.js';
import { parsePlannerAssistantPackage } from '../agent/schemas.js';
import { prisma } from '../../prisma.js';
import { applyPartialRerunScope, buildPartialDiffSummary } from '../refinement/partial.js';

export { createPlannerUserMessage } from './conversation-message-service.js';
import {
  applyTargetVideoModelToStructuredDoc,
  buildPersistedPromptArtifact,
  normalizeSteps,
  readStructuredDoc,
} from './conversation-finalizer-shared.js';
import {
  persistOutlineConversation,
  persistPlannerAutoSubjectImageSummary,
  persistRefinementConversation,
} from './conversation-persistence.js';

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
    const result = await prisma.$transaction((tx) =>
      persistOutlineConversation({
        tx,
        run: args.run,
        plannerSession: args.plannerSession,
        assistantPackage,
        triggerType,
        inputSnapshot,
        promptArtifact,
        modelSnapshot,
        userPrompt,
        episodeTitle,
        generatedText: args.generatedText,
        output,
        createdById: args.createdById,
      }),
    );

    return {
      stage: 'outline' as const,
      outlineVersionId: result.id,
      outlineDoc: result.outlineDocJson,
    };
  }

  const result = await prisma.$transaction((tx) =>
    persistRefinementConversation({
      tx,
      run: args.run,
      plannerSession: args.plannerSession,
      assistantPackage,
      diffSummary,
      triggerType,
      inputSnapshot,
      promptArtifact,
      modelSnapshot,
      agentProfile,
      subAgentProfile,
      inputSourceOutlineVersionId,
      projectTitle: userPrompt,
      episodeTitle,
      generatedText: args.generatedText,
      output,
      createdById: args.createdById,
    }),
  );

  await persistPlannerAutoSubjectImageSummary({
    runId: args.run.id,
    plannerSession: args.plannerSession,
    refinementVersionId: result.id,
  });

  return {
    stage: 'refinement' as const,
    refinementVersionId: result.id,
    structuredDoc: result.structuredDocJson,
  };
}
