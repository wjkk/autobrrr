import test from 'node:test';
import assert from 'node:assert/strict';

import { extractPlannerText, findStringDeep } from './planner-text-extraction.js';

test('findStringDeep returns the first matching nested string key', () => {
  const result = findStringDeep(
    {
      a: { b: { message: 'nested text' } },
      other: 'value',
    },
    ['text', 'message'],
  );

  assert.equal(result, 'nested text');
  assert.equal(findStringDeep(null, ['text']), null);
});

test('extractPlannerText prefers output_text and structured provider content before fallback', () => {
  assert.equal(extractPlannerText({ output_text: '直接输出' }, 'fallback'), '直接输出');

  assert.equal(
    extractPlannerText(
      {
        output: [{ content: [{ text: 'responses api 输出' }] }],
      },
      'fallback',
    ),
    'responses api 输出',
  );

  assert.equal(
    extractPlannerText(
      {
        choices: [{ message: { content: 'chat completion 输出' } }],
      },
      'fallback',
    ),
    'chat completion 输出',
  );

  assert.equal(
    extractPlannerText(
      {
        candidates: [{ content: { parts: [{ text: 'gemini 风格输出' }] } }],
      },
      'fallback',
    ),
    'gemini 风格输出',
  );
});

test('extractPlannerText falls back to deterministic planner draft text when no provider text is found', () => {
  const fallback = extractPlannerText({ invalid: true }, '猫咪领地冲突');

  assert.match(fallback, /【策划草案】/);
  assert.match(fallback, /主题：猫咪领地冲突/);
});
