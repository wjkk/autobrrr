import assert from 'node:assert/strict';
import test from 'node:test';

import type { Prisma } from '@prisma/client';

import { __testables } from './planner-stream.js';

function createPlannerRunInput(stepDefinitions: Prisma.JsonObject[]): Prisma.JsonValue {
  return {
    plannerSessionId: 'session-1',
    episodeId: 'episode-1',
    projectId: 'project-1',
    prompt: '完整 prompt',
    rawPrompt: '用户输入',
    projectTitle: '项目A',
    episodeTitle: '第1集',
    contentMode: 'single',
    contentType: '短剧漫剧',
    subtype: '对话剧情',
    targetStage: 'refinement',
    triggerType: 'generate_doc',
    stepDefinitions,
    promptSnapshot: {
      systemPromptFinal: 'system',
      developerPromptFinal: 'developer',
      messagesFinal: [{ role: 'user', content: 'hello' }],
      inputContextSnapshot: {},
    },
    agentProfile: {
      id: 'agent-1',
      slug: 'agent-1',
      displayName: 'Agent',
    },
    subAgentProfile: {
      id: 'sub-1',
      slug: 'sub-1',
      displayName: 'Sub Agent',
    },
    contextSnapshot: {},
    modelFamily: {
      id: 'family-1',
      slug: 'family-1',
      name: 'Family 1',
    },
    modelProvider: {
      id: 'provider-1',
      code: 'ark',
      name: 'ARK',
      providerType: 'API',
      baseUrl: 'https://ark.example.com',
    },
    modelEndpoint: {
      id: 'endpoint-1',
      slug: 'endpoint-1',
      label: 'Endpoint 1',
      remoteModelKey: 'endpoint-1',
    },
  } as Prisma.JsonValue;
}

test('readStepDefinitions normalizes stored planner run step definitions', () => {
  const steps = __testables.readStepDefinitions({
    id: 'run-1',
    runType: 'PLANNER_DOC_UPDATE',
    status: 'RUNNING',
    inputJson: createPlannerRunInput([
      {
        id: 'step-a',
        title: '  收集素材  ',
        details: ['detail-1', 42, 'detail-2'],
      },
      {
        title: '缺省 ID',
      },
    ]),
  });

  assert.deepEqual(steps, [
    {
      id: 'step-a',
      title: '收集素材',
      details: ['detail-1', 'detail-2'],
    },
    {
      id: 'step-2',
      title: '缺省 ID',
      details: [],
    },
  ]);
});

test('buildSyntheticSteps marks the first step according to tracked run status', () => {
  const running = __testables.buildSyntheticSteps({
    id: 'run-1',
    runType: 'PLANNER_DOC_UPDATE',
    status: 'RUNNING',
    inputJson: createPlannerRunInput([
      { id: 'step-a', title: '步骤A' },
      { id: 'step-b', title: '步骤B' },
    ]),
  });
  assert.equal(running[0]?.status, 'running');
  assert.equal(running[1]?.status, 'waiting');

  const failed = __testables.buildSyntheticSteps({
    id: 'run-1',
    runType: 'PLANNER_DOC_UPDATE',
    status: 'FAILED',
    inputJson: createPlannerRunInput([
      { id: 'step-a', title: '步骤A' },
      { id: 'step-b', title: '步骤B' },
    ]),
  });
  assert.equal(failed[0]?.status, 'failed');
  assert.equal(failed[1]?.status, 'waiting');
});

test('buildPlannerStreamSnapshotWithDeps prefers persisted steps when refinement belongs to tracked run', async () => {
  const snapshot = await __testables.buildPlannerStreamSnapshotWithDeps(
    {
      projectId: 'project-1',
      episodeId: 'episode-1',
      runId: 'run-1',
    },
    {
      prisma: {
        plannerSession: {
          findFirst: async () => ({
            id: 'session-1',
            status: 'READY',
            refinementVersions: [
              {
                id: 'ref-1',
                sourceRunId: 'run-1',
                stepAnalysis: [
                  {
                    id: 'analysis-1',
                    stepKey: 'step-a',
                    title: '已落库步骤',
                    status: 'DONE',
                    detailJson: { details: ['done'] },
                    sortOrder: 1,
                  },
                ],
              },
            ],
          }),
        },
        run: {
          findFirst: async () => ({
            id: 'run-1',
            runType: 'PLANNER_DOC_UPDATE',
            status: 'RUNNING',
            inputJson: createPlannerRunInput([{ id: 'step-a', title: '合成步骤' }]),
            errorCode: null,
            errorMessage: null,
          }),
        },
      } as never,
    },
  );

  assert.equal(snapshot.refinementVersionId, 'ref-1');
  assert.equal(snapshot.steps[0]?.title, '已落库步骤');
  assert.equal(snapshot.steps[0]?.status, 'done');
  assert.equal(snapshot.terminal, false);
});

test('buildPlannerStreamSnapshotWithDeps falls back to synthetic steps and detects terminal runs', async () => {
  const snapshot = await __testables.buildPlannerStreamSnapshotWithDeps(
    {
      projectId: 'project-1',
      episodeId: 'episode-1',
      runId: 'run-1',
    },
    {
      prisma: {
        plannerSession: {
          findFirst: async () => ({
            id: 'session-1',
            status: 'PLANNING',
            refinementVersions: [
              {
                id: 'ref-1',
                sourceRunId: 'different-run',
                stepAnalysis: [],
              },
            ],
          }),
        },
        run: {
          findFirst: async () => ({
            id: 'run-1',
            runType: 'PLANNER_DOC_UPDATE',
            status: 'FAILED',
            inputJson: createPlannerRunInput([{ id: 'step-a', title: '合成步骤' }]),
            errorCode: 'TEST_ERROR',
            errorMessage: 'stream failed',
          }),
        },
      } as never,
    },
  );

  assert.equal(snapshot.steps[0]?.title, '合成步骤');
  assert.equal(snapshot.steps[0]?.status, 'failed');
  assert.equal(snapshot.errorCode, 'TEST_ERROR');
  assert.equal(snapshot.errorMessage, 'stream failed');
  assert.equal(snapshot.terminal, true);
});
