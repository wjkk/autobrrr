import { getVideoModelCapability, summarizeVideoModelCapabilityForPlanner, type VideoModelCapabilityRecord } from './model-capability.js';

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

export function readTargetVideoModelFamilySlugFromSettings(settingsJson: unknown) {
  const settings = readObject(settingsJson);
  const storyboardConfig = readObject(settings.storyboardConfig);

  return (
    readString(settings.targetVideoModelFamilySlug)
    ?? readString(storyboardConfig.targetVideoModelFamilySlug)
    ?? readString(settings.videoModelFamilySlug)
    ?? null
  );
}

export interface ResolvedPlannerTargetVideoModel extends VideoModelCapabilityRecord {
  summary: string;
}

export async function resolvePlannerTargetVideoModel(args: {
  requestedFamilySlug?: string | null;
  settingsJson?: unknown;
}) {
  const familySlug = readString(args.requestedFamilySlug) ?? readTargetVideoModelFamilySlugFromSettings(args.settingsJson);
  if (!familySlug) {
    return null;
  }

  const model = await getVideoModelCapability(familySlug).catch(() => null);
  if (!model) {
    return null;
  }

  return {
    ...model,
    summary: summarizeVideoModelCapabilityForPlanner({
      familySlug: model.familySlug,
      familyName: model.familyName,
      capability: model.capability,
    }),
  } satisfies ResolvedPlannerTargetVideoModel;
}
