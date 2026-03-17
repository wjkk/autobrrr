import test from 'node:test';
import assert from 'node:assert/strict';

import { getMockStudioProject } from '@aiv/mock-data';

import { createPublishPageData, publishPageDataFromFixture } from './publish-page-data';

test('createPublishPageData fills empty history works by default', () => {
  const fixture = getMockStudioProject('proj-rain-cat');
  assert.ok(fixture);

  const pageData = createPublishPageData({
    project: {
      id: 'project-1',
      title: 'Publish Project',
      brief: 'Publish brief',
      executionMode: 'review_required',
      aspectRatio: '9:16',
      status: 'draft',
      contentMode: 'single',
    },
    episodes: [],
    publish: fixture.publish,
  });

  assert.deepEqual(pageData.historyWorks, []);
  assert.equal(pageData.publish.successMessage, fixture.publish.successMessage);
});

test('publishPageDataFromFixture keeps fixture publish workspace and history works', () => {
  const fixture = getMockStudioProject('proj-rain-cat');
  assert.ok(fixture);

  const pageData = publishPageDataFromFixture(fixture);

  assert.equal(pageData.brandName, fixture.brandName);
  assert.equal(pageData.publish.draft.title, fixture.publish.draft.title);
  assert.equal(pageData.historyWorks[0]?.id, fixture.historyWorks[0]?.id);
  assert.equal(pageData.project.id, fixture.project.id);
});
