import assert from 'node:assert/strict';
import test from 'node:test';

import { mapWebApiPathToAivApiPath } from './api-route-proxy';

test('mapWebApiPathToAivApiPath keeps direct api namespaces stable', () => {
  assert.equal(mapWebApiPathToAivApiPath(['auth', 'me']), '/api/auth/me');
  assert.equal(mapWebApiPathToAivApiPath(['provider-configs', 'ark', 'sync-models']), '/api/provider-configs/ark/sync-models');
  assert.equal(mapWebApiPathToAivApiPath(['planner', 'debug', 'runs', 'run-1']), '/api/planner/debug/runs/run-1');
});

test('mapWebApiPathToAivApiPath rewrites planner, creation and publish project routes', () => {
  assert.equal(
    mapWebApiPathToAivApiPath(['planner', 'projects', 'project-1', 'workspace']),
    '/api/projects/project-1/planner/workspace',
  );
  assert.equal(
    mapWebApiPathToAivApiPath(['creation', 'projects', 'project-1', 'workspace']),
    '/api/projects/project-1/creation/workspace',
  );
  assert.equal(
    mapWebApiPathToAivApiPath(['creation', 'projects', 'project-1', 'shots', 'shot-1', 'generate-video']),
    '/api/projects/project-1/shots/shot-1/generate-video',
  );
  assert.equal(
    mapWebApiPathToAivApiPath(['publish', 'projects', 'project-1', 'submit']),
    '/api/projects/project-1/publish/submit',
  );
});

test('mapWebApiPathToAivApiPath rewrites frontend run aliases to shared backend runs endpoints', () => {
  assert.equal(mapWebApiPathToAivApiPath(['planner', 'runs', 'run-1']), '/api/runs/run-1');
  assert.equal(mapWebApiPathToAivApiPath(['creation', 'runs', 'run-2']), '/api/runs/run-2');
});

test('mapWebApiPathToAivApiPath returns null for unsupported paths', () => {
  assert.equal(mapWebApiPathToAivApiPath([]), null);
  assert.equal(mapWebApiPathToAivApiPath(['unknown', 'route']), null);
});
