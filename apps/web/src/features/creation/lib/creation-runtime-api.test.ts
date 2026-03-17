import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildRuntimeModelOptions,
  buildVideoRunPayload,
  requestCreationApi,
  resolveRuntimeModelDisplayName,
} from './creation-runtime-api';

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

test('requestCreationApi sends json headers and unwraps envelopes', async () => {
  let capturedInit: RequestInit | undefined;
  const restore = installFetchStub(async (_input, init) => {
    capturedInit = init;
    return {
      ok: true,
      json: async () => ({ ok: true, data: { runId: 'run-1' } }),
    };
  });

  try {
    const result = await requestCreationApi<{ runId: string }>('/api/creation/test', {
      method: 'POST',
      body: JSON.stringify({ title: 'test' }),
    });

    assert.deepEqual(result, { runId: 'run-1' });
    assert.equal((capturedInit?.headers as Record<string, string>).Accept, 'application/json');
    assert.equal((capturedInit?.headers as Record<string, string>)['Content-Type'], 'application/json');
  } finally {
    restore();
  }
});

test('requestCreationApi surfaces api messages and falls back to path-based errors', async () => {
  const restoreApiError = installFetchStub(async () => ({
    ok: false,
    json: async () => ({ ok: false, error: { message: '生成失败' } }),
  }));

  try {
    await assert.rejects(() => requestCreationApi('/api/creation/test'), /生成失败/);
  } finally {
    restoreApiError();
  }

  const restoreMalformed = installFetchStub(async () => ({
    ok: false,
    json: async () => ({ broken: true }),
  }));

  try {
    await assert.rejects(() => requestCreationApi('/api/creation/test'), /Request failed: \/api\/creation\/test/);
  } finally {
    restoreMalformed();
  }
});

test('creation runtime helpers build model options and display names from catalog', () => {
  const catalog = {
    image: [
      {
        id: 'image-endpoint',
        slug: 'seedream-3.0',
        label: 'Seedream 3.0',
        family: { id: 'family-image', slug: 'seedream-3-0', name: 'Seedream 3.0', modelKind: 'image' as const },
        provider: { id: 'provider-1', code: 'ark', name: 'Volcengine Ark', providerType: 'official', enabled: true },
      },
    ],
    video: [
      {
        id: 'video-endpoint',
        slug: 'seedance-2.0',
        label: 'Seedance 2.0',
        family: { id: 'family-video', slug: 'seedance-2-0', name: 'Seedance 2.0', modelKind: 'video' as const },
        provider: { id: 'provider-1', code: 'ark', name: 'Volcengine Ark', providerType: 'official', enabled: true },
      },
    ],
  };

  assert.deepEqual(buildRuntimeModelOptions(catalog.video, 'video'), [
    {
      id: 'seedance-2.0',
      title: 'Seedance 2.0',
      description: 'Volcengine Ark · Seedance 2.0',
      modelKind: 'video',
    },
  ]);
  assert.equal(resolveRuntimeModelDisplayName(catalog, 'seedance-2.0'), 'Seedance 2.0');
  assert.equal(resolveRuntimeModelDisplayName(catalog, 'unknown-model'), 'unknown-model');
});

test('buildVideoRunPayload normalizes duration, resolution, ratio and optional frame references', () => {
  const payload = buildVideoRunPayload({
    draft: {
      model: 'seedance-2.0',
      resolution: '1080P',
      durationMode: '6s',
      cropToVoice: false,
    },
    shot: {
      id: 'shot-1',
      shotNo: 1,
      title: '镜头 1',
      prompt: 'prompt',
      visualPrompt: 'visual',
      durationSeconds: 6,
      durationMode: '6s',
      resolution: '1080P',
      aspectRatio: '9:16',
      cropToVoice: false,
      subtitleText: '',
      voiceoverText: '',
      musicPrompt: '',
      narrationMode: 'voiceover',
      status: 'pending',
      preferredModel: 'seedance-2.0',
      selectedVersionId: null,
      activeVersionId: null,
      pendingApplyVersionId: null,
      versions: [],
      materials: [],
      activeMaterialId: null,
      canvasTransform: {
        ratio: '16:9',
        zoom: 1,
        offsetX: 0,
        offsetY: 0,
        flipX: false,
      },
      sequenceNo: 1,
    } as never,
    runtimeModelCatalog: {
      video: [
        {
          id: 'video-endpoint',
          slug: 'seedance-2.0',
          label: 'Seedance 2.0',
          family: { id: 'family-video', slug: 'seedance-2-0', name: 'Seedance 2.0', modelKind: 'video' as const },
          provider: { id: 'provider-1', code: 'ark', name: 'Volcengine Ark', providerType: 'official', enabled: true },
        },
      ],
    },
    frameOptions: {
      firstFrameUrl: 'https://example.com/first.png',
      lastFrameUrl: 'https://example.com/last.png',
    },
  });

  assert.deepEqual(payload, {
    durationSeconds: 6,
    aspectRatio: '16:9',
    resolution: '1080p',
    modelEndpoint: 'seedance-2.0',
    firstFrameUrl: 'https://example.com/first.png',
    lastFrameUrl: 'https://example.com/last.png',
  });
});
