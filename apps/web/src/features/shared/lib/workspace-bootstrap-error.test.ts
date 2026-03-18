import assert from 'node:assert/strict';
import test from 'node:test';

import { toWorkspaceBootstrapError } from './workspace-bootstrap-error';

test('toWorkspaceBootstrapError preserves structured api errors', () => {
  const result = toWorkspaceBootstrapError(
    {
      code: 'AIV_PLANNER_WORKSPACE_EMPTY',
      message: 'Planner workspace is empty.',
      status: 409,
    },
    'fallback',
  );

  assert.deepEqual(result, {
    code: 'AIV_PLANNER_WORKSPACE_EMPTY',
    message: 'Planner workspace is empty.',
    status: 409,
  });
});

test('toWorkspaceBootstrapError falls back to generic error metadata when needed', () => {
  assert.deepEqual(toWorkspaceBootstrapError(new Error('boom'), 'fallback'), {
    code: 'WORKSPACE_BOOTSTRAP_FAILED',
    message: 'boom',
  });

  assert.deepEqual(toWorkspaceBootstrapError(null, 'fallback'), {
    code: 'WORKSPACE_BOOTSTRAP_FAILED',
    message: 'fallback',
  });
});
