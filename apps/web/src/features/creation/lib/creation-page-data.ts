import type {
  CreationWorkspace,
  EpisodeSummary,
  HistoryWork,
  ProjectSummary,
  StudioFixture,
} from '@aiv/domain';

import { brandTokens } from '@aiv/mock-data';

export interface CreationPageData {
  brandName: string;
  project: ProjectSummary;
  episodes: EpisodeSummary[];
  creation: CreationWorkspace;
  historyWorks: HistoryWork[];
  explore: {
    categories: Array<'全部' | '短剧漫剧' | '音乐MV' | '知识分享'>;
  };
}

export function createCreationPageData(args: {
  project: ProjectSummary;
  episodes: EpisodeSummary[];
  creation: CreationWorkspace;
  historyWorks?: HistoryWork[];
  categories?: Array<'全部' | '短剧漫剧' | '音乐MV' | '知识分享'>;
  brandName?: string;
}): CreationPageData {
  return {
    brandName: args.brandName ?? brandTokens.productName,
    project: args.project,
    episodes: args.episodes,
    creation: args.creation,
    historyWorks: args.historyWorks ?? [],
    explore: {
      categories: args.categories ?? ['全部', '短剧漫剧', '音乐MV', '知识分享'],
    },
  };
}

export function creationPageDataFromFixture(studio: StudioFixture): CreationPageData {
  return {
    brandName: studio.brandName,
    project: studio.project,
    episodes: studio.episodes,
    creation: studio.creation,
    historyWorks: studio.historyWorks,
    explore: {
      categories: studio.explore.categories,
    },
  };
}
