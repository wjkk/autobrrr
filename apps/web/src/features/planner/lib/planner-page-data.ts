import type { EpisodeSummary, PlannerMessage, ProjectSummary, StudioFixture } from '@aiv/domain';

import { brandTokens } from '@aiv/mock-data';

export interface PlannerPageData {
  brandName: string;
  assistantName: string;
  project: ProjectSummary;
  episodes: EpisodeSummary[];
  planner: {
    submittedRequirement: string;
    pointCost: number;
    messages: PlannerMessage[];
  };
  creation: {
    points: number;
  };
}

export function createPlannerPageData(args: {
  project: ProjectSummary;
  episodes: EpisodeSummary[];
  submittedRequirement: string;
  pointCost?: number;
  messages?: PlannerMessage[];
  creationPoints?: number;
  brandName?: string;
  assistantName?: string;
}): PlannerPageData {
  return {
    brandName: args.brandName ?? brandTokens.productName,
    assistantName: args.assistantName ?? brandTokens.assistantName,
    project: args.project,
    episodes: args.episodes,
    planner: {
      submittedRequirement: args.submittedRequirement,
      pointCost: args.pointCost ?? 0,
      messages: args.messages ?? [],
    },
    creation: {
      points: args.creationPoints ?? 120,
    },
  };
}

export function plannerPageDataFromFixture(studio: StudioFixture): PlannerPageData {
  return {
    brandName: studio.brandName,
    assistantName: studio.assistantName,
    project: studio.project,
    episodes: studio.episodes,
    planner: {
      submittedRequirement: studio.planner.submittedRequirement,
      pointCost: studio.planner.pointCost,
      messages: studio.planner.messages,
    },
    creation: {
      points: studio.creation.points,
    },
  };
}
