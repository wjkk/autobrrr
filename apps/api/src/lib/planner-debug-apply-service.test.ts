import assert from 'node:assert/strict';
import test from 'node:test';

import { __testables } from './planner-debug-apply-service.js';

test('readPlannerDebugWorkspaceContext reads stable project and episode ids', () => {
  assert.deepEqual(
    __testables.readPlannerDebugWorkspaceContext({
      projectId: 'project-1',
      episodeId: 'episode-1',
    }),
    {
      projectId: 'project-1',
      episodeId: 'episode-1',
    },
  );
});

test('applyPlannerDebugRunToMainFlowWithDeps returns null when debug run is missing', async () => {
  const result = await __testables.applyPlannerDebugRunToMainFlowWithDeps('user-1', 'run-1', {
    prisma: {
      plannerDebugRun: {
        findFirst: async () => null,
      },
    } as never,
    requireOwnedEpisode: async () => {
      throw new Error('should not load episode');
    },
  });

  assert.equal(result, null);
});

test('applyPlannerDebugRunToMainFlowWithDeps rejects runs without workspace context', async () => {
  await assert.rejects(
    () =>
      __testables.applyPlannerDebugRunToMainFlowWithDeps('user-1', 'run-1', {
        prisma: {
          plannerDebugRun: {
            findFirst: async () => ({
              id: 'run-1',
              inputJson: {
                userPrompt: 'apply me',
              },
            }),
          },
        } as never,
        requireOwnedEpisode: async () => null,
      }),
    /does not include project\/episode context/i,
  );
});
