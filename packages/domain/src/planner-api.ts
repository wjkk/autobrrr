import type { PlannerOutlineDoc, PlannerStructuredDoc } from './planner-doc';
import type { PlannerRuntimeStatus } from './shared';

export interface ApiPlannerAssetOption {
  id: string;
  sourceUrl: string | null;
  fileName: string;
  mediaKind: string;
  sourceKind: string;
  createdAt: string;
}

export interface ApiPlannerEntityRecommendation {
  id: string;
  title: string;
  prompt: string;
  rationale: string;
  referenceAssetIds: string[];
  referenceAssets: ApiPlannerAssetOption[];
}

export interface ApiPlannerDebugApplySource {
  debugRunId: string | null;
  appliedAt: string | null;
}

export interface ApiPlannerShotPromptPreview {
  refinementVersionId: string;
  model: {
    familySlug: string;
    familyName: string;
    summary: string;
    capability: {
      supportsMultiShot: boolean;
      maxShotsPerGeneration: number;
      timestampMeaning: 'narrative-hint' | 'hard-constraint' | 'ignored';
      audioDescStyle: 'inline' | 'none';
      referenceImageSupport: 'none' | 'style' | 'character' | 'full';
      maxReferenceImages: number;
      maxReferenceVideos: number;
      maxReferenceAudios: number;
      cameraVocab: 'chinese' | 'english-cinematic' | 'both';
      maxDurationSeconds: number | null;
      maxResolution: string | null;
      promptStyle: 'narrative' | 'single-shot';
      qualityNote?: string;
      knownIssues: string[];
      integrationStatus?: 'active' | 'planned';
    };
  };
  prompts: Array<{
    groupId: string;
    modelFamilySlug: string;
    shotIds: string[];
    actId: string;
    mode: 'multi-shot' | 'single-shot';
    promptText: string;
    promptPayload: {
      familySlug: string;
      supportsMultiShot: boolean;
      shotCount: number;
      audioDescStyle: 'inline' | 'none';
      cameraVocab: 'chinese' | 'english-cinematic' | 'both';
    };
  }>;
}

export interface ApiPlannerWorkspaceAssetBinding extends ApiPlannerAssetOption {}

export interface ApiPlannerWorkspaceEntityAssetBinding {
  id: string;
  sourceUrl: string | null;
  fileName: string;
  mediaKind: string;
  sourceKind: string;
  createdAt: string;
}

export interface ApiPlannerWorkspaceSubject {
  id: string;
  name: string;
  role: string;
  appearance: string;
  personality: string | null;
  prompt: string;
  negativePrompt: string | null;
  referenceAssetIds: string[];
  generatedAssetIds: string[];
  referenceAssets: ApiPlannerWorkspaceEntityAssetBinding[];
  generatedAssets: ApiPlannerWorkspaceEntityAssetBinding[];
  sortOrder: number;
  editable: boolean;
}

export interface ApiPlannerWorkspaceScene {
  id: string;
  name: string;
  time: string;
  locationType: string;
  description: string;
  prompt: string;
  negativePrompt: string | null;
  referenceAssetIds: string[];
  generatedAssetIds: string[];
  referenceAssets: ApiPlannerWorkspaceEntityAssetBinding[];
  generatedAssets: ApiPlannerWorkspaceEntityAssetBinding[];
  sortOrder: number;
  editable: boolean;
}

export interface ApiPlannerWorkspaceShotScript {
  id: string;
  sceneId: string | null;
  actKey: string;
  actTitle: string;
  shotNo: string;
  title: string;
  durationSeconds: number | null;
  targetModelFamilySlug?: string | null;
  visualDescription: string;
  composition: string;
  cameraMotion: string;
  voiceRole: string;
  dialogue: string;
  subjectBindings: unknown[];
  referenceAssetIds: string[];
  generatedAssetIds: string[];
  referenceAssets: ApiPlannerWorkspaceEntityAssetBinding[];
  generatedAssets: ApiPlannerWorkspaceEntityAssetBinding[];
  sortOrder: number;
}

