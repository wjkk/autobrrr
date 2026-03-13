import type { StudioFixture } from '@aiv/domain';

export interface PlannerRuntimeApiContext {
  projectId: string;
  episodeId: string;
}

export interface ApiPlannerWorkspace {
  project: {
    id: string;
    title: string;
    status: string;
    contentMode: 'single' | 'series';
    currentEpisodeId: string | null;
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
    outlineConfirmedAt: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
  latestPlannerRun: {
    id: string;
    status: string;
    providerStatus: string | null;
    generatedText: string | null;
    errorCode: string | null;
    errorMessage: string | null;
    createdAt: string;
    finishedAt: string | null;
  } | null;
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
  initialPlannerReady?: boolean;
}
