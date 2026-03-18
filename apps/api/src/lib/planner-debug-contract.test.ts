import test from 'node:test';
import assert from 'node:assert/strict';

import {
  debugCompareSchema,
  debugRunListQuerySchema,
  debugRunSchema,
} from './planner-debug-contract.js';

test('debugRunSchema applies stable defaults for planner debug input', () => {
  const parsed = debugRunSchema.parse({
    contentType: '短剧漫剧',
    subtype: '悬疑',
    userPrompt: '做一个悬疑校园剧',
  });

  assert.equal(parsed.configSource, 'draft');
  assert.equal(parsed.targetStage, 'refinement');
  assert.equal(parsed.partialRerunScope, 'none');
  assert.equal(parsed.projectTitle, '调试项目');
  assert.equal(parsed.episodeTitle, '第1集');
  assert.deepEqual(parsed.priorMessages, []);
  assert.deepEqual(parsed.plannerAssets, []);
});

test('debugRunSchema rejects oversized prior messages and invalid planner assets', () => {
  const tooManyMessages = debugRunSchema.safeParse({
    contentType: '短剧漫剧',
    subtype: '悬疑',
    userPrompt: '做一个悬疑校园剧',
    priorMessages: Array.from({ length: 13 }, (_, index) => ({
      role: 'user',
      text: `message-${index + 1}`,
    })),
  });
  const invalidAsset = debugRunSchema.safeParse({
    contentType: '短剧漫剧',
    subtype: '悬疑',
    userPrompt: '做一个悬疑校园剧',
    plannerAssets: [{ id: '' }],
  });

  assert.equal(tooManyMessages.success, false);
  assert.equal(invalidAsset.success, false);
});

test('debugRunSchema accepts typed partial rerun scopes for refinement debug runs', () => {
  const parsed = debugRunSchema.parse({
    contentType: '短剧漫剧',
    subtype: '悬疑',
    userPrompt: '细化第一幕',
    partialRerunScope: 'act',
  });

  assert.equal(parsed.partialRerunScope, 'act');
});

test('debugCompareSchema inherits debug input defaults and requires both compare sides', () => {
  const parsed = debugCompareSchema.parse({
    contentType: '短剧漫剧',
    subtype: '悬疑',
    userPrompt: '做一个悬疑校园剧',
    leftSubAgentId: 'left-agent',
    rightSubAgentId: 'right-agent',
  });
  const missingSide = debugCompareSchema.safeParse({
    contentType: '短剧漫剧',
    subtype: '悬疑',
    userPrompt: '做一个悬疑校园剧',
    leftSubAgentId: 'left-agent',
  });

  assert.equal(parsed.targetStage, 'refinement');
  assert.equal(parsed.leftSubAgentId, 'left-agent');
  assert.equal(parsed.rightSubAgentId, 'right-agent');
  assert.equal(missingSide.success, false);
});

test('debugRunListQuerySchema coerces limits and applies list defaults', () => {
  const parsed = debugRunListQuerySchema.parse({
    limit: '12',
    subAgentSlug: ' suspense-agent ',
  });
  const fallback = debugRunListQuerySchema.parse({});
  const invalid = debugRunListQuerySchema.safeParse({ limit: '0' });

  assert.equal(parsed.limit, 12);
  assert.equal(parsed.subAgentSlug, 'suspense-agent');
  assert.equal(fallback.limit, 20);
  assert.equal(fallback.compareGroupKey, undefined);
  assert.equal(invalid.success, false);
});
