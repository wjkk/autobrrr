import { prisma } from '../src/lib/prisma.js';

async function upsertFamily(slug: string, name: string, modelKind: 'IMAGE' | 'VIDEO' | 'TEXT', capabilityJson: Record<string, unknown>) {
  return prisma.modelFamily.upsert({
    where: { slug },
    update: {
      name,
      modelKind,
      capabilityJson,
    },
    create: {
      slug,
      name,
      modelKind,
      capabilityJson,
    },
  });
}

async function upsertProvider(code: string, name: string, providerType: 'OFFICIAL' | 'PROXY' | 'INTERNAL', baseUrl: string) {
  return prisma.modelProvider.upsert({
    where: { code },
    update: {
      name,
      providerType,
      baseUrl,
      enabled: true,
    },
    create: {
      code,
      name,
      providerType,
      baseUrl,
      enabled: true,
    },
  });
}

async function upsertEndpoint(args: {
  slug: string;
  familyId: string;
  providerId: string;
  remoteModelKey: string;
  label: string;
  priority: number;
  isDefault: boolean;
  defaultParamsJson: Record<string, unknown>;
}) {
  return prisma.modelEndpoint.upsert({
    where: { slug: args.slug },
    update: {
      familyId: args.familyId,
      providerId: args.providerId,
      remoteModelKey: args.remoteModelKey,
      label: args.label,
      status: 'ACTIVE',
      priority: args.priority,
      isDefault: args.isDefault,
      defaultParamsJson: args.defaultParamsJson,
    },
    create: {
      slug: args.slug,
      familyId: args.familyId,
      providerId: args.providerId,
      remoteModelKey: args.remoteModelKey,
      label: args.label,
      status: 'ACTIVE',
      priority: args.priority,
      isDefault: args.isDefault,
      defaultParamsJson: args.defaultParamsJson,
    },
  });
}

