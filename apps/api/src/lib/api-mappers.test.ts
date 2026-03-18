import test from 'node:test';
import assert from 'node:assert/strict';

import type { Asset, Run, Shot } from '@prisma/client';

import { __testables, mapAsset, mapRun, mapShot } from './api-mappers.js';

test('mapAsset normalizes media enums and timestamps for api output', () => {
  const createdAt = new Date('2026-03-17T00:00:00.000Z');
  const updatedAt = new Date('2026-03-17T00:00:05.000Z');
  const mapped = mapAsset({
    id: 'asset-1',
    ownerUserId: 'user-1',
    projectId: 'project-1',
    episodeId: 'episode-1',
    mediaKind: 'IMAGE',
    sourceKind: 'GENERATED',
    fileName: 'image.png',
    mimeType: 'image/png',
    fileSizeBytes: 1024,
    width: 1280,
    height: 720,
    durationMs: null,
    storageKey: 'uploads/generated/image.png',
    sourceUrl: '/uploads/generated/image.png',
    metadataJson: { prompt: '夜晚街头' },
    createdAt,
    updatedAt,
  } as unknown as Asset);

  assert.equal(mapped.mediaKind, 'image');
  assert.equal(mapped.sourceKind, 'generated');
  assert.equal(mapped.createdAt, createdAt.toISOString());
  assert.deepEqual(mapped.metadata, { prompt: '夜晚街头' });
});

test('mapRun normalizes enum fields and nullable timestamps', () => {
  const mapped = mapRun({
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
    executorType: 'WORKER',
    inputJson: { prompt: '夜晚街头追逐' },
    outputJson: { executionMode: 'live', providerData: { task_id: 'task-1' } },
    errorCode: null,
    errorMessage: null,
    idempotencyKey: 'idem-1',
    providerJobId: 'task-1',
    providerStatus: 'processing',
    providerCallbackToken: 'callback-1',
    nextPollAt: new Date('2026-03-17T00:00:06.000Z'),
    lastPolledAt: null,
    pollAttemptCount: 1,
    startedAt: new Date('2026-03-17T00:00:00.000Z'),
    finishedAt: null,
    createdAt: new Date('2026-03-17T00:00:00.000Z'),
    updatedAt: new Date('2026-03-17T00:00:01.000Z'),
  } as unknown as Run);

  assert.equal(mapped.runType, 'video_generation');
  assert.equal(mapped.status, 'running');
  assert.equal(mapped.executorType, 'worker');
  assert.equal(mapped.lastPolledAt, null);
  assert.deepEqual(mapped.output, { executionMode: 'live', providerData: { task_id: 'task-1' } });
  assert.equal(mapped.executionMode, 'live');
});

test('readRunExecutionMode prefers explicit output execution mode and falls back to mocked provider data', () => {
  assert.equal(__testables.readRunExecutionMode({ executionMode: 'fallback' }), 'fallback');
  assert.equal(__testables.readRunExecutionMode({ providerData: { mocked: true } }), 'fallback');
  assert.equal(__testables.readRunExecutionMode({ providerData: { mocked: false } }), 'live');
  assert.equal(__testables.readRunExecutionMode(null), null);
});

test('mapShot normalizes active version enums and preserves nullable version', () => {
  const createdAt = new Date('2026-03-17T00:00:00.000Z');
  const updatedAt = new Date('2026-03-17T00:00:05.000Z');
  const withVersion = mapShot({
    id: 'shot-1',
    projectId: 'project-1',
    episodeId: 'episode-1',
    sequenceNo: 1,
    title: '开场',
    subtitleText: '夜幕降临',
    narrationText: '旁白',
    imagePrompt: '夜晚街头',
    motionPrompt: '缓慢推进',
    promptJson: null,
    targetVideoModelFamilySlug: 'seedance-2-0',
    materialBindingsJson: null,
    plannerRefinementVersionId: 'ref-1',
    plannerShotScriptId: 'shot-script-1',
    finalizedAt: null,
    status: 'READY',
    activeVersionId: 'version-1',
    createdAt,
    updatedAt,
    activeVersion: {
      id: 'version-1',
      label: 'V1',
      mediaKind: 'VIDEO',
      status: 'COMPLETED',
    },
  } as unknown as Shot & { activeVersion: { id: string; label: string; mediaKind: string; status: string } });
  const withoutVersion = mapShot({
    id: 'shot-2',
    projectId: 'project-1',
    episodeId: 'episode-1',
    sequenceNo: 2,
    title: '转场',
    subtitleText: null,
    narrationText: null,
    imagePrompt: null,
    motionPrompt: null,
    promptJson: null,
    targetVideoModelFamilySlug: null,
    materialBindingsJson: null,
    plannerRefinementVersionId: null,
    plannerShotScriptId: null,
    finalizedAt: null,
    status: 'DRAFT',
    activeVersionId: null,
    createdAt,
    updatedAt,
    activeVersion: null,
  } as unknown as Shot & { activeVersion: null });

  assert.equal(withVersion.status, 'ready');
  assert.equal(withVersion.activeVersion?.mediaKind, 'video');
  assert.equal(withVersion.activeVersion?.status, 'completed');
  assert.equal(withoutVersion.activeVersion, null);
});
