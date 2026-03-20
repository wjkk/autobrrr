import assert from 'node:assert/strict';
import test from 'node:test';

import { __testables } from './compare-service.js';

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
