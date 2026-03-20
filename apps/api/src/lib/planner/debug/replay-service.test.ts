import assert from 'node:assert/strict';
import test from 'node:test';

import { __testables } from './replay-service.js';

test('replayPlannerDebugRunWithDeps returns null when source run is missing', async () => {
  const result = await __testables.replayPlannerDebugRunWithDeps('user-1', 'run-1', {
    prisma: {
      plannerDebugRun: {
        findFirst: async () => null,
      },
    } as never,
    executePlannerDebugRun: async () => {
      throw new Error('should not execute');
    },
  });

  assert.equal(result, null);
});

test('replayPlannerDebugRunWithDeps forwards stored input and replaySourceRunId', async () => {
  let captured: Record<string, unknown> | null = null;
  const result = await __testables.replayPlannerDebugRunWithDeps('user-1', 'run-1', {
    prisma: {
      plannerDebugRun: {
        findFirst: async () => ({
          id: 'run-1',
          inputJson: {
            contentType: '短剧漫剧',
            subtype: '对话剧情',
            configSource: 'draft',
            targetStage: 'refinement',
            projectTitle: '项目A',
            episodeTitle: '第1集',
            userPrompt: '细化剧情',
            modelFamily: 'doubao-1-5-thinking-pro-250415',
            modelEndpoint: 'doubao-1-5-thinking-pro-250415',
            targetVideoModelFamilySlug: 'seedance-2-0',
            partialRerunScope: 'none',
            priorMessages: [],
            plannerAssets: [],
          },
        }),
      },
    } as never,
    executePlannerDebugRun: async (args) => {
      captured = args as unknown as Record<string, unknown>;
      return {
        debugRunId: 'new-run',
      } as never;
    },
  });

  assert.deepEqual(result, {
    debugRunId: 'new-run',
  });
  assert.equal(captured?.['userId'], 'user-1');
  assert.equal(captured?.['contentType'], '短剧漫剧');
  assert.equal(captured?.['targetVideoModelFamilySlug'], 'seedance-2-0');
  assert.equal(captured?.['replaySourceRunId'], 'run-1');
});
