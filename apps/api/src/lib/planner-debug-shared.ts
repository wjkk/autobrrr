import type { PlannerStructuredDoc } from './planner-doc.js';
import { buildPartialDiffSummary } from './planner-refinement-partial.js';

export function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function readString(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function readNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readStructuredDoc(value: unknown): PlannerStructuredDoc | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as PlannerStructuredDoc) : null;
}

function readTargetEntityId(value: unknown) {
  const record = readObject(value);
  return (
    readString(record.id)
    ?? readString(record.subjectId)
    ?? readString(record.sceneId)
    ?? readString(record.shotId)
    ?? readString(record.title)
    ?? null
  );
}

function estimateTokens(text: string | null | undefined) {
  if (!text) {
    return 0;
  }

  return Math.max(1, Math.ceil(text.length / 4));
}

function findUsageLikeObject(value: unknown): Record<string, unknown> | null {
  const queue: unknown[] = [value];

  while (queue.length > 0) {
    const current = queue.shift();
    const record = readObject(current);
    if (!Object.keys(record).length) {
      continue;
    }

    if (
      'input_tokens' in record ||
      'output_tokens' in record ||
      'prompt_tokens' in record ||
      'completion_tokens' in record ||
      'total_tokens' in record
    ) {
      return record;
    }

    for (const next of Object.values(record)) {
      if (next && typeof next === 'object') {
        queue.push(next);
      }
    }
  }

  return null;
}

function readCostRate(costConfig: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = readNumber(costConfig[key]);
    if (value !== null) {
      return value;
    }
  }

  return null;
}

export function buildUsageSummary(args: {
  providerOutput: unknown;
  prompt: string;
  rawText: string | null;
  modelSnapshot: unknown;
}) {
  const usage = findUsageLikeObject(args.providerOutput);
  const promptTokens =
    readNumber(usage?.['input_tokens']) ??
    readNumber(usage?.['prompt_tokens']) ??
    readNumber(usage?.['inputTokens']) ??
    readNumber(usage?.['promptTokens']);
  const completionTokens =
    readNumber(usage?.['output_tokens']) ??
    readNumber(usage?.['completion_tokens']) ??
    readNumber(usage?.['outputTokens']) ??
    readNumber(usage?.['completionTokens']);
  const totalTokens =
    readNumber(usage?.['total_tokens']) ??
    readNumber(usage?.['totalTokens']) ??
    (promptTokens !== null || completionTokens !== null
      ? (promptTokens ?? 0) + (completionTokens ?? 0)
      : null);

  const modelSnapshot = readObject(args.modelSnapshot);
  const endpoint = readObject(modelSnapshot.endpoint);
  const costConfig = readObject(endpoint.costConfig);
  const inputRate = readCostRate(costConfig, [
    'inputPer1kTokens',
    'input_per_1k_tokens',
    'promptPer1kTokens',
    'prompt_per_1k_tokens',
  ]);
  const outputRate = readCostRate(costConfig, [
    'outputPer1kTokens',
    'output_per_1k_tokens',
    'completionPer1kTokens',
    'completion_per_1k_tokens',
  ]);
  const currency = readString(costConfig.currency);

  const promptTokenValue = promptTokens ?? estimateTokens(args.prompt);
  const completionTokenValue = completionTokens ?? estimateTokens(args.rawText);
  const totalTokenValue = totalTokens ?? promptTokenValue + completionTokenValue;
  const hasProviderUsage = promptTokens !== null || completionTokens !== null || totalTokens !== null;
  const cost =
    inputRate !== null || outputRate !== null
      ? ((promptTokenValue / 1000) * (inputRate ?? 0)) + ((completionTokenValue / 1000) * (outputRate ?? 0))
      : null;

  return {
    promptTokens: promptTokenValue,
    completionTokens: completionTokenValue,
    totalTokens: totalTokenValue,
    cost,
    currency,
    source: hasProviderUsage ? ('provider' as const) : ('estimated' as const),
  };
}

export function readPromptSnapshot(value: unknown) {
  const record = readObject(value);
  const messages = Array.isArray(record.messagesFinal)
    ? record.messagesFinal
        .map((item) => {
          const next = readObject(item);
          const role = readString(next.role);
          const content = readString(next.content);
          if (!role || !content) {
            return null;
          }

          return {
            role,
            content,
          };
        })
        .filter((item): item is { role: string; content: string } => item !== null)
    : [];

  if (!messages.length) {
    return null;
  }

  return {
    systemPromptFinal: readString(record.systemPromptFinal) ?? '',
    developerPromptFinal: readString(record.developerPromptFinal) ?? '',
    messagesFinal: messages,
    inputContextSnapshot: readObject(record.inputContextSnapshot),
    modelSelectionSnapshot: readObject(record.modelSelectionSnapshot),
  };
}

export function deriveDiffSummary(args: {
  targetStage: 'outline' | 'refinement';
  partialRerunScope?: 'none' | 'subject_only' | 'scene_only' | 'shots_only';
  currentStructuredDoc?: Record<string, unknown>;
  targetEntity?: Record<string, unknown>;
  assistantPackage: Record<string, unknown>;
}) {
  if (args.targetStage !== 'refinement' || !args.partialRerunScope || args.partialRerunScope === 'none') {
    return [] as string[];
  }

  const nextDoc = readStructuredDoc(args.assistantPackage.structuredDoc);
  if (!nextDoc) {
    return [];
  }

  return buildPartialDiffSummary({
    previousDoc: readStructuredDoc(args.currentStructuredDoc),
    nextDoc,
    input: {
      scope: args.partialRerunScope,
      targetEntityId: readTargetEntityId(args.targetEntity),
      targetEntity: args.targetEntity ?? {},
    },
  });
}
