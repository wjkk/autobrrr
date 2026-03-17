import test from 'node:test';
import assert from 'node:assert/strict';

import { getMockStudioProject } from '@aiv/mock-data';

import { createPlannerPageData, plannerPageDataFromFixture } from './planner-page-data';

test('createPlannerPageData fills stable defaults for planner page bootstrap data', () => {
  const pageData = createPlannerPageData({
    project: {
      id: 'project-1',
      title: 'Planner Project',
      brief: 'Planner brief',
      executionMode: 'review_required',
      aspectRatio: '9:16',
      status: 'draft',
      contentMode: 'single',
    },
    episodes: [],
    submittedRequirement: '做一个多镜头短剧策划',
  });

  assert.equal(pageData.planner.pointCost, 0);
  assert.deepEqual(pageData.planner.messages, []);
  assert.equal(pageData.creation.points, 120);
  assert.equal(pageData.project.id, 'project-1');
});

test('plannerPageDataFromFixture keeps fixture-owned planner and episode fields', () => {
  const fixture = getMockStudioProject('proj-rain-cat');
  assert.ok(fixture);

  const pageData = plannerPageDataFromFixture(fixture);

  assert.equal(pageData.brandName, fixture.brandName);
  assert.equal(pageData.assistantName, fixture.assistantName);
  assert.equal(pageData.project.id, fixture.project.id);
  assert.equal(pageData.episodes[0]?.id, fixture.episodes[0]?.id);
  assert.equal(pageData.planner.submittedRequirement, fixture.planner.submittedRequirement);
  assert.equal(pageData.creation.points, fixture.creation.points);
});
