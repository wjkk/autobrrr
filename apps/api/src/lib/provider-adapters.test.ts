import test from 'node:test';
import assert from 'node:assert/strict';

import type { Run } from '@prisma/client';

import { __testables, resolveProviderAdapter } from './provider-adapters.js';

function buildRun(inputJson: Record<string, unknown>, overrides: Partial<Run> = {}) {
  return {
    id: 'run-1',
    projectId: 'project-1',
    episodeId: 'episode-1',
    modelFamilyId: 'family-1',
    modelProviderId: 'provider-1',
    modelEndpointId: 'endpoint-1',
    runType: 'VIDEO_GENERATION',
    resourceType: 'shot',
    resourceId: 'shot-1',
    status: 'RUNNING',
    executorType: 'SYSTEM_WORKER',
    inputJson,
    outputJson: null,
    errorCode: null,
    errorMessage: null,
    idempotencyKey: null,
    providerJobId: null,
    providerStatus: null,
    providerCallbackToken: null,
    nextPollAt: null,
    lastPolledAt: null,
    pollAttemptCount: 0,
    startedAt: new Date('2026-03-17T00:00:00.000Z'),
    finishedAt: null,
    createdAt: new Date('2026-03-17T00:00:00.000Z'),
    ...overrides,
  } as unknown as Run;
}

function buildProviderInput(overrides: Record<string, unknown> = {}) {
  return {
    shotId: 'shot-1',
    prompt: '夜晚街头追逐',
    modelFamily: {
      id: 'family-1',
      slug: 'seedance-2.0',
      name: 'Seedance 2.0',
    },
    modelProvider: {
      id: 'provider-1',
      code: 'platou',
      name: 'Platou',
      providerType: 'OFFICIAL',
      baseUrl: 'https://provider.example.com',
    },
    modelEndpoint: {
      id: 'endpoint-1',
      slug: 'seedance-endpoint',
      label: 'Seedance',
      remoteModelKey: 'seedance-v1',
    },
    referenceAssetIds: [],
    options: null,
    ...overrides,
  };
}

test('provider adapter helpers normalize provider-backed fields and nested task ids', () => {
  const run = buildRun(buildProviderInput({
    prompt: ' 夜晚街头追逐 ',
    modelProvider: {
      id: 'provider-1',
      code: ' platou ',
      name: 'Platou',
      providerType: 'PROXY',
      baseUrl: 'https://provider.example.com',
    },
    modelEndpoint: {
      id: 'endpoint-1',
      slug: 'seedance-endpoint',
      label: 'Seedance',
      remoteModelKey: ' seedance-v1 ',
    },
  }));

  assert.equal(__testables.getProviderCode(run), 'platou');
  assert.equal(__testables.getProviderType(run), 'proxy');
  assert.equal(__testables.getEndpointModelKey(run), 'seedance-v1');
  assert.equal(__testables.getPrompt(run), '夜晚街头追逐');
  assert.equal(__testables.getModelKind(run), 'video');
  assert.equal(__testables.normalizeProviderStatus(' completed '), 'succeeded');
  assert.equal(__testables.inferPlatouVideoTaskId({ data: { task_id: 'task-1' } }), 'task-1');
  assert.equal(__testables.inferArkVideoTaskId({ data: { id: 'task-2' } }), 'task-2');
  assert.equal(__testables.inferPlatouVideoState({ data: { state: 'processing' } }), 'processing');
  assert.equal(__testables.inferArkVideoState({ data: { task_status: 'SUCCESS' } }), 'success');
  assert.deepEqual(
    __testables.withNormalizedCompletedOutput({ payload: { image_url: 'https://example.com/generated.png' } }),
    {
      payload: { image_url: 'https://example.com/generated.png' },
      completionUrl: 'https://example.com/generated.png',
      downloadUrl: 'https://example.com/generated.png',
    },
  );
  assert.equal(
    __testables.resolveProviderCompletionUrl({ payload: { image_url: 'https://example.com/generated.png' } }),
    'https://example.com/generated.png',
  );
});

