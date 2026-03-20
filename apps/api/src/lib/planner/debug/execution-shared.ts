import type { PlannerStructuredDoc } from '../doc/planner-doc.js';
import { submitTextGeneration } from '../../provider-gateway.js';
import { debugRunSchema } from './contract.js';

export function readStructuredDoc(value: unknown): PlannerStructuredDoc | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as PlannerStructuredDoc) : null;
}

export async function runPlannerTextDebug(args: {
  userId: string;
  providerCode: string | null;
  baseUrl: string | null;
  apiKey: string | null;
  remoteModelKey: string;
  prompt: string;
}) {
  if (!args.providerCode || !args.baseUrl || !args.apiKey) {
    return null;
  }

  return submitTextGeneration({
    providerCode: args.providerCode,
    model: args.remoteModelKey,
    prompt: args.prompt,
    baseUrl: args.baseUrl,
    apiKey: args.apiKey,
    hookMetadata: {
      traceId: `planner-debug:${args.userId}:${args.remoteModelKey}`,
      userId: args.userId,
      resourceType: 'planner_debug',
    },
  });
}

export function parseStoredDebugInput(value: unknown) {
  const parsed = debugRunSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error('Stored planner debug run input is invalid.');
  }

  return parsed.data;
}