async function main() {
  const sekoImage = await upsertFamily('seko-image', 'Seko Image', 'IMAGE', {
    aspectRatios: ['1:1', '2:3', '3:4'],
  });
  const sekoVideo = await upsertFamily('seko-video', 'Seko Video', 'VIDEO', {
    durations: [4, 6, 8],
  });
  const geminiImage = await upsertFamily('gemini-image', 'Gemini Image', 'IMAGE', {
    provider: 'aicso',
    model: 'gemini-3.1-flash-image-preview',
    aspectRatios: ['1:1', '9:16', '16:9'],
  });
  const deepseekText = await upsertFamily('deepseek-text', 'DeepSeek Text', 'TEXT', {
    provider: 'aicso',
    model: 'deepseek-v3',
    modalities: ['text'],
  });
  const doubaoText = await upsertFamily('doubao-text', 'Doubao Text', 'TEXT', {
    provider: 'ark',
    model: 'doubao-seed-1-8-251228',
    modalities: ['text'],
  });
  const veoVideo = await upsertFamily('veo-video', 'Veo Video', 'VIDEO', {
    provider: 'aicso',
    model: 'veo_3_1-fast-4K',
    durations: [4, 6, 8],
    aspectRatios: ['9:16', '16:9', '1:1'],
  });
  const platouChat = await upsertFamily('platou-google-chat', 'Platou Google Chat', 'TEXT', {
    provider: 'platou',
    model: 'gemini-2.5-flash',
    modalities: ['text'],
  });
  const platouImage = await upsertFamily('platou-nano-banana', 'Platou Nano Banana', 'IMAGE', {
    provider: 'platou',
    model: 'nano-banana',
    aspectRatios: ['1:1', '9:16', '16:9'],
  });
  const platouVeo = await upsertFamily('platou-veo-video', 'Platou Veo Video', 'VIDEO', {
    provider: 'platou',
    model: 'veo3.1-fast',
    durations: [4, 6, 8],
    aspectRatios: ['9:16', '16:9', '1:1'],
  });

  const officialSeko = await upsertProvider('official-seko', 'Seko Official', 'OFFICIAL', 'https://api.seko.local');
  const proxyA = await upsertProvider('proxy-hub-a', 'Proxy Hub A', 'PROXY', 'https://proxy-hub-a.local');
  const aicso = await upsertProvider('aicso', 'AICSO', 'PROXY', 'https://api.aicso.top');
  const ark = await upsertProvider('ark', 'Volcengine Ark', 'OFFICIAL', 'https://ark.cn-beijing.volces.com/api/v3');
  const platou = await upsertProvider('platou', 'Platou', 'PROXY', 'https://api.bltcy.ai');

  await upsertEndpoint({
    slug: 'official-seko-image-v1',
    familyId: sekoImage.id,
    providerId: officialSeko.id,
    remoteModelKey: 'seko-image-v1',
    label: 'Seko Image V1',
    priority: 20,
    isDefault: false,
    defaultParamsJson: {
      aspectRatio: '2:3',
    },
  });

  await upsertEndpoint({
    slug: 'proxy-seko-image-v1',
    familyId: sekoImage.id,
    providerId: proxyA.id,
    remoteModelKey: 'proxy/seko-image-v1',
    label: 'Seko Image V1 Proxy',
    priority: 30,
    isDefault: false,
    defaultParamsJson: {
      aspectRatio: '2:3',
    },
  });

  await upsertEndpoint({
    slug: 'aicso-gemini-image-preview',
    familyId: geminiImage.id,
    providerId: aicso.id,
    remoteModelKey: 'gemini-3.1-flash-image-preview',
    label: 'Gemini 3.1 Flash Image Preview',
    priority: 5,
    isDefault: true,
    defaultParamsJson: {
      aspectRatio: '9:16',
    },
  });

  await upsertEndpoint({
    slug: 'aicso-deepseek-v3',
    familyId: deepseekText.id,
    providerId: aicso.id,
    remoteModelKey: 'deepseek-v3',
    label: 'DeepSeek V3',
    priority: 12,
    isDefault: false,
    defaultParamsJson: {},
  });

  await upsertEndpoint({
    slug: 'platou-gemini-2-5-flash',
    familyId: platouChat.id,
    providerId: platou.id,
    remoteModelKey: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    priority: 10,
    isDefault: true,
    defaultParamsJson: {},
  });

  await upsertEndpoint({
    slug: 'platou-nano-banana',
    familyId: platouImage.id,
    providerId: platou.id,
    remoteModelKey: 'nano-banana',
    label: 'Nano Banana',
    priority: 10,
    isDefault: true,
    defaultParamsJson: {
      aspectRatio: '9:16',
    },
  });

  await upsertEndpoint({
    slug: 'ark-doubao-seed-1-8-251228',
    familyId: doubaoText.id,
    providerId: ark.id,
    remoteModelKey: 'doubao-seed-1-8-251228',
    label: 'Doubao Seed 1.8',
    priority: 5,
    isDefault: true,
    defaultParamsJson: {},
  });

  await upsertEndpoint({
    slug: 'official-seko-video-v1',
    familyId: sekoVideo.id,
    providerId: officialSeko.id,
    remoteModelKey: 'seko-video-v1',
    label: 'Seko Video V1',
    priority: 20,
    isDefault: false,
    defaultParamsJson: {
      durationSeconds: 4,
      aspectRatio: '9:16',
    },
  });

  await upsertEndpoint({
    slug: 'proxy-seko-video-v1',
    familyId: sekoVideo.id,
    providerId: proxyA.id,
    remoteModelKey: 'proxy/seko-video-v1',
    label: 'Seko Video V1 Proxy',
    priority: 30,
    isDefault: false,
    defaultParamsJson: {
      durationSeconds: 4,
      aspectRatio: '9:16',
    },
  });

  await upsertEndpoint({
    slug: 'aicso-veo-fast-4k',
    familyId: veoVideo.id,
    providerId: aicso.id,
    remoteModelKey: 'veo_3_1-fast-4K',
    label: 'Veo 3.1 Fast 4K',
    priority: 5,
    isDefault: true,
    defaultParamsJson: {
      durationSeconds: 4,
      aspectRatio: '9:16',
      resolution: '1080p',
    },
  });

  await upsertEndpoint({
    slug: 'aicso-veo-fast-components',
    familyId: veoVideo.id,
    providerId: aicso.id,
    remoteModelKey: 'veo3.1-fast-components',
    label: 'Veo 3.1 Fast Components',
    priority: 15,
    isDefault: false,
    defaultParamsJson: {
      durationSeconds: 4,
      aspectRatio: '9:16',
      resolution: '1080p',
    },
  });

  await upsertEndpoint({
    slug: 'platou-veo-fast',
    familyId: platouVeo.id,
    providerId: platou.id,
    remoteModelKey: 'veo3.1-fast',
    label: 'Veo 3.1 Fast',
    priority: 10,
    isDefault: true,
    defaultParamsJson: {
      durationSeconds: 4,
      aspectRatio: '9:16',
      resolution: '1080p',
    },
  });

  await upsertEndpoint({
    slug: 'platou-veo-pro-4k',
    familyId: platouVeo.id,
    providerId: platou.id,
    remoteModelKey: 'veo3.1-pro-4k',
    label: 'Veo 3.1 Pro 4K',
    priority: 20,
    isDefault: false,
    defaultParamsJson: {
      durationSeconds: 4,
      aspectRatio: '9:16',
      resolution: '1080p',
    },
  });

  await upsertEndpoint({
    slug: 'platou-veo-fast-components',
    familyId: platouVeo.id,
    providerId: platou.id,
    remoteModelKey: 'veo3.1-fast-components',
    label: 'Veo 3.1 Fast Components',
    priority: 30,
    isDefault: false,
    defaultParamsJson: {
      durationSeconds: 4,
      aspectRatio: '9:16',
      resolution: '1080p',
    },
  });

  console.log('[seed-model-registry] ok');
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    console.error(`[seed-model-registry] failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
