import { prisma } from '../src/lib/prisma.js';
import { processNextQueuedRun } from '../src/lib/run-worker.js';

const apiBaseUrl = (process.env.API_BASE_URL ?? 'http://127.0.0.1:8787').replace(/\/$/, '');
const email = process.env.SMOKE_EMAIL ?? `smoke-${Date.now()}@example.com`;
const password = process.env.SMOKE_PASSWORD ?? 'password123';
const smokeArkApiKey = process.env.SMOKE_ARK_API_KEY ?? process.env.ARK_API_KEY ?? '';
const smokeAicsoApiToken = process.env.SMOKE_AICSO_API_TOKEN ?? process.env.AICSO_API_TOKEN ?? '';

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

async function configureProviderIfPresent(args: {
  cookie: string;
  providerCode: string;
  apiKey: string;
  defaults?: {
    textEndpointSlug?: string | null;
    imageEndpointSlug?: string | null;
    videoEndpointSlug?: string | null;
  };
}) {
  if (!args.apiKey.trim()) {
    return false;
  }

  await request(`/api/provider-configs/${encodeURIComponent(args.providerCode)}`, {
    method: 'PUT',
    cookie: args.cookie,
    body: JSON.stringify({
      apiKey: args.apiKey.trim(),
      enabled: true,
      defaults: args.defaults,
    }),
  });

  return true;
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

  const arkConfigured = await configureProviderIfPresent({
    cookie,
    providerCode: 'ark',
    apiKey: smokeArkApiKey,
    defaults: {
      textEndpointSlug: 'ark-doubao-seed-1-8-251228',
    },
  });
  if (arkConfigured) {
    console.log('[smoke] ark provider configured');
  }

  const aicsoConfigured = await configureProviderIfPresent({
    cookie,
    providerCode: 'aicso',
    apiKey: smokeAicsoApiToken,
    defaults: {
      imageEndpointSlug: 'aicso-gemini-image-preview',
      videoEndpointSlug: 'aicso-veo-fast-4k',
    },
  });
  if (aicsoConfigured) {
    console.log('[smoke] aicso provider configured');
  }

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
      creationConfig: {
        selectedTab: '短剧漫剧',
        selectedSubtype: '对话剧情',
        scriptSourceName: 'smoke-script.md',
        scriptContent: '# Smoke Script\n\n机械猫在雨夜城市中寻找失落的记忆。',
        imageModelEndpointSlug: 'proxy-seko-image-v1',
        subjectProfileSlug: 'little-fox',
        stylePresetSlug: 'cinematic',
        settings: {
          multiEpisode: false,
        },
      },
    }),
  });
  console.log(`[smoke] project created: ${createdProject.data.projectId}`);

  await request('/api/explore/subjects?scope=all', { cookie });
  console.log('[smoke] explore subjects ok');

  await request('/api/explore/styles?scope=all', { cookie });
  console.log('[smoke] explore styles ok');

  const project = await request<{
    id: string;
    currentEpisodeId: string | null;
    creationConfig: {
      selectedTab: string;
      selectedSubtype: string | null;
      scriptSourceName: string | null;
      hasScriptContent: boolean;
      imageModelEndpoint: { slug: string } | null;
      subjectProfile: { slug: string } | null;
      stylePreset: { slug: string } | null;
      settings: Record<string, unknown> | null;
    } | null;
    episodes: Array<{ id: string; episodeNo: number; title: string; status: string }>;
  }>(`/api/studio/projects/${createdProject.data.projectId}`, { cookie });
  console.log('[smoke] project detail ok');

  if (
    project.data.creationConfig?.imageModelEndpoint?.slug !== 'proxy-seko-image-v1'
    || project.data.creationConfig?.subjectProfile?.slug !== 'little-fox'
    || project.data.creationConfig?.stylePreset?.slug !== 'cinematic'
    || project.data.creationConfig?.selectedSubtype !== '对话剧情'
    || project.data.creationConfig?.hasScriptContent !== true
  ) {
    throw new Error('Project creation config snapshot was not persisted correctly.');
  }
  console.log('[smoke] project creation config persisted');

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

  await request('/api/model-endpoints?familySlug=doubao-text', { cookie });
  console.log('[smoke] text model endpoints ok');

  await request('/api/planner/agent-profiles?contentType=短剧漫剧', { cookie });
  console.log('[smoke] planner agent profiles ok');

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

  const outlineRun = await request<{ targetStage: string; run: { id: string; status: string } }>(
    `/api/projects/${createdProject.data.projectId}/planner/generate-doc`,
    {
      method: 'POST',
      cookie,
      body: JSON.stringify({
        episodeId,
        prompt: '请为这个机械猫雨夜短片生成一份三段式策划文档，包含故事梗概、视觉风格和分镜方向。',
        idempotencyKey: `smoke-planner-${Date.now()}`,
      }),
    },
  );
  console.log(`[smoke] outline run created: ${outlineRun.data.run.id}`);

  const outlineProcessed = await processUntilMatch(
    (processed) => !!processed && processed.runId === outlineRun.data.run.id && processed.action === 'processed',
    20,
  );
  if (!outlineProcessed) {
    throw new Error('Worker did not complete the outline run.');
  }
  console.log('[smoke] outline worker completed run');

  const outlineRunDetail = await request<{ status: string; output: { generatedText?: string; outlineDoc?: Record<string, unknown> } | null }>(
    `/api/runs/${outlineRun.data.run.id}`,
    { cookie },
  );
  if (outlineRunDetail.data.status !== 'completed' || !outlineRunDetail.data.output?.generatedText || !outlineRunDetail.data.output?.outlineDoc) {
    throw new Error('Expected outline run to complete with generated text and outline doc.');
  }
  console.log('[smoke] outline run completed ok');

  const plannerWorkspaceAfterRun = await request<{
    plannerSession: { status: string; outlineConfirmedAt: string | null; stage?: string } | null;
    latestPlannerRun: { generatedText: string | null } | null;
    messages: Array<{ role: string; messageType: string }>;
    activeOutline: { id: string; outlineDoc: Record<string, unknown> | null } | null;
    outlineVersions: Array<{ id: string }>;
    activeRefinement: { structuredDoc: Record<string, unknown> | null; subAgentProfile: { subtype: string } | null } | null;
  }>(
    `/api/projects/${createdProject.data.projectId}/planner/workspace?episodeId=${episodeId}`,
    { cookie },
  );
  if (
    plannerWorkspaceAfterRun.data.plannerSession?.status !== 'ready'
    || plannerWorkspaceAfterRun.data.plannerSession?.outlineConfirmedAt !== null
    || plannerWorkspaceAfterRun.data.plannerSession?.stage !== 'outline'
    || !plannerWorkspaceAfterRun.data.latestPlannerRun?.generatedText
    || !plannerWorkspaceAfterRun.data.activeOutline?.outlineDoc
    || plannerWorkspaceAfterRun.data.activeRefinement
    || plannerWorkspaceAfterRun.data.messages.length < 3
  ) {
    throw new Error('Planner workspace did not reflect generated outline.');
  }
  console.log('[smoke] planner workspace reflects generated outline');

  const revisedOutlineRun = await request<{ targetStage: string; run: { id: string; status: string } }>(
    `/api/projects/${createdProject.data.projectId}/planner/generate-doc`,
    {
      method: 'POST',
      cookie,
      body: JSON.stringify({
        episodeId,
        prompt: '保持雨夜机械猫主题，但大纲改成双主角并增强追逐感。',
        idempotencyKey: `smoke-planner-outline-update-${Date.now()}`,
      }),
    },
  );
  if (revisedOutlineRun.data.targetStage !== 'outline') {
    throw new Error(`Expected second planner stage to remain outline, got ${revisedOutlineRun.data.targetStage}.`);
  }
  console.log(`[smoke] outline update run created: ${revisedOutlineRun.data.run.id}`);

  const revisedOutlineProcessed = await processUntilMatch(
    (processed) => !!processed && processed.runId === revisedOutlineRun.data.run.id && processed.action === 'processed',
    20,
  );
  if (!revisedOutlineProcessed) {
    throw new Error('Worker did not complete the revised outline run.');
  }
  console.log('[smoke] outline update worker completed run');

  const revisedOutlineWorkspace = await request<{
    plannerSession: { status: string; outlineConfirmedAt: string | null; stage?: string } | null;
    activeOutline: { id: string; outlineDoc: Record<string, unknown> | null } | null;
    outlineVersions: Array<{ id: string }>;
    activeRefinement: { structuredDoc: Record<string, unknown> | null } | null;
  }>(`/api/projects/${createdProject.data.projectId}/planner/workspace?episodeId=${episodeId}`, { cookie });
  if (
    revisedOutlineWorkspace.data.plannerSession?.stage !== 'outline'
    || revisedOutlineWorkspace.data.plannerSession?.outlineConfirmedAt !== null
    || !revisedOutlineWorkspace.data.activeOutline?.outlineDoc
    || revisedOutlineWorkspace.data.outlineVersions.length < 2
    || revisedOutlineWorkspace.data.activeRefinement
  ) {
    throw new Error('Planner outline update did not remain in outline stage.');
  }
  console.log('[smoke] outline update remains in outline stage');

  await request<{ outlineVersionId: string; isConfirmed: boolean; confirmedAt: string | null }>(
    `/api/projects/${createdProject.data.projectId}/planner/outline-versions/${revisedOutlineWorkspace.data.activeOutline.id}/confirm`,
    {
      method: 'POST',
      cookie,
      body: JSON.stringify({
        episodeId,
      }),
    },
  );
  console.log('[smoke] outline confirm ok');

  const refinementRun = await request<{ targetStage: string; run: { id: string; status: string } }>(
    `/api/projects/${createdProject.data.projectId}/planner/generate-doc`,
    {
      method: 'POST',
      cookie,
      body: JSON.stringify({
        episodeId,
        prompt: '开始细化剧情内容，并输出主体、场景和3个分镜。',
        idempotencyKey: `smoke-planner-refinement-${Date.now()}`,
      }),
    },
  );
  console.log(`[smoke] refinement run created: ${refinementRun.data.run.id}`);

  const refinementProcessed = await processUntilMatch(
    (processed) => !!processed && processed.runId === refinementRun.data.run.id && processed.action === 'processed',
    20,
  );
  if (!refinementProcessed) {
    throw new Error('Worker did not complete the refinement run.');
  }
  console.log('[smoke] refinement worker completed run');

  const refinementWorkspace = await request<{
    plannerSession: { status: string; outlineConfirmedAt: string | null; stage?: string } | null;
    activeRefinement: { structuredDoc: Record<string, unknown> | null; subAgentProfile: { subtype: string } | null } | null;
    subjects: Array<{ id: string; name: string }>;
    scenes: Array<{ id: string; name: string }>;
    shotScripts: Array<{ id: string; title: string }>;
  }>(
    `/api/projects/${createdProject.data.projectId}/planner/workspace?episodeId=${episodeId}`,
    { cookie },
  );
  if (
    !refinementWorkspace.data.plannerSession?.outlineConfirmedAt
    || refinementWorkspace.data.plannerSession?.stage !== 'refinement'
    || !refinementWorkspace.data.activeRefinement?.structuredDoc
    || refinementWorkspace.data.activeRefinement.subAgentProfile?.subtype !== '对话剧情'
    || refinementWorkspace.data.subjects.length === 0
    || refinementWorkspace.data.scenes.length === 0
    || refinementWorkspace.data.shotScripts.length === 0
  ) {
    throw new Error('Planner refinement did not become active after outline confirmation.');
  }
  console.log('[smoke] refinement workspace reflects generated doc');

  const firstSubject = refinementWorkspace.data.subjects[0];
  const firstScene = refinementWorkspace.data.scenes[0];
  const firstShotScript = refinementWorkspace.data.shotScripts[0];

  await request(`/api/projects/${createdProject.data.projectId}/planner/subjects/${firstSubject.id}`, {
    method: 'PATCH',
    cookie,
    body: JSON.stringify({
      episodeId,
      name: `${firstSubject.name}-修订`,
      appearance: '更新后的主体外观描述',
      prompt: '更新后的主体提示词',
    }),
  });

  await request(`/api/projects/${createdProject.data.projectId}/planner/scenes/${firstScene.id}`, {
    method: 'PATCH',
    cookie,
    body: JSON.stringify({
      episodeId,
      name: `${firstScene.name}-修订`,
      description: '更新后的场景描述',
      prompt: '更新后的场景提示词',
    }),
  });

  await request(`/api/projects/${createdProject.data.projectId}/planner/shot-scripts/${firstShotScript.id}`, {
    method: 'PATCH',
    cookie,
    body: JSON.stringify({
      episodeId,
      visualDescription: '更新后的分镜画面描述',
      composition: '更新后的分镜构图',
      cameraMotion: '更新后的分镜运镜',
      dialogue: '更新后的分镜台词',
    }),
  });

  const plannerWorkspaceAfterEntityUpdates = await request<{
    subjects: Array<{ id: string; name: string; prompt: string }>;
    scenes: Array<{ id: string; name: string; description: string }>;
    shotScripts: Array<{ id: string; visualDescription: string; composition: string; cameraMotion: string; dialogue: string }>;
    activeRefinement: { structuredDoc: { subjects: Array<{ title: string; prompt: string }>; scenes: Array<{ title: string; prompt: string }>; acts: Array<{ shots: Array<{ visual: string; composition: string; motion: string; line: string }> }> } | null } | null;
  }>(`/api/projects/${createdProject.data.projectId}/planner/workspace?episodeId=${episodeId}`, { cookie });

  if (
    plannerWorkspaceAfterEntityUpdates.data.subjects[0]?.name !== `${firstSubject.name}-修订`
    || plannerWorkspaceAfterEntityUpdates.data.scenes[0]?.name !== `${firstScene.name}-修订`
    || plannerWorkspaceAfterEntityUpdates.data.shotScripts[0]?.visualDescription !== '更新后的分镜画面描述'
    || plannerWorkspaceAfterEntityUpdates.data.activeRefinement?.structuredDoc?.subjects[0]?.title !== `${firstSubject.name}-修订`
  ) {
    throw new Error('Planner entity-level updates were not reflected in workspace.');
  }
  console.log('[smoke] planner entity updates reflected in workspace');

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

  const publishSubmit = await request<{ run: { id: string; status: string } }>(
    `/api/projects/${createdProject.data.projectId}/publish/submit`,
    {
      method: 'POST',
      cookie,
      body: JSON.stringify({
        episodeId,
        title: '机械猫雨夜纪行',
        intro: '一支关于机械猫在雨夜城市中观察、回望与移动的短片。',
        script: '围绕机械猫、雨夜、霓虹与城市空间展开。',
        tag: 'RainCity',
      }),
    },
  );
  if (publishSubmit.data.run.status !== 'completed') {
    throw new Error('Expected publish submit run to complete immediately.');
  }
  console.log('[smoke] publish submit ok');
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
