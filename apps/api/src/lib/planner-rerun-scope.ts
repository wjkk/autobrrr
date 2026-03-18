import { z } from 'zod';

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export const plannerLegacyRerunScopeSchema = z.object({
  scope: z.enum(['subject_only', 'scene_only', 'shots_only', 'subject', 'scene', 'shot', 'act']),
  targetId: z.string().min(1),
});

export const plannerRerunScopeSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('subject'),
    subjectId: z.string().min(1),
  }),
  z.object({
    type: z.literal('scene'),
    sceneId: z.string().min(1),
  }),
  z.object({
    type: z.literal('act'),
    actId: z.string().min(1),
  }),
  z.object({
    type: z.literal('shot'),
    shotIds: z.array(z.string().min(1)).min(1).max(8),
  }),
]);

export type PlannerRerunScope = z.infer<typeof plannerRerunScopeSchema>;
export type PlannerLegacyRerunScope = z.infer<typeof plannerLegacyRerunScopeSchema>;

export function normalizePlannerRerunScope(input: PlannerRerunScope | PlannerLegacyRerunScope): PlannerRerunScope {
  if ('type' in input) {
    return input;
  }

  if (input.scope === 'subject_only' || input.scope === 'subject') {
    return {
      type: 'subject',
      subjectId: input.targetId,
    };
  }

  if (input.scope === 'scene_only' || input.scope === 'scene') {
    return {
      type: 'scene',
      sceneId: input.targetId,
    };
  }

  if (input.scope === 'act') {
    return {
      type: 'act',
      actId: input.targetId,
    };
  }

  return {
    type: 'shot',
    shotIds: [input.targetId],
  };
}

export function getPlannerRerunScopeTriggerType(scope: PlannerRerunScope) {
  if (scope.type === 'subject') {
    return 'subject_only';
  }
  if (scope.type === 'scene') {
    return 'scene_only';
  }
  if (scope.type === 'shot') {
    return 'shots_only';
  }
  return 'act';
}

export function getPlannerRerunScopeUserLabel(scope: PlannerRerunScope) {
  if (scope.type === 'subject') {
    return `subject:${scope.subjectId}`;
  }
  if (scope.type === 'scene') {
    return `scene:${scope.sceneId}`;
  }
  if (scope.type === 'shot') {
    return `shots:${scope.shotIds.join(',')}`;
  }
  return `act:${scope.actId}`;
}

export function parseStoredPlannerRerunScope(input: Record<string, unknown>): PlannerRerunScope | null {
  const rerunScope = plannerRerunScopeSchema.safeParse(readObject(input.rerunScope));
  if (rerunScope.success) {
    return rerunScope.data;
  }

  const legacy = plannerLegacyRerunScopeSchema.safeParse({
    scope: readString(input.scope),
    targetId: readString(input.targetEntityId),
  });
  if (legacy.success) {
    return normalizePlannerRerunScope(legacy.data);
  }

  return null;
}
