import assert from 'node:assert/strict';
import test from 'node:test';

import { parseRunInput, RunInputParseError, serializeRunInput, type PlannerDocUpdateRunInput } from './run-input.js';

test('parseRunInput parses planner doc update payload with typed rerun scope', () => {
  const payload: PlannerDocUpdateRunInput = {
    plannerSessionId: 'session-1',
    episodeId: 'episode-1',
    projectId: 'project-1',
    prompt: '生成分镜',
    rawPrompt: '生成分镜',
    projectTitle: '测试项目',
    episodeTitle: '第一集',
    contentMode: 'series',
    contentType: 'story',
    targetStage: 'refinement',
    triggerType: 'shots_only',
    sourceOutlineVersionId: 'outline-1',
    targetVideoModelFamilySlug: 'seedance-2-0',
    rerunScope: {
      type: 'shot',
      shotIds: ['shot-1', 'shot-2'],
    },
    targetEntity: [{ id: 'shot-1' }],
    stepDefinitions: [{ id: 'step-1', title: '分析剧情' }],
    promptSnapshot: { role: 'system' },
    contextSnapshot: { episodeId: 'episode-1' },
    modelFamily: { id: 'family-1', slug: 'seedance-2-0', name: 'Seedance 2.0' },
    modelProvider: {
      id: 'provider-1',
      code: 'ark',
      name: 'Volcengine Ark',
      providerType: 'OPENAI_COMPATIBLE',
      baseUrl: 'https://ark.example.com',
    },
    modelEndpoint: {
      id: 'endpoint-1',
      slug: 'seedance-2-0-t2v',
      label: 'Seedance 2.0',
      remoteModelKey: 'seedance-2-0',
    },
  };

  const parsed = parseRunInput({
    id: 'run-1',
    runType: 'PLANNER_DOC_UPDATE',
    inputJson: serializeRunInput(payload) as never,
  }) as PlannerDocUpdateRunInput;

  assert.equal(parsed.targetVideoModelFamilySlug, 'seedance-2-0');
  assert.equal(parsed.sourceOutlineVersionId, 'outline-1');
  assert.deepEqual(parsed.rerunScope, {
    type: 'shot',
    shotIds: ['shot-1', 'shot-2'],
  });
});

test('parseRunInput rejects invalid typed rerun scope payloads', () => {
  assert.throws(
    () =>
      parseRunInput({
        id: 'run-2',
        runType: 'PLANNER_DOC_UPDATE',
        inputJson: serializeRunInput({
          plannerSessionId: 'session-1',
          episodeId: 'episode-1',
          projectId: 'project-1',
          prompt: '生成分镜',
          rawPrompt: '生成分镜',
          projectTitle: '测试项目',
          episodeTitle: '第一集',
          contentMode: 'series',
          contentType: 'story',
          targetStage: 'refinement' as const,
          triggerType: 'shots_only',
          rerunScope: {
            type: 'shot',
            shotIds: [],
          },
          targetEntity: [{ id: 'shot-1' }],
          stepDefinitions: [],
          promptSnapshot: { role: 'system' },
          contextSnapshot: { episodeId: 'episode-1' },
          modelFamily: { id: 'family-1', slug: 'seedance-2-0', name: 'Seedance 2.0' },
          modelProvider: {
            id: 'provider-1',
            code: 'ark',
            name: 'Volcengine Ark',
            providerType: 'OPENAI_COMPATIBLE',
            baseUrl: 'https://ark.example.com',
          },
          modelEndpoint: {
            id: 'endpoint-1',
            slug: 'seedance-2-0-t2v',
            label: 'Seedance 2.0',
            remoteModelKey: 'seedance-2-0',
          },
        }) as never,
      }),
    (error) => error instanceof RunInputParseError,
  );
});
