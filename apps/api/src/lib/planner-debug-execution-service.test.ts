import assert from 'node:assert/strict';
import test from 'node:test';

import { __testables } from './planner-debug-execution-service.js';

test('parseStoredDebugInput rejects invalid stored planner debug payloads', () => {
  assert.throws(
    () =>
      __testables.parseStoredDebugInput({
        contentType: '短剧漫剧',
      }),
    /Stored planner debug run input is invalid/i,
  );
});

test('resolvePlannerDebugSelectionWithDeps fails when published config has no released snapshot', async () => {
  await assert.rejects(
    () =>
      __testables.resolvePlannerDebugSelectionWithDeps(
        {
          contentType: '短剧漫剧',
          subtype: '对话剧情',
          subAgentId: 'sub-1',
          configSource: 'published',
        },
        {
          prisma: {
            plannerSubAgentProfile: {
              findUnique: async () => ({
                id: 'sub-1',
                slug: 'sub-1',
                subtype: '对话剧情',
                displayName: 'Sub Agent',
                systemPromptOverride: null,
                developerPromptOverride: null,
                stepDefinitionsJson: [],
                agentProfile: {
                  id: 'agent-1',
                  slug: 'agent-1',
                  displayName: 'Agent',
                  contentType: '短剧漫剧',
                  defaultSystemPrompt: 'system',
                  defaultDeveloperPrompt: null,
                  defaultStepDefinitionsJson: [],
                },
              }),
            },
            plannerSubAgentProfileRelease: {
              findFirst: async () => null,
            },
          } as never,
          resolvePlannerAgentSelection: async () => null,
        },
      ),
    /还没有已发布快照/i,
  );
});

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
