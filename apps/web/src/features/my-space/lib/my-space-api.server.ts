import { requestAivApiFromServer } from '@/lib/aiv-api';
import { fetchServerValueOrHandledError } from '@/lib/server-fetch-fallback';

export interface MySpaceProjectItem {
  id: string;
  title: string;
  brief: string | null;
  status: string;
  contentMode: 'single' | 'series';
  currentEpisodeId: string | null;
  currentEpisode: {
    id: string;
    title: string;
    status: string;
  } | null;
  episodeCount: number;
  creationConfig: {
    selectedTab: string;
    selectedSubtype: string | null;
  } | null;
  previewAsset: {
    id: string;
    sourceUrl: string | null;
    fileName: string;
    sourceKind: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface MySpaceProjectsResult {
  projects: MySpaceProjectItem[];
  error: string | null;
}

export async function fetchMySpaceProjects(): Promise<MySpaceProjectsResult> {
  return fetchServerValueOrHandledError<MySpaceProjectItem[], MySpaceProjectsResult>(
    () => requestAivApiFromServer<MySpaceProjectItem[]>('/api/studio/projects'),
    (error) => ({
      projects: [],
      error: error instanceof Error ? error.message : '加载我的空间失败。',
    }),
    (projects) => ({
      projects: projects ?? [],
      error: null,
    }),
  );
}
