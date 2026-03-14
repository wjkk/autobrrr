import { requestAivApiFromServer } from '@/lib/aiv-api';

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

export async function fetchMySpaceProjects() {
  try {
    const projects = await requestAivApiFromServer<MySpaceProjectItem[]>('/api/studio/projects');
    return {
      projects: projects ?? [],
      error: null,
    };
  } catch (error) {
    return {
      projects: [] as MySpaceProjectItem[],
      error: error instanceof Error ? error.message : '加载我的空间失败。',
    };
  }
}
