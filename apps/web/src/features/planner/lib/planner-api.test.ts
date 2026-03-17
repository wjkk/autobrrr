import assert from 'node:assert/strict';
import test from 'node:test';

import {
  __testables,
  fetchPlannerShotPromptPreview,
  uploadPlannerImageAsset,
} from './planner-api';

function installFetchStub(
  implementation: (input: RequestInfo | URL, init?: RequestInit) => Promise<{
    ok: boolean;
    json: () => Promise<unknown>;
  }>,
) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = implementation as typeof fetch;
  return () => {
    globalThis.fetch = originalFetch;
  };
}

test('plannerJsonRequest sends json headers and unwraps successful payloads', async () => {
  let capturedPath = '';
  let capturedInit: RequestInit | undefined;
  const restore = installFetchStub(async (input, init) => {
    capturedPath = String(input);
    capturedInit = init;
    return {
      ok: true,
      json: async () => ({ ok: true, data: { id: 'workspace-1' } }),
    };
  });

  try {
    const result = await __testables.plannerJsonRequest<{ id: string }>(
      '/api/planner/test',
      {
        method: 'PATCH',
        body: JSON.stringify({ title: 'test' }),
      },
      'fallback',
    );

    assert.deepEqual(result, { id: 'workspace-1' });
    assert.equal(capturedPath, '/api/planner/test');
    assert.equal(capturedInit?.method, 'PATCH');
    assert.equal(
      (capturedInit?.headers as Record<string, string>)['Content-Type'],
      'application/json',
    );
    assert.equal((capturedInit?.headers as Record<string, string>).Accept, 'application/json');
  } finally {
    restore();
  }
});

test('plannerJsonRequest prefers api error messages and falls back when payload is malformed', async () => {
  const restore = installFetchStub(async () => ({
    ok: false,
    json: async () => ({ ok: false, error: { message: '策划接口失败' } }),
  }));

  try {
    await assert.rejects(
      () => __testables.plannerJsonRequest('/api/planner/test', undefined, 'fallback'),
      /策划接口失败/,
    );
  } finally {
    restore();
  }

  const restoreMalformed = installFetchStub(async () => ({
    ok: false,
    json: async () => ({ broken: true }),
  }));

  try {
    await assert.rejects(
      () => __testables.plannerJsonRequest('/api/planner/test', undefined, 'fallback'),
      /fallback/,
    );
  } finally {
    restoreMalformed();
  }
});

test('fetchPlannerShotPromptPreview builds the expected query string', async () => {
  let capturedPath = '';
  const restore = installFetchStub(async (input) => {
    capturedPath = String(input);
    return {
      ok: true,
      json: async () => ({
        ok: true,
        data: {
          refinementVersionId: 'refinement-1',
          model: {
            familySlug: 'seedance-2-0',
            familyName: 'Seedance 2.0',
            summary: 'summary',
            capability: {
              supportsMultiShot: true,
              maxShotsPerGeneration: 6,
              timestampMeaning: 'narrative-hint',
              audioDescStyle: 'inline',
              referenceImageSupport: 'full',
              maxReferenceImages: 4,
              maxReferenceVideos: 0,
              maxReferenceAudios: 0,
              cameraVocab: 'chinese',
              maxDurationSeconds: 10,
              maxResolution: '1080p',
              promptStyle: 'narrative',
              knownIssues: [],
            },
          },
          prompts: [],
        },
      }),
    };
  });

  try {
    await fetchPlannerShotPromptPreview({
      projectId: 'project/1',
      episodeId: 'episode/1',
      modelSlug: 'seedance-2-0',
    });

    assert.equal(
      capturedPath,
      '/api/planner/projects/project%2F1/shot-prompts?episodeId=episode%2F1&modelSlug=seedance-2-0',
    );
  } finally {
    restore();
  }
});

test('uploadPlannerImageAsset posts multipart data and unwraps envelope', async () => {
  let capturedPath = '';
  let capturedBody: FormData | null = null;
  const restore = installFetchStub(async (input, init) => {
    capturedPath = String(input);
    capturedBody = init?.body instanceof FormData ? init.body : null;
    return {
      ok: true,
      json: async () => ({
        ok: true,
        data: {
          id: 'asset-1',
          sourceUrl: '/uploads/image/test.png',
          fileName: 'test.png',
          mediaKind: 'image',
          sourceKind: 'upload',
          createdAt: '2026-03-17T12:00:00.000Z',
        },
      }),
    };
  });

  try {
    const file = new File(['hello'], 'test.png', { type: 'image/png' });
    const result = await uploadPlannerImageAsset({
      projectId: 'project/1',
      episodeId: 'episode-1',
      file,
    });
    const body = capturedBody as FormData | null;

    assert.equal(capturedPath, '/api/planner/projects/project%2F1/assets/upload');
    assert.ok(body !== null);
    assert.equal(body.get('episodeId'), 'episode-1');
    assert.equal((body.get('file') as File | null)?.name, 'test.png');
    assert.equal(result.id, 'asset-1');
  } finally {
    restore();
  }
});
