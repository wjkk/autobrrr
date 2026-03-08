import type { MockStudioScenarioId } from '@aiv/domain';

import { brandTokens } from './brand';
import { creationCopy, exploreCopy, plannerCopy, publishCopy } from './copy';
import {
  getStudioFixtureByProjectId,
  getStudioFixtureByScenario,
  listStudioFixtureProjects,
  studioFixturesByScenario,
} from './fixtures/studio-fixtures';

export const mockStudioProject = getStudioFixtureByScenario('partial_failed');

export function getMockStudioProject(projectId: string) {
  return getStudioFixtureByProjectId(projectId);
}

export function getMockStudioScenario(scenarioId: MockStudioScenarioId) {
  return getStudioFixtureByScenario(scenarioId);
}

export function listMockStudioProjects() {
  return listStudioFixtureProjects();
}

export const mockStudioScenarios = Object.keys(studioFixturesByScenario) as MockStudioScenarioId[];

export { brandTokens, creationCopy, exploreCopy, plannerCopy, publishCopy };
