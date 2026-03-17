import test from 'node:test';
import assert from 'node:assert/strict';
import type { Run } from '@prisma/client';

import { __testables } from './run-worker.js';

function createRun(overrides: Partial<Run> = {}): Run {
  const now = new Date('2026-03-17T00:00:00.000Z');
  return {
    id: 'run-1',
    projectId: 'project-1',
    episodeId: null,
    modelFamilyId: null,
    modelProviderId: null,
    modelEndpointId: null,
    runType: 'VIDEO_GENERATION',
    resourceType: 'shot',
    resourceId: 'shot-1',
    status: 'QUEUED',
    executorType: 'SYSTEM_WORKER',
    inputJson: {},
    outputJson: { previous: true },
    errorCode: null,
    errorMessage: null,
    idempotencyKey: null,
    providerJobId: null,
    providerStatus: null,
    providerCallbackToken: null,
    nextPollAt: null,
    lastPolledAt: null,
    pollAttemptCount: 0,
    startedAt: null,
    finishedAt: null,
    createdAt: now,
    ...overrides,
  };
}

test('buildProviderOutputJson merges provider data into existing object payloads', () => {
  const merged = __testables.buildProviderOutputJson(
    createRun({ outputJson: { preserved: true } }),
    {
      type: 'submitted',
      providerJobId: 'job-1',
      providerStatus: 'queued',
      nextPollAt: new Date('2026-03-17T00:00:10.000Z'),
      providerOutput: { id: 'provider-1' },
    },
  );
  const missing = __testables.buildProviderOutputJson(createRun({ outputJson: null }), {
    type: 'running',
    providerStatus: 'queued',
    nextPollAt: new Date('2026-03-17T00:00:10.000Z'),
  });

  assert.deepEqual(merged, {
    preserved: true,
    providerData: { id: 'provider-1' },
  });
  assert.equal(missing, undefined);
});

test('processClaimedRunWithDeps dispatches planner and media runs to submit or poll handlers', async () => {
  const calls: string[] = [];
  const submissionAction = { runId: 'run-1', status: 'running', action: 'submitted', providerJobId: 'job-1' } as const;
  const pollAction = { runId: 'run-2', status: 'running', action: 'polled', providerStatus: 'processing' } as const;

  const deps = {
    handleProviderSubmission: async (run: Run) => {
      calls.push(`submit:${run.id}`);
      return submissionAction;
    },
    handleProviderPoll: async (run: Run) => {
      calls.push(`poll:${run.id}`);
      return pollAction;
    },
    failRun: async () => {
      throw new Error('unexpected failRun');
    },
    inferMediaKindFromRunType: () => 'VIDEO' as const,
  };

  const plannerResult = await __testables.processClaimedRunWithDeps(
    createRun({ id: 'run-1', runType: 'PLANNER_DOC_UPDATE', providerJobId: null }),
    deps,
  );
  const mediaResult = await __testables.processClaimedRunWithDeps(
    createRun({ id: 'run-2', runType: 'VIDEO_GENERATION', providerJobId: 'job-2' }),
    deps,
  );

  assert.deepEqual(calls, ['submit:run-1', 'poll:run-2']);
  assert.equal(plannerResult.action, 'submitted');
  assert.equal(mediaResult.action, 'polled');
});

test('processClaimedRunWithDeps fails unsupported media run types before dispatch', async () => {
  const calls: Array<{ id: string; code: string; message: string }> = [];

  const result = await __testables.processClaimedRunWithDeps(
    createRun({ id: 'run-3', runType: 'PUBLISH', providerJobId: null }),
    {
      handleProviderSubmission: async () => {
        throw new Error('unexpected submission');
      },
      handleProviderPoll: async () => {
        throw new Error('unexpected poll');
      },
      failRun: async (id, code, message) => {
        calls.push({ id, code, message });
        return { runId: id, status: 'failed', action: 'failed' } as const;
      },
      inferMediaKindFromRunType: () => null,
    },
  );

  assert.deepEqual(calls, [
    {
      id: 'run-3',
      code: 'RUN_TYPE_NOT_SUPPORTED',
      message: 'Unsupported run type: PUBLISH',
    },
  ]);
  assert.equal(result.action, 'failed');
});
