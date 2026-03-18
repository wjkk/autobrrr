import test from 'node:test';
import assert from 'node:assert/strict';

import { buildInitialDebugForm, buildPlannerDebugSearch, parseDebugContext, stringifyJsonInput } from './planner-debug-runtime';

test('buildInitialDebugForm uses preset overrides for known sub-agent slugs and falls back for unknown slugs', () => {
  const preset = buildInitialDebugForm('knowledge-emotion');
  const fallback = buildInitialDebugForm('unknown-slug', {
    projectId: 'project-1',
    episodeId: 'episode-1',
    projectTitle: '真实项目',
    episodeTitle: '真实集',
  });

  assert.equal(preset.projectTitle, '慢一点也没关系');
  assert.equal(preset.selectedImageModelLabel, 'Knowledge Image V1');
  assert.match(preset.plannerAssetsJson, /asset-generated-main/);

  assert.equal(fallback.targetStage, 'refinement');
  assert.equal(fallback.projectId, 'project-1');
  assert.equal(fallback.episodeId, 'episode-1');
  assert.equal(fallback.projectTitle, '真实项目');
  assert.equal(fallback.episodeTitle, '真实集');
});

test('buildPlannerDebugSearch serializes planner workspace context and replay options', () => {
  assert.equal(
    buildPlannerDebugSearch({
      projectId: 'project-1',
      episodeId: 'episode-1',
      replayRunId: 'run-1',
      autoRun: true,
    }),
    '?projectId=project-1&episodeId=episode-1&replayRunId=run-1&autoRun=1',
  );
});

test('stringifyJsonInput returns pretty json for objects and empty string for nullish values', () => {
  assert.equal(stringifyJsonInput(null), '');
  assert.equal(stringifyJsonInput(undefined), '');
  assert.equal(stringifyJsonInput('raw text'), 'raw text');
  assert.match(stringifyJsonInput({ a: 1 }), /"a": 1/);
});

test('parseDebugContext validates JSON shape and returns typed payloads', () => {
  const parsed = parseDebugContext({
    ...buildInitialDebugForm(),
    priorMessagesJson: JSON.stringify([{ role: 'user', text: 'hello' }]),
    currentOutlineDocJson: JSON.stringify({ projectTitle: '项目' }),
    currentStructuredDocJson: JSON.stringify({ acts: [] }),
    targetEntityJson: JSON.stringify({ title: '主角' }),
    plannerAssetsJson: JSON.stringify([{ id: 'asset-1', sourceUrl: 'https://example.com/a.png' }]),
  });

  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.value.priorMessages?.[0]?.role, 'user');
    assert.equal(parsed.value.currentOutlineDoc?.projectTitle, '项目');
    assert.equal(parsed.value.targetEntity?.title, '主角');
    assert.equal(parsed.value.plannerAssets?.[0]?.id, 'asset-1');
  }
});

test('parseDebugContext returns readable validation errors for malformed JSON and wrong shapes', () => {
  const malformed = parseDebugContext({
    ...buildInitialDebugForm(),
    priorMessagesJson: '{bad json}',
  });
  assert.equal(malformed.ok, false);
  if (!malformed.ok) {
    assert.match(malformed.error, /历史消息 JSON 无法解析/);
  }

  const wrongShape = parseDebugContext({
    ...buildInitialDebugForm(),
    plannerAssetsJson: JSON.stringify({ bad: true }),
  });
  assert.equal(wrongShape.ok, false);
  if (!wrongShape.ok) {
    assert.equal(wrongShape.error, '策划素材必须是数组。');
  }
});