export interface ApiPlannerWorkspace {
  availableAssets?: ApiPlannerAssetOption[];
  project: {
    id: string;
    title: string;
    status: string;
    contentMode: 'single' | 'series';
    currentEpisodeId: string | null;
    creationConfig?: {
      selectedTab: string;
      selectedSubtype: string | null;
    } | null;
  };
  episode: {
    id: string;
    episodeNo: number;
    title: string;
    summary: string | null;
    status: string;
  };
  plannerSession: {
    id: string;
    status: string;
    stage?: 'idle' | 'outline' | 'refinement';
    runtimeStatus?: PlannerRuntimeStatus;
    outlineConfirmedAt: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
  latestPlannerRun: {
    id: string;
    status: string;
    executionMode: 'live' | 'fallback' | null;
    providerStatus: string | null;
    generatedText: string | null;
    structuredDoc: PlannerStructuredDoc | null;
    errorCode: string | null;
    errorMessage: string | null;
    createdAt: string;
    finishedAt: string | null;
  } | null;
  messages?: Array<{
    id: string;
    role: string;
    messageType: string;
    content: Record<string, unknown> | null;
    outlineVersionId?: string | null;
    refinementVersionId: string | null;
    createdAt: string;
  }>;
  activeOutline?: {
    id: string;
    versionNumber: number;
    triggerType: string;
    status: string;
    documentTitle: string | null;
    assistantMessage: string | null;
    generatedText: string | null;
    outlineDoc: PlannerOutlineDoc | null;
    isConfirmed: boolean;
    confirmedAt: string | null;
    isActive: boolean;
    createdAt: string;
  } | null;
  outlineVersions?: Array<{
    id: string;
    versionNumber: number;
    triggerType: string;
    status: string;
    documentTitle: string | null;
    isConfirmed: boolean;
    isActive: boolean;
    createdAt: string;
  }>;
  activeRefinement?: {
    debugApplySource?: ApiPlannerDebugApplySource | null;
    id: string;
    versionNumber: number;
    triggerType: string;
    status: string;
    documentTitle: string | null;
    assistantMessage: string | null;
    generatedText: string | null;
    structuredDoc: PlannerStructuredDoc | null;
    sourceOutlineVersionId?: string | null;
    sourceRefinementVersionId?: string | null;
    isConfirmed: boolean;
    confirmedAt: string | null;
    subAgentProfile: {
      id: string;
      slug: string;
      subtype: string;
      displayName: string;
    } | null;
    subjects?: ApiPlannerWorkspaceSubject[];
    scenes?: ApiPlannerWorkspaceScene[];
    shotScripts?: ApiPlannerWorkspaceShotScript[];
    stepAnalysis: Array<{
      id: string;
      stepKey: string;
      title: string;
      status: string;
      detail: Record<string, unknown> | null;
      sortOrder: number;
    }>;
    createdAt: string;
  } | null;
  refinementVersions?: Array<{
    debugApplySource?: ApiPlannerDebugApplySource | null;
    id: string;
    versionNumber: number;
    triggerType: string;
    status: string;
    documentTitle: string | null;
    isActive: boolean;
    sourceOutlineVersionId?: string | null;
    sourceRefinementVersionId?: string | null;
    isConfirmed: boolean;
    confirmedAt: string | null;
    createdAt: string;
  }>;
  subjects?: ApiPlannerWorkspaceSubject[];
  scenes?: ApiPlannerWorkspaceScene[];
  shotScripts?: ApiPlannerWorkspaceShotScript[];
}

export interface ApiPlannerRun {
  run: {
    id: string;
    status: string;
  };
}

export interface ApiPlannerFinalizeResult {
  refinementVersionId: string;
  targetVideoModelFamilySlug: string;
  finalizedShotCount: number;
  finalizedAt: string;
}

export interface ApiPlannerEntityRecommendationResult {
  entityKind: 'subject' | 'scene';
  entityId: string;
  entityName: string;
  recommendations: ApiPlannerEntityRecommendation[];
}

export type PlannerRerunScope =
  | {
      type: 'subject';
      subjectId: string;
    }
  | {
      type: 'scene';
      sceneId: string;
    }
  | {
      type: 'act';
      actId: string;
    }
  | {
      type: 'shot';
      shotIds: string[];
    };