test('resolveProviderAdapter selects ark, platou, proxy mock and official adapters', () => {
  const arkRun = buildRun(buildProviderInput({
    modelProvider: {
      id: 'provider-1',
      code: 'ark',
      name: 'Ark',
      providerType: 'OFFICIAL',
      baseUrl: 'https://provider.example.com',
    },
    modelEndpoint: {
      id: 'endpoint-1',
      slug: 'doubao-endpoint',
      label: 'Doubao',
      remoteModelKey: 'doubao',
    },
    plannerSessionId: 'session-1',
    episodeId: 'episode-1',
    projectId: 'project-1',
    rawPrompt: 'test',
    projectTitle: '项目',
    episodeTitle: '第1集',
    contentMode: 'single',
    contentType: 'drama',
    targetStage: 'outline',
    triggerType: 'generate_outline',
    stepDefinitions: [],
    promptSnapshot: { systemPrompt: 'system' },
    contextSnapshot: { messages: [] },
  }), { runType: 'PLANNER_DOC_UPDATE' });
  const platouRun = buildRun(buildProviderInput());
  const proxyRun = buildRun(buildProviderInput({
    modelProvider: {
      id: 'provider-1',
      code: 'third-party',
      name: 'Third Party',
      providerType: 'PROXY',
      baseUrl: 'https://provider.example.com',
    },
  }));
  const officialRun = buildRun(buildProviderInput({
    modelProvider: {
      id: 'provider-1',
      code: 'third-party',
      name: 'Third Party',
      providerType: 'OFFICIAL',
      baseUrl: 'https://provider.example.com',
    },
  }));

  assert.notEqual(resolveProviderAdapter(arkRun), __testables.mockProxyAdapter);
  assert.notEqual(resolveProviderAdapter(platouRun), __testables.mockProxyAdapter);
  assert.equal(resolveProviderAdapter(proxyRun), __testables.mockProxyAdapter);
  assert.equal(resolveProviderAdapter(officialRun), __testables.officialAdapter);
});

test('mock proxy adapter simulates submit, poll and callback transitions', async () => {
  const run = buildRun(buildProviderInput({
    modelProvider: {
      id: 'provider-1',
      code: 'third-party',
      name: 'Third Party',
      providerType: 'PROXY',
      baseUrl: 'https://provider.example.com',
    },
  }), { pollAttemptCount: 0 });

  const submitted = await __testables.mockProxyAdapter.submit(run);
  assert.equal(submitted.type, 'submitted');
  assert.equal(submitted.providerStatus, 'submitted');

  const running = await __testables.mockProxyAdapter.poll(run);
  assert.equal(running.type, 'running');
  assert.equal(running.providerStatus, 'processing');

  const completed = await __testables.mockProxyAdapter.poll({ ...run, pollAttemptCount: 1 } as Run);
  assert.equal(completed.type, 'completed');

  const callbackRunning = await __testables.mockProxyAdapter.handleCallback(run, {
    providerStatus: 'processing',
    output: { progress: 60 },
  });
  assert.equal(callbackRunning.type, 'running');
  assert.equal(callbackRunning.providerStatus, 'processing');
  assert.deepEqual(callbackRunning.providerOutput, { progress: 60 });
  assert.ok(callbackRunning.type === 'running' && callbackRunning.nextPollAt instanceof Date);

  const callbackFailed = await __testables.mockProxyAdapter.handleCallback(run, {
    providerStatus: 'failed',
    errorCode: 'PROVIDER_FAILED',
    errorMessage: 'bad provider result',
  });
  assert.deepEqual(callbackFailed, {
    type: 'failed',
    providerStatus: 'failed',
    errorCode: 'PROVIDER_FAILED',
    errorMessage: 'bad provider result',
    providerOutput: undefined,
  });
});

test('buildProviderNotConfiguredFailure returns a hard failure instead of mocked planner success', () => {
  assert.deepEqual(__testables.buildProviderNotConfiguredFailure('ARK'), {
    type: 'failed',
    providerStatus: 'failed',
    errorCode: 'PROVIDER_NOT_CONFIGURED',
    errorMessage: 'ARK provider is not configured for this account. Configure and enable a usable provider before running planner AI.',
  });
});

test('official adapter rejects poll and callback because no async provider behavior exists', async () => {
  const run = buildRun(buildProviderInput({
    modelProvider: {
      id: 'provider-1',
      code: 'official',
      name: 'Official',
      providerType: 'OFFICIAL',
      baseUrl: 'https://provider.example.com',
    },
    plannerSessionId: 'session-1',
    episodeId: 'episode-1',
    projectId: 'project-1',
    rawPrompt: 'test',
    projectTitle: '项目',
    episodeTitle: '第1集',
    contentMode: 'single',
    contentType: 'drama',
    targetStage: 'outline',
    triggerType: 'generate_outline',
    stepDefinitions: [],
    promptSnapshot: { systemPrompt: 'system' },
    contextSnapshot: { messages: [] },
  }), { runType: 'PLANNER_DOC_UPDATE' });

  const submit = await __testables.officialAdapter.submit(run);
  const poll = await __testables.officialAdapter.poll(run);
  const callback = await __testables.officialAdapter.handleCallback(run, { providerStatus: 'completed' });

  assert.deepEqual(submit, {
    type: 'completed',
    providerStatus: 'succeeded',
    completionUrl: null,
  });
  assert.equal(poll.type, 'failed');
  assert.equal(callback.type, 'failed');
});
