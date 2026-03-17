import type {
  EpisodeSummary,
  HistoryWork,
  ProjectSummary,
  PublishWorkspace,
  StudioFixture,
} from '@aiv/domain';

import { brandTokens } from '@aiv/mock-data';

export interface PublishPageData {
  brandName: string;
  project: ProjectSummary;
  episodes: EpisodeSummary[];
  publish: PublishWorkspace;
  historyWorks: HistoryWork[];
}

export function createPublishPageData(args: {
  project: ProjectSummary;
  episodes: EpisodeSummary[];
  publish: PublishWorkspace;
  historyWorks?: HistoryWork[];
  brandName?: string;
}): PublishPageData {
  return {
    brandName: args.brandName ?? brandTokens.productName,
    project: args.project,
    episodes: args.episodes,
    publish: args.publish,
    historyWorks: args.historyWorks ?? [],
  };
}

export function publishPageDataFromFixture(studio: StudioFixture): PublishPageData {
  return {
    brandName: studio.brandName,
    project: studio.project,
    episodes: studio.episodes,
    publish: studio.publish,
    historyWorks: studio.historyWorks,
  };
}
