import type { StudioFixture } from '@aiv/domain';

import type { PlannerOutlineDoc } from './planner-outline-doc';
import type { PlannerStructuredDoc } from './planner-structured-doc';

export interface PlannerRuntimeApiContext {
  projectId: string;
  episodeId: string;
}

export interface ApiPlannerWorkspace {
  availableAssets?: Array<{
    id: string;
    sourceUrl: string | null;
    fileName: string;
    mediaKind: string;
    sourceKind: string;
    createdAt: string;
  }>;
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
    outlineConfirmedAt: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
  latestPlannerRun: {
    id: string;
    status: string;
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
    id: string;
    versionNumber: number;
    triggerType: string;
    status: string;
    documentTitle: string | null;
    assistantMessage: string | null;
    generatedText: string | null;
    structuredDoc: PlannerStructuredDoc | null;
    subAgentProfile: {
      id: string;
      slug: string;
      subtype: string;
      displayName: string;
    } | null;
    subjects?: Array<{
      id: string;
      name: string;
      role: string;
      appearance: string;
      personality: string | null;
      prompt: string;
      negativePrompt: string | null;
      referenceAssetIds: string[];
      generatedAssetIds: string[];
      referenceAssets: Array<{
        id: string;
        sourceUrl: string | null;
        fileName: string;
        mediaKind: string;
        sourceKind: string;
        createdAt: string;
      }>;
      generatedAssets: Array<{
        id: string;
        sourceUrl: string | null;
        fileName: string;
        mediaKind: string;
        sourceKind: string;
        createdAt: string;
      }>;
      sortOrder: number;
      editable: boolean;
    }>;
    scenes?: Array<{
      id: string;
      name: string;
      time: string;
      locationType: string;
      description: string;
      prompt: string;
      negativePrompt: string | null;
      referenceAssetIds: string[];
      generatedAssetIds: string[];
      referenceAssets: Array<{
        id: string;
        sourceUrl: string | null;
        fileName: string;
        mediaKind: string;
        sourceKind: string;
        createdAt: string;
      }>;
      generatedAssets: Array<{
        id: string;
        sourceUrl: string | null;
        fileName: string;
        mediaKind: string;
        sourceKind: string;
        createdAt: string;
      }>;
      sortOrder: number;
      editable: boolean;
    }>;
    shotScripts?: Array<{
      id: string;
      sceneId: string | null;
      actKey: string;
      actTitle: string;
      shotNo: string;
      title: string;
      durationSeconds: number | null;
      visualDescription: string;
      composition: string;
      cameraMotion: string;
      voiceRole: string;
      dialogue: string;
      subjectBindings: unknown[];
      referenceAssetIds: string[];
      generatedAssetIds: string[];
      referenceAssets: Array<{
        id: string;
        sourceUrl: string | null;
        fileName: string;
        mediaKind: string;
        sourceKind: string;
        createdAt: string;
      }>;
      generatedAssets: Array<{
        id: string;
        sourceUrl: string | null;
        fileName: string;
        mediaKind: string;
        sourceKind: string;
        createdAt: string;
      }>;
      sortOrder: number;
    }>;
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
    id: string;
    versionNumber: number;
    triggerType: string;
    status: string;
    documentTitle: string | null;
    isActive: boolean;
    createdAt: string;
  }>;
  subjects?: Array<{
    id: string;
    name: string;
    role: string;
    appearance: string;
    personality: string | null;
    prompt: string;
    negativePrompt: string | null;
    referenceAssetIds: string[];
    generatedAssetIds: string[];
    referenceAssets: Array<{
      id: string;
      sourceUrl: string | null;
      fileName: string;
      mediaKind: string;
      sourceKind: string;
      createdAt: string;
    }>;
    generatedAssets: Array<{
      id: string;
      sourceUrl: string | null;
      fileName: string;
      mediaKind: string;
      sourceKind: string;
      createdAt: string;
    }>;
    sortOrder: number;
    editable: boolean;
  }>;
  scenes?: Array<{
    id: string;
    name: string;
    time: string;
    locationType: string;
    description: string;
    prompt: string;
    negativePrompt: string | null;
    referenceAssetIds: string[];
    generatedAssetIds: string[];
    referenceAssets: Array<{
      id: string;
      sourceUrl: string | null;
      fileName: string;
      mediaKind: string;
      sourceKind: string;
      createdAt: string;
    }>;
    generatedAssets: Array<{
      id: string;
      sourceUrl: string | null;
      fileName: string;
      mediaKind: string;
      sourceKind: string;
      createdAt: string;
    }>;
    sortOrder: number;
    editable: boolean;
  }>;
  shotScripts?: Array<{
    id: string;
    sceneId: string | null;
    actKey: string;
    actTitle: string;
    shotNo: string;
    title: string;
    durationSeconds: number | null;
    visualDescription: string;
    composition: string;
    cameraMotion: string;
    voiceRole: string;
    dialogue: string;
    subjectBindings: unknown[];
    referenceAssetIds: string[];
    generatedAssetIds: string[];
    referenceAssets: Array<{
      id: string;
      sourceUrl: string | null;
      fileName: string;
      mediaKind: string;
      sourceKind: string;
      createdAt: string;
    }>;
    generatedAssets: Array<{
      id: string;
      sourceUrl: string | null;
      fileName: string;
      mediaKind: string;
      sourceKind: string;
      createdAt: string;
    }>;
    sortOrder: number;
  }>;
}

export interface ApiPlannerRun {
  run: {
    id: string;
    status: string;
  };
}

export interface PlannerPageBootstrap {
  studio: StudioFixture | null;
  runtimeApi?: PlannerRuntimeApiContext;
  initialGeneratedText?: string | null;
  initialStructuredDoc?: PlannerStructuredDoc | null;
  initialPlannerReady?: boolean;
  initialWorkspace?: ApiPlannerWorkspace | null;
}
