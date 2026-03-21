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
    executionMode: 'live',
    providerData: { id: 'provider-1' },
  });
  assert.equal(missing, undefined);
});

test('buildProviderOutputJson persists explicit completion url for completed updates', () => {
  const merged = __testables.buildProviderOutputJson(
    createRun({ outputJson: { preserved: true } }),
    {
      type: 'completed',
      providerStatus: 'succeeded',
      completionUrl: 'https://example.com/final.mp4',
      providerOutput: { taskId: 'task-1' },
    },
  );

  assert.deepEqual(merged, {
    preserved: true,
    executionMode: 'live',
    providerData: {
      taskId: 'task-1',
      completionUrl: 'https://example.com/final.mp4',
      downloadUrl: 'https://example.com/final.mp4',
    },
  });
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

test('claimNextRunWithDeps prefers pollable runs before queued runs', async () => {
  const calls: string[] = [];
  const pollableRun = createRun({
    id: 'run-poll',
    status: 'RUNNING',
    providerJobId: 'job-1',
    nextPollAt: new Date('2026-03-17T00:00:00.000Z'),
  });

  const result = await __testables.claimNextRunWithDeps({
    findFirst: (async (args: { where: { status: string } }) => {
      calls.push(`findFirst:${args.where.status}`);
      return args.where.status === 'RUNNING' ? pollableRun : null;
    }) as never,
    updateMany: (async () => {
      throw new Error('queued claim should not run when pollable work exists');
    }) as never,
    findUnique: (async () => {
      throw new Error('queued refresh should not run when pollable work exists');
    }) as never,
  } as never);

  assert.equal(result?.id, 'run-poll');
  assert.deepEqual(calls, ['findFirst:RUNNING']);
});

test('claimNextRunWithDeps returns null when queued run claim loses the race', async () => {
  const queuedRun = createRun({ id: 'run-queued', status: 'QUEUED' });

  const result = await __testables.claimNextRunWithDeps({
    findFirst: (async (args: { where: { status: string } }) => (args.where.status === 'QUEUED' ? queuedRun : null)) as never,
    updateMany: (async () => ({ count: 0 })) as never,
    findUnique: (async () => {
      throw new Error('findUnique should not run when claim fails');
    }) as never,
  } as never);

  assert.equal(result, null);
});
