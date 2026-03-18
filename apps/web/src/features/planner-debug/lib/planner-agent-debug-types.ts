export interface PlannerAgentProfileDebugItem {
  id: string;
  slug: string;
  contentType: string;
  displayName: string;
  description: string | null;
  version: number;
  status: string;
  defaultSystemPrompt: string;
  defaultDeveloperPrompt: string | null;
  defaultStepDefinitionsJson: unknown;
  defaultInputSchemaJson: unknown;
  defaultOutputSchemaJson: unknown;
  subAgentProfiles: PlannerSubAgentProfileDebugItem[];
}

export interface PlannerSubAgentProfileDebugItem {
  id: string;
  slug: string;
  subtype: string;
  displayName: string;
  description: string | null;
  version: number;
  status: string;
  systemPromptOverride: string | null;
  developerPromptOverride: string | null;
  stepDefinitionsJson: unknown;
  inputSchemaJson: unknown;
  outputSchemaJson: unknown;
  toolPolicyJson: unknown;
  defaultGenerationConfigJson: unknown;
}

export interface PlannerSubAgentCatalogEntry {
  profile: PlannerAgentProfileDebugItem;
  subAgent: PlannerSubAgentProfileDebugItem;
}

export interface PlannerStepDefinitionEditorItem {
  id: string;
  title: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  details: string[];
}

export interface PlannerSubAgentReleaseItem {
  id: string;
  releaseVersion: number;
  displayName: string;
  description: string | null;
  systemPromptOverride: string | null;
  developerPromptOverride: string | null;
  stepDefinitionsJson: unknown;
  inputSchemaJson: unknown;
  outputSchemaJson: unknown;
  toolPolicyJson: unknown;
  defaultGenerationConfigJson: unknown;
  publishedAt: string;
}

export interface PlannerPromptSnapshot {
  systemPromptFinal: string;
  developerPromptFinal: string;
  messagesFinal: Array<{
    role: string;
    content: string;
  }>;
  inputContextSnapshot: Record<string, unknown>;
  modelSelectionSnapshot?: Record<string, unknown>;
}

export interface PlannerUsageSummary {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number | null;
  currency: string | null;
  source: 'provider' | 'estimated';
}

export interface PlannerDebugRunResponse {
  debugRunId: string;
  createdAt: string;
  executionMode: 'live' | 'fallback';
  configSource: 'draft' | 'published';
  releaseVersion: number | null;
  replaySourceRunId?: string | null;
  input: Record<string, unknown>;
  agentProfile: {
    id: string;
    slug: string;
    displayName: string;
  };
  subAgentProfile: {
    id: string;
    slug: string;
    subtype: string;
    displayName: string;
  };
  model: {
    family: {
      id: string;
      slug: string;
      name: string;
    };
    provider: {
      id: string;
      code: string;
      name: string;
    };
    endpoint: {
      id: string;
      slug: string;
      label: string;
      remoteModelKey: string;
      costConfig?: Record<string, unknown> | null;
    };
  };
  finalPrompt: string;
  promptSnapshot?: PlannerPromptSnapshot | null;
  rawText: string | null;
  providerOutput: Record<string, unknown> | null;
  assistantPackage: Record<string, unknown>;
  usage?: PlannerUsageSummary;
  diffSummary?: string[];
  errorMessage?: string | null;
}

export interface PlannerDebugRunListItem {
  id: string;
  compareGroupKey: string | null;
  compareLabel: string | null;
  executionMode: 'live' | 'fallback';
  createdAt: string;
  errorMessage: string | null;
  agentProfile: {
    id: string;
    slug: string;
    displayName: string;
  } | null;
  subAgentProfile: {
    id: string;
    slug: string;
    subtype: string;
    displayName: string;
  } | null;
}

export interface PlannerDebugRunDetail extends PlannerDebugRunListItem {
  model: Record<string, unknown> | null;
  input: Record<string, unknown> | null;
  replaySourceRunId?: string | null;
  finalPrompt: string;
  promptSnapshot?: PlannerPromptSnapshot | null;
  rawText: string | null;
  providerOutput: Record<string, unknown> | null;
  assistantPackage: Record<string, unknown> | null;
  usage?: PlannerUsageSummary;
  diffSummary?: string[];
}

export interface PlannerDebugCompareResponse {
  compareGroupKey: string;
  left: PlannerDebugRunResponse;
  right: PlannerDebugRunResponse;
}

export interface PlannerDebugApplyResult {
  debugRunId: string;
  projectId: string;
  episodeId: string;
  plannerSessionId: string;
  refinementVersionId: string;
}
