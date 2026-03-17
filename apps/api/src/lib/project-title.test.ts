import assert from 'node:assert/strict';
import test from 'node:test';

import { buildProjectTitleFromPrompt } from './project-title.js';

test('buildProjectTitleFromPrompt trims whitespace and falls back for empty input', () => {
  assert.equal(buildProjectTitleFromPrompt('   '), '未命名项目');
  assert.equal(buildProjectTitleFromPrompt('  我的项目  '), '我的项目');
});

test('buildProjectTitleFromPrompt truncates long prompts to 18 chars with ellipsis', () => {
  assert.equal(
    buildProjectTitleFromPrompt('这是一个很长很长很长很长很长的项目标题'),
    '这是一个很长很长很长很长很长的项目标...',
  );
});
