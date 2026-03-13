import { prisma } from '../src/lib/prisma.js';
import { processNextQueuedRun } from '../src/lib/run-worker.js';

const apiBaseUrl = (process.env.API_BASE_URL ?? 'http://127.0.0.1:8787').replace(/\/$/, '');
const email = process.env.SMOKE_EMAIL ?? `smoke-${Date.now()}@example.com`;
const password = process.env.SMOKE_PASSWORD ?? 'password123';

interface ApiSuccess<T> {
  ok: true;
  data: T;
}

interface ApiFailure {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;

async function request<T>(path: string, init?: RequestInit & { cookie?: string }) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
      ...(init?.cookie ? { Cookie: init.cookie } : {}),
    },
  });

  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || !payload.ok) {
    const errorPayload = payload as ApiFailure;
    throw new Error(`${path} failed: ${errorPayload.error?.code ?? response.status} ${errorPayload.error?.message ?? 'Unknown error'}`);
  }

  return {
    data: payload.data,
    setCookie: response.headers.get('set-cookie'),
  };
}

function requireCookie(setCookieHeader: string | null) {
  if (!setCookieHeader) {
    throw new Error('Missing set-cookie header from login response.');
  }

  return setCookieHeader.split(';', 1)[0] ?? '';
}

async function readProviderCallbackState(runId: string) {
  const run = await prisma.run.findUnique({
    where: { id: runId },
    select: {
      providerJobId: true,
      providerCallbackToken: true,
    },
  });

  if (!run?.providerJobId || !run.providerCallbackToken) {
    throw new Error(`Run ${runId} is missing provider callback state.`);
  }

  return run;
}

async function processUntilRun(runId: string, maxAttempts = 10) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const processed = await processNextQueuedRun();
    if (!processed) {
      return false;
    }

    if (processed.runId === runId) {
      return true;
    }
  }

  return false;
}

async function processUntilMatch(
  matcher: (value: Awaited<ReturnType<typeof processNextQueuedRun>>) => boolean,
  maxAttempts = 10,
  delayMs = 1100,
) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const processed = await processNextQueuedRun();
    if (matcher(processed)) {
      return processed;
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  return null;
}

