export interface CreateStudioProjectInput {
  prompt: string;
  contentMode: 'single' | 'series';
  creationConfig?: {
    selectedTab: '短剧漫剧' | '音乐MV' | '知识分享';
    selectedSubtype?: string;
    scriptSourceName?: string;
    scriptContent?: string;
    imageModelEndpointSlug?: string;
    subjectProfileSlug?: string;
    stylePresetSlug?: string;
    settings?: Record<string, unknown>;
  };
}

type CreateStudioProjectError =
  | 'INVALID_IMAGE_MODEL'
  | 'INVALID_SUBJECT_PROFILE'
  | 'INVALID_STYLE_PRESET';

export type CreateStudioProjectResult =
  | {
      ok: true;
      data: {
        projectId: string;
        redirectUrl: string;
        project: {
          id: string;
          title: string;
          contentMode: string;
          status: string;
        };
      };
    }
  | {
      ok: false;
      error: CreateStudioProjectError;
    };

export { listStudioProjects } from './studio-project-list-service.js';
export { createStudioProject } from './studio-project-create-service.js';
export { getStudioProject } from './studio-project-detail-service.js';
