import test from 'node:test';
import assert from 'node:assert/strict';

import { getMockStudioProject } from '@aiv/mock-data';

import { createCreationPageData, creationPageDataFromFixture } from './creation-page-data';

test('createCreationPageData fills default explore categories and empty history works', () => {
  const fixture = getMockStudioProject('proj-rain-cat');
  assert.ok(fixture);

  const pageData = createCreationPageData({
    project: {
      id: 'project-1',
      title: 'Creation Project',
      brief: 'Creation brief',
      executionMode: 'review_required',
      aspectRatio: '9:16',
      status: 'draft',
      contentMode: 'single',
    },
    episodes: [],
    creation: fixture.creation,
  });

  assert.deepEqual(pageData.historyWorks, []);
  assert.deepEqual(pageData.explore.categories, ['全部', '短剧漫剧', '音乐MV', '知识分享']);
  assert.equal(pageData.project.id, 'project-1');
});

test('creationPageDataFromFixture keeps fixture creation workspace and history works', () => {
  const fixture = getMockStudioProject('proj-rain-cat');
  assert.ok(fixture);

  const pageData = creationPageDataFromFixture(fixture);

  assert.equal(pageData.brandName, fixture.brandName);
  assert.equal(pageData.creation.selectedShotId, fixture.creation.selectedShotId);
  assert.equal(pageData.historyWorks[0]?.id, fixture.historyWorks[0]?.id);
  assert.deepEqual(pageData.explore.categories, fixture.explore.categories);
});
