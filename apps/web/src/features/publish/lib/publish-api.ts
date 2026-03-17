import type { PublishPageData } from './publish-page-data';

export interface PublishRuntimeApiContext {
  projectId: string;
  episodeId: string;
}

export interface ApiPublishWorkspace {
  project: {
    id: string;
    title: string;
    status: string;
  };
  episode: {
    id: string;
    episodeNo: number;
    title: string;
    status: string;
  };
  summary: {
    totalShots: number;
    publishableShotCount: number;
    readyToPublish: boolean;
  };
  shots: Array<{
    id: string;
    sequenceNo: number;
    title: string;
    status: string;
    activeVersionId: string | null;
    activeVersion: {
      id: string;
      label: string;
      mediaKind: 'image' | 'video';
      status: string;
    } | null;
  }>;
}

export interface PublishPageBootstrap {
  studio: PublishPageData | null;
  runtimeApi?: PublishRuntimeApiContext;
  initialPublishWorkspace?: ApiPublishWorkspace | null;
}

export interface PublishSubmitResult {
  run: {
    id: string;
    status: string;
  };
}
