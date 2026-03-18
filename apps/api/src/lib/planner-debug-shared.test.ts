import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildUsageSummary,
  deriveDiffSummary,
  readPromptSnapshot,
} from './planner-debug-shared.js';

test('buildUsageSummary prefers provider usage and computes cost from model snapshot rates', () => {
  const summary = buildUsageSummary({
    providerOutput: {
      response: {
        usage: {
          input_tokens: 1200,
          output_tokens: 800,
          total_tokens: 2000,
        },
      },
    },
    prompt: 'ignored because provider usage exists',
    rawText: 'ignored because provider usage exists',
    modelSnapshot: {
      endpoint: {
        costConfig: {
          inputPer1kTokens: 0.2,
          outputPer1kTokens: 0.5,
          currency: 'CNY',
        },
      },
    },
  });

  assert.deepEqual(summary, {
    promptTokens: 1200,
    completionTokens: 800,
    totalTokens: 2000,
    cost: 0.64,
    currency: 'CNY',
    source: 'provider',
  });
});

test('buildUsageSummary falls back to deterministic token estimation when provider usage is missing', () => {
  const summary = buildUsageSummary({
    providerOutput: {},
    prompt: '12345678',
    rawText: '1234',
    modelSnapshot: {},
  });

  assert.deepEqual(summary, {
    promptTokens: 2,
    completionTokens: 1,
    totalTokens: 3,
    cost: null,
    currency: null,
    source: 'estimated',
  });
});

test('readPromptSnapshot returns normalized messages and drops invalid payloads', () => {
  const parsed = readPromptSnapshot({
    systemPromptFinal: 'system',
    developerPromptFinal: 'developer',
    modelSelectionSnapshot: { requestedTextModelFamilySlug: 'doubao-text' },
    inputContextSnapshot: { projectTitle: '谜雾校园' },
    messagesFinal: [
      { role: 'user', content: '给我一个版本' },
      { role: 'assistant', content: '好的' },
      { role: 'assistant', content: 1 },
    ],
  });
  const invalid = readPromptSnapshot({ messagesFinal: [{ role: 'user' }] });

  assert.deepEqual(parsed, {
    systemPromptFinal: 'system',
    developerPromptFinal: 'developer',
    modelSelectionSnapshot: { requestedTextModelFamilySlug: 'doubao-text' },
    inputContextSnapshot: { projectTitle: '谜雾校园' },
    messagesFinal: [
      { role: 'user', content: '给我一个版本' },
      { role: 'assistant', content: '好的' },
    ],
  });
  assert.equal(invalid, null);
});

test('deriveDiffSummary only emits refinement partial rerun diffs', () => {
  const diff = deriveDiffSummary({
    targetStage: 'refinement',
    partialRerunScope: 'shot',
    currentStructuredDoc: {
      acts: [
        {
          title: '第一幕',
          shots: [
            { title: '01', visual: '旧画面', composition: '远景', motion: '推进', voice: '', line: '' },
          ],
        },
      ],
    },
    targetEntity: { title: '01' },
    assistantPackage: {
      structuredDoc: {
        acts: [
          {
            title: '第一幕',
            shots: [
              { title: '01', visual: '新画面', composition: '远景', motion: '推进', voice: '', line: '' },
            ],
          },
        ],
      },
    },
  });
  const outline = deriveDiffSummary({
    targetStage: 'outline',
    partialRerunScope: 'shot',
    assistantPackage: {},
  });

  assert.ok(diff.some((line) => line.includes('已局部重写分镜：01')));
  assert.ok(diff.some((line) => line.includes('01 画面描述已调整')));
  assert.deepEqual(outline, []);
});
