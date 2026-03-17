import type { MockStudioScenarioId } from '@aiv/domain';

import { brandTokens } from './brand';
import { creationCopy, exploreCopy, plannerCopy, publishCopy } from './copy';
import {
  createRuntimeStudioFixture,
  getStudioFixtureByProjectId,
  getStudioFixtureByScenario,
  listStudioFixtureProjects,
  studioFixturesByScenario,
} from './fixtures/studio-fixtures';

export const mockStudioProject = getStudioFixtureByScenario('partial_failed');

// Mock-only fallback for demos/tests. Real Planner / Creation / Publish pages
// should consume feature-local page data / workspace DTO instead.
export function getMockStudioProject(projectId: string) {
  return getStudioFixtureByProjectId(projectId);
}

export function getMockStudioScenario(scenarioId: MockStudioScenarioId) {
  return getStudioFixtureByScenario(scenarioId);
}

export function listMockStudioProjects() {
  return listStudioFixtureProjects();
}

// Mock-only helper kept for demos/tests. Do not reintroduce this into real
// page bootstraps for Planner / Creation / Publish.
export { createRuntimeStudioFixture };

export const mockStudioScenarios = Object.keys(studioFixturesByScenario) as MockStudioScenarioId[];

export { brandTokens, creationCopy, exploreCopy, plannerCopy, publishCopy };
