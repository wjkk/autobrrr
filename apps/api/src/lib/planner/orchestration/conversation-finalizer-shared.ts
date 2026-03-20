import { readObject, readString } from '../../json-helpers.js';
import type { PlannerStepAnalysisItem } from '../agent/schemas.js';
import type { PlannerStructuredDoc } from '../doc/planner-doc.js';

export function normalizeStepStatus(status: string) {
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

export function normalizeSteps(rawValue: unknown): PlannerStepAnalysisItem[] {
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

export function readStructuredDoc(value: unknown): PlannerStructuredDoc | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as PlannerStructuredDoc) : null;
}

export function applyTargetVideoModelToStructuredDoc(doc: PlannerStructuredDoc, targetVideoModelFamilySlug: string | null) {
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

export function buildPersistedPromptArtifact(input: Record<string, unknown>) {
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

export function readRunOutputObject(outputJson: unknown) {
  return outputJson && typeof outputJson === 'object' && !Array.isArray(outputJson)
    ? (outputJson as Record<string, unknown>)
    : {};
}
