import type { CreationWorkspace } from './creation';
import type { PlannerWorkspace } from './planner';
import type { ContinueProjectCard, EpisodeSummary, ExploreFeedItem, HistoryWork, ProjectSummary } from './project';
import type { PublishWorkspace } from './publish';

export type MockStudioScenarioId = 'empty' | 'awaiting_review' | 'partial_failed' | 'publish_ready' | 'published';

export interface StudioFixture {
  brandName: string;
  assistantName: string;
  scenarioId: MockStudioScenarioId;
  scenarioLabel: string;
  project: ProjectSummary;
  episodes: EpisodeSummary[];
  explore: {
    categories: Array<'全部' | '短剧漫剧' | '音乐MV' | '知识分享'>;
    feeds: ExploreFeedItem[];
    continueProjects: ContinueProjectCard[];
    defaults: {
      prompt: string;
      model: string;
      ratio: '9:16' | '16:9' | '1:1';
      mode: '视频模式' | '漫剧模式';
    };
  };
  planner: PlannerWorkspace;
  creation: CreationWorkspace;
  publish: PublishWorkspace;
  historyWorks: HistoryWork[];
}