async function main() {
  console.log(`[smoke] API base: ${apiBaseUrl}`);
  console.log(`[smoke] email: ${email}`);

  await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      displayName: 'Smoke Test',
    }),
  });
  console.log('[smoke] register ok');

  const login = await request<{ id: string; email: string; displayName: string | null }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
    }),
  });
  const cookie = requireCookie(login.setCookie);
  console.log('[smoke] login ok');

  await request('/api/auth/me', { cookie });
  console.log('[smoke] me ok');

  const createdProject = await request<{
    projectId: string;
    redirectUrl: string;
    project: { id: string; title: string; contentMode: string; status: string };
  }>('/api/studio/projects', {
    method: 'POST',
    cookie,
    body: JSON.stringify({
      prompt: '烟雨中的机械猫在屋檐下观察城市，生成一个短片项目',
      contentMode: 'single',
    }),
  });
  console.log(`[smoke] project created: ${createdProject.data.projectId}`);

  const project = await request<{
    id: string;
    currentEpisodeId: string | null;
    episodes: Array<{ id: string; episodeNo: number; title: string; status: string }>;
  }>(`/api/studio/projects/${createdProject.data.projectId}`, { cookie });
  console.log('[smoke] project detail ok');

  const episodeId = project.data.currentEpisodeId ?? project.data.episodes[0]?.id;
  if (!episodeId) {
    throw new Error('Project detail did not return an episode id.');
  }

  await request(`/api/projects/${createdProject.data.projectId}/planner/workspace?episodeId=${episodeId}`, { cookie });
  console.log('[smoke] planner workspace ok');

  await request(`/api/projects/${createdProject.data.projectId}/creation/workspace?episodeId=${episodeId}`, { cookie });
  console.log('[smoke] creation workspace ok');

  await request(`/api/projects/${createdProject.data.projectId}/publish/workspace?episodeId=${episodeId}`, { cookie });
  console.log('[smoke] publish workspace ok');

  await request('/api/model-families', { cookie });
  console.log('[smoke] model families ok');

  await request('/api/model-endpoints?familySlug=seko-image', { cookie });
  console.log('[smoke] model endpoints ok');

  await request('/api/model-resolution/resolve', {
    method: 'POST',
    cookie,
    body: JSON.stringify({
      modelKind: 'image',
      familySlug: 'seko-image',
      strategy: 'preferOfficial',
    }),
  });
  console.log('[smoke] model resolution ok');

  const createdShot = await request<{
    id: string;
    projectId: string;
    episodeId: string;
    sequenceNo: number;
    title: string;
  }>(`/api/projects/${createdProject.data.projectId}/shots`, {
    method: 'POST',
    cookie,
    body: JSON.stringify({
      episodeId,
      title: '分镜1',
      subtitleText: '固定镜头，机械猫看向窗外。',
      narrationText: '雨夜中的机械猫安静观察城市。',
      imagePrompt: '雨夜、窗边、机械猫、霓虹城市、电影感',
      motionPrompt: '固定镜头，轻微推近，雨滴反光',
    }),
  });
  console.log(`[smoke] shot created: ${createdShot.data.id}`);

  const createdAsset = await request<{ id: string; mediaKind: string; sourceKind: string }>(
    `/api/projects/${createdProject.data.projectId}/assets`,
    {
      method: 'POST',
      cookie,
      body: JSON.stringify({
        episodeId,
        mediaKind: 'image',
        sourceKind: 'upload',
        fileName: 'reference-cat.png',
        mimeType: 'image/png',
        fileSizeBytes: 245760,
        width: 1024,
        height: 1536,
        sourceUrl: 'https://example.com/reference-cat.png',
        metadata: {
          purpose: 'reference',
        },
      }),
    },
  );
  console.log(`[smoke] asset created: ${createdAsset.data.id}`);

  const imageRun = await request<{ run: { id: string; status: string } }>(
    `/api/projects/${createdProject.data.projectId}/shots/${createdShot.data.id}/generate-image`,
    {
      method: 'POST',
      cookie,
      body: JSON.stringify({
        prompt: '雨夜中的机械猫在窗边凝视霓虹城市，电影级构图',
        modelFamily: 'seko-image',
        modelEndpoint: 'official-seko-image-v1',
        referenceAssetIds: [createdAsset.data.id],
        idempotencyKey: `smoke-image-${Date.now()}`,
        options: {
          aspectRatio: '2:3',
        },
      }),
    },
  );
  console.log(`[smoke] image run created: ${imageRun.data.run.id}`);

  await request(`/api/runs/${imageRun.data.run.id}`, { cookie });
  console.log('[smoke] run detail ok');

  const workerProcessedTarget = await processUntilRun(imageRun.data.run.id);
  if (!workerProcessedTarget) {
    throw new Error('Worker did not process the queued image run.');
  }
  console.log('[smoke] worker processed queued run');

  const completedRun = await request<{ status: string; output: { assetId?: string; shotVersionId?: string } | null }>(
    `/api/runs/${imageRun.data.run.id}`,
    { cookie },
  );
  if (completedRun.data.status !== 'completed') {
    throw new Error(`Expected completed run, got ${completedRun.data.status}.`);
  }
  console.log('[smoke] run completed ok');

  const creationWorkspace = await request<{ shots: Array<{ id: string; status: string; activeVersionId: string | null }> }>(
    `/api/projects/${createdProject.data.projectId}/creation/workspace?episodeId=${episodeId}`,
    { cookie },
  );
  const createdWorkspaceShot = creationWorkspace.data.shots.find((shot) => shot.id === createdShot.data.id);
  if (!createdWorkspaceShot || createdWorkspaceShot.status !== 'success' || !createdWorkspaceShot.activeVersionId) {
    throw new Error('Creation workspace did not reflect generated active version.');
  }
  console.log('[smoke] creation workspace reflects generated version');

  const videoRun = await request<{ run: { id: string; status: string } }>(
    `/api/projects/${createdProject.data.projectId}/shots/${createdShot.data.id}/generate-video`,
    {
      method: 'POST',
      cookie,
      body: JSON.stringify({
        prompt: '雨夜中的机械猫回头看向城市灯光，镜头轻推近',
        modelFamily: 'seko-video',
        modelEndpoint: 'proxy-seko-video-v1',
        referenceAssetIds: [createdAsset.data.id],
        idempotencyKey: `smoke-video-${Date.now()}`,
        durationSeconds: 6,
        aspectRatio: '16:9',
        resolution: '1080p',
      }),
    },
  );
  console.log(`[smoke] video run created: ${videoRun.data.run.id}`);

  const firstAsyncStep = await processUntilMatch(
    (processed) => !!processed && processed.runId === videoRun.data.run.id && processed.action === 'submitted',
    10,
    200,
  );
  if (!firstAsyncStep) {
    throw new Error('Expected async provider submission step for video run.');
  }
  console.log('[smoke] async provider submission ok');

  const secondAsyncStep = await processUntilMatch(
    (processed) => !!processed && processed.runId === videoRun.data.run.id && processed.action === 'polled',
  );
  if (!secondAsyncStep) {
    throw new Error('Expected async provider polling step for video run.');
  }
  console.log('[smoke] async provider polling ok');

  const thirdAsyncStep = await processUntilMatch(
    (processed) => !!processed && processed.runId === videoRun.data.run.id && processed.action === 'processed',
  );
  if (!thirdAsyncStep) {
    throw new Error('Expected async provider completion step for video run.');
  }
  console.log('[smoke] async provider completion ok');

  const completedVideoRun = await request<{ status: string; output: { dimensions?: { width: number; height: number; durationMs: number } } | null }>(
    `/api/runs/${videoRun.data.run.id}`,
    { cookie },
  );
  if (completedVideoRun.data.status !== 'completed') {
    throw new Error(`Expected completed video run, got ${completedVideoRun.data.status}.`);
  }
  if (completedVideoRun.data.output?.dimensions?.durationMs !== 6000) {
    throw new Error('Expected video run duration snapshot to be 6000ms.');
  }
  console.log('[smoke] async video run completed with expected snapshot');

  const callbackVideoRun = await request<{ run: { id: string; status: string } }>(
    `/api/projects/${createdProject.data.projectId}/shots/${createdShot.data.id}/generate-video`,
    {
      method: 'POST',
      cookie,
      body: JSON.stringify({
        prompt: '雨夜中的机械猫望向镜头外，反光玻璃带出城市层次',
        modelFamily: 'seko-video',
        modelEndpoint: 'proxy-seko-video-v1',
        referenceAssetIds: [createdAsset.data.id],
        idempotencyKey: `smoke-video-callback-${Date.now()}`,
        durationSeconds: 6,
        aspectRatio: '16:9',
        resolution: '1080p',
      }),
    },
  );
  console.log(`[smoke] callback video run created: ${callbackVideoRun.data.run.id}`);

  const callbackSubmitStep = await processUntilMatch(
    (processed) => !!processed && processed.runId === callbackVideoRun.data.run.id && processed.action === 'submitted',
    10,
    200,
  );
  if (!callbackSubmitStep) {
    throw new Error('Expected async provider submission step for callback video run.');
  }
  console.log('[smoke] callback video submission ok');

  const callbackState = await readProviderCallbackState(callbackVideoRun.data.run.id);
  const callbackResult = await request<{ status: string; providerStatus: string | null; output: { dimensions?: { durationMs: number } } | null }>(
    `/api/internal/provider-callbacks/${callbackState.providerCallbackToken}`,
    {
      method: 'POST',
      body: JSON.stringify({
        providerJobId: callbackState.providerJobId,
        providerStatus: 'succeeded',
      }),
    },
  );
  if (callbackResult.data.status !== 'completed' || callbackResult.data.providerStatus !== 'succeeded') {
    throw new Error('Expected callback video run to complete through callback.');
  }
  if (callbackResult.data.output?.dimensions?.durationMs !== 6000) {
    throw new Error('Expected callback video duration snapshot to be 6000ms.');
  }
  console.log('[smoke] callback video completion ok');

  const projectList = await request<Array<{ id: string; title: string }>>('/api/studio/projects', { cookie });
  console.log(`[smoke] project list ok (${projectList.data.length} projects)`);
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[smoke] failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
