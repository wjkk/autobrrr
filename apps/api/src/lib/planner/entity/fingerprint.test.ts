import assert from 'node:assert/strict';
import test from 'node:test';

import { __testables, buildPlannerEntityFingerprint, scorePlannerEntitySimilarity } from './fingerprint.js';

test('planner entity fingerprint normalizes punctuation and keeps stable semantic tokens', () => {
  assert.equal(__testables.normalizeSemanticText('  黑色风衣，年轻侦探！ '), '黑色风衣 年轻侦探');
  assert.deepEqual(
    __testables.extractSemanticTokens(['林夜，黑色风衣，年轻侦探']),
    ['林夜', '黑色风衣', '黑色', '色风', '风衣', '年轻侦探', '年轻', '轻侦', '侦探'],
  );
  assert.equal(buildPlannerEntityFingerprint({ title: '林夜', prompt: '黑色风衣，年轻侦探' }).includes('林夜'), true);
});

test('scorePlannerEntitySimilarity prefers prompt-level semantic overlap over title-only changes', () => {
  const score = scorePlannerEntitySimilarity({
    currentTitle: '调查者林夜',
    currentPrompt: '黑色风衣，年轻侦探，冷静眼神',
    previousTitle: '林夜',
    previousPrompt: '年轻侦探，黑色风衣，冷静眼神',
  });

  const weakScore = scorePlannerEntitySimilarity({
    currentTitle: '调查者林夜',
    currentPrompt: '废弃仓库，潮湿铁门',
    previousTitle: '林夜',
    previousPrompt: '年轻侦探，黑色风衣，冷静眼神',
  });

  assert.ok(score > weakScore);
  assert.ok(score >= 12);
});
