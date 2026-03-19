import assert from 'node:assert/strict';
import test from 'node:test';

import { __testables } from './execution-service.js';

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

test('comparePlannerDebugRunsWithDeps returns null when either compare side is missing', async () => {
  const result = await __testables.comparePlannerDebugRunsWithDeps(
    'user-1',
    {
      leftSubAgentId: 'left',
      rightSubAgentId: 'right',
      contentType: '短剧漫剧',
      subtype: '对话剧情',
      configSource: 'draft',
      targetStage: 'refinement',
      partialRerunScope: 'none',
      projectTitle: '项目A',
      episodeTitle: '第1集',
      userPrompt: '细化剧情',
      priorMessages: [],
      plannerAssets: [],
    },
    {
      prisma: {
        plannerSubAgentProfile: {
          findUnique: async ({ where }: { where: { id: string } }) =>
            where.id === 'left'
              ? {
                  id: 'left',
                  subtype: '对话剧情',
                  agentProfile: {
                    contentType: '短剧漫剧',
                  },
                }
              : null,
        },
      } as never,
      executePlannerDebugRun: async () => {
        throw new Error('should not execute');
      },
    },
  );

  assert.equal(result, null);
});

test('comparePlannerDebugRunsWithDeps reuses one compareGroupKey and fixed A/B labels', async () => {
  const captured: Array<Record<string, unknown>> = [];
  const result = await __testables.comparePlannerDebugRunsWithDeps(
    'user-1',
    {
      leftSubAgentId: 'left',
      rightSubAgentId: 'right',
      contentType: '短剧漫剧',
      subtype: '对话剧情',
      configSource: 'draft',
      targetStage: 'refinement',
      partialRerunScope: 'none',
      projectTitle: '项目A',
      episodeTitle: '第1集',
      userPrompt: '细化剧情',
      targetVideoModelFamilySlug: 'seedance-2-0',
      priorMessages: [],
      plannerAssets: [],
      modelFamily: 'doubao-1-5-thinking-pro-250415',
      modelEndpoint: 'doubao-1-5-thinking-pro-250415',
    },
    {
      prisma: {
        plannerSubAgentProfile: {
          findUnique: async ({ where }: { where: { id: string } }) => ({
            id: where.id,
            subtype: where.id === 'left' ? '对话剧情' : '悬疑剧情',
            agentProfile: {
              contentType: '短剧漫剧',
            },
          }),
        },
      } as never,
      executePlannerDebugRun: async (args) => {
        const record = args as unknown as Record<string, unknown>;
        captured.push(record);
        return {
          debugRunId: `debug-${record['compareLabel']}`,
        } as never;
      },
    },
  );

  assert.equal(captured.length, 2);
  assert.equal(captured[0]?.['compareLabel'], 'A');
  assert.equal(captured[1]?.['compareLabel'], 'B');
  assert.equal(captured[0]?.['compareGroupKey'], captured[1]?.['compareGroupKey']);
  assert.equal(captured[0]?.['targetVideoModelFamilySlug'], 'seedance-2-0');
  assert.deepEqual(result, {
    compareGroupKey: captured[0]?.['compareGroupKey'],
    left: {
      debugRunId: 'debug-A',
    },
    right: {
      debugRunId: 'debug-B',
    },
  });
});
