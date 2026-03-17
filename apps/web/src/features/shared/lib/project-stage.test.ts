import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveProjectStage } from './project-stage';

test('resolveProjectStage maps project status to planner, creation and publish stages', () => {
  assert.equal(resolveProjectStage('draft'), 'planner');
  assert.equal(resolveProjectStage('planning'), 'planner');
  assert.equal(resolveProjectStage('creating'), 'creation');
  assert.equal(resolveProjectStage('export_ready'), 'creation');
  assert.equal(resolveProjectStage('exported'), 'creation');
  assert.equal(resolveProjectStage('published'), 'publish');
});
