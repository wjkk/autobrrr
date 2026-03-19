import assert from 'node:assert/strict';
import test from 'node:test';

import { __testables } from './registry.js';

test('normalizeSubtype trims whitespace and treats empty values as null', () => {
  assert.equal(__testables.normalizeSubtype('  对话剧情  '), '对话剧情');
  assert.equal(__testables.normalizeSubtype('   '), null);
  assert.equal(__testables.normalizeSubtype(null), null);
});

test('resolvePlannerAgentSelectionWithDeps returns null when no agent profile exists', async () => {
  const result = await __testables.resolvePlannerAgentSelectionWithDeps(
    {
      contentType: '短剧漫剧',
      subtype: '对话剧情',
    },
    {
      prisma: {
        plannerAgentProfile: {
          findFirst: async () => null,
        },
        plannerSubAgentProfile: {
          findFirst: async () => null,
        },
      } as never,
    },
  );

  assert.equal(result, null);
});

test('resolvePlannerAgentSelectionWithDeps falls back to subtype lookup when include query returns none', async () => {
  const result = await __testables.resolvePlannerAgentSelectionWithDeps(
    {
      contentType: '  短剧漫剧  ',
      subtype: '  对话剧情 ',
    },
    {
      prisma: {
        plannerAgentProfile: {
          findFirst: async () => ({
            id: 'agent-1',
            slug: 'short-drama',
            displayName: '短剧 Agent',
            defaultSystemPrompt: 'system',
            defaultDeveloperPrompt: 'dev',
            defaultStepDefinitionsJson: [{ id: 'step-1' }],
            subAgentProfiles: [],
          }),
        },
        plannerSubAgentProfile: {
          findFirst: async ({ where }: { where: { subtype?: string } }) => {
            if (where.subtype === '对话剧情') {
              return {
                id: 'sub-1',
                slug: 'dialog',
                subtype: '对话剧情',
                displayName: '对话',
                systemPromptOverride: 'sub-system',
                developerPromptOverride: null,
                stepDefinitionsJson: [{ id: 'sub-step' }],
              };
            }
            return null;
          },
        },
      } as never,
    },
  );

  assert.equal(result?.contentType, '短剧漫剧');
  assert.equal(result?.subtype, '对话剧情');
  assert.equal(result?.subAgentProfile.slug, 'dialog');
});

test('resolvePlannerAgentSelectionWithDeps falls back to latest active sub-agent when subtype misses', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const result = await __testables.resolvePlannerAgentSelectionWithDeps(
    {
      contentType: '短剧漫剧',
      subtype: '悬疑剧情',
    },
    {
      prisma: {
        plannerAgentProfile: {
          findFirst: async () => ({
            id: 'agent-1',
            slug: 'short-drama',
            displayName: '短剧 Agent',
            defaultSystemPrompt: 'system',
            defaultDeveloperPrompt: null,
            defaultStepDefinitionsJson: [],
            subAgentProfiles: [],
          }),
        },
        plannerSubAgentProfile: {
          findFirst: async (args: Record<string, unknown>) => {
            calls.push(args);
            const where = args.where as { subtype?: string };
            if (where.subtype) {
              return null;
            }
            return {
              id: 'sub-2',
              slug: 'fallback',
              subtype: '通用',
              displayName: '通用 Agent',
              systemPromptOverride: null,
              developerPromptOverride: null,
              stepDefinitionsJson: [],
            };
          },
        },
      } as never,
    },
  );

  assert.equal(calls.length, 2);
  assert.equal((calls[0]?.where as { subtype?: string }).subtype, '悬疑剧情');
  assert.equal((calls[1]?.where as { subtype?: string }).subtype, undefined);
  assert.equal(result?.subtype, '通用');
});
