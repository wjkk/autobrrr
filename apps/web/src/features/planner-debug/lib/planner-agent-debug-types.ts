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
  publishedAt: string;
}

export interface PlannerDebugRunResponse {
  debugRunId: string;
  createdAt: string;
  executionMode: 'live' | 'fallback';
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
    };
  };
  finalPrompt: string;
  rawText: string | null;
  providerOutput: Record<string, unknown> | null;
  assistantPackage: Record<string, unknown>;
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
  finalPrompt: string;
  rawText: string | null;
  providerOutput: Record<string, unknown> | null;
  assistantPackage: Record<string, unknown> | null;
}

export interface PlannerDebugCompareResponse {
  compareGroupKey: string;
  left: PlannerDebugRunResponse;
  right: PlannerDebugRunResponse;
}
