import { prisma } from '../src/lib/prisma.js';

async function upsertFamily(
  slug: string,
  name: string,
  modelKind: 'IMAGE' | 'VIDEO' | 'TEXT' | 'AUDIO' | 'LIPSYNC',
  capabilityJson: Record<string, unknown>,
) {
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
  const doubaoText = await upsertFamily('doubao-text', 'Doubao Text', 'TEXT', {
    provider: 'ark',
    model: 'doubao-seed-1-8-251228',
    modalities: ['text'],
  });
  await upsertFamily('ark-seedream-image', 'ARK Seedream Image', 'IMAGE', {
    provider: 'ark',
    model: 'seedream-2.0',
    modalities: ['image'],
    aspectRatios: ['1:1', '9:16', '16:9'],
    integrationStatus: 'planned',
  });
  await upsertFamily('ark-seedance-2-video', 'ARK Seedance 2.0 Video', 'VIDEO', {
    provider: 'ark',
    model: 'seedance-2.0',
    modalities: ['video', 'audio'],
    aspectRatios: ['9:16', '16:9', '1:1'],
    durations: [4, 6, 8],
    supportsMultiShot: true,
    maxShotsPerGeneration: 6,
    promptStyle: 'narrative',
    audioDescStyle: 'inline',
    cameraVocab: 'chinese',
    integrationStatus: 'planned',
  });
  await upsertFamily('ark-audio-generation', 'ARK Audio Generation', 'AUDIO', {
    provider: 'ark',
    modalities: ['audio'],
    integrationStatus: 'planned',
  });
  const platouChat = await upsertFamily('platou-google-chat', 'Platou Google Chat', 'TEXT', {
    provider: 'platou',
    model: 'gemini-3.1-flash-lite-preview',
    modalities: ['text'],
  });
  const platouImage = await upsertFamily('platou-nano-banana', 'Platou Nano Banana', 'IMAGE', {
    provider: 'platou',
    model: 'nano-banana-2',
    aspectRatios: ['1:1', '9:16', '16:9'],
  });
  const platouGeminiImage = await upsertFamily('platou-gemini-image', 'Platou Gemini Image', 'IMAGE', {
    provider: 'platou',
    model: 'gemini-3.1-flash-image-preview',
    aspectRatios: ['1:1', '9:16', '16:9'],
  });
  const platouVeo = await upsertFamily('platou-veo-video', 'Platou Veo Video', 'VIDEO', {
    provider: 'platou',
    model: 'veo3.1',
    durations: [4, 6, 8],
    aspectRatios: ['9:16', '16:9', '1:1'],
  });

  const officialSeko = await upsertProvider('official-seko', 'Seko Official', 'OFFICIAL', 'https://api.seko.local');
  const proxyA = await upsertProvider('proxy-hub-a', 'Proxy Hub A', 'PROXY', 'https://proxy-hub-a.local');
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
    slug: 'platou-gemini-3-1-flash-lite-preview',
    familyId: platouChat.id,
    providerId: platou.id,
    remoteModelKey: 'gemini-3.1-flash-lite-preview',
    label: 'Gemini 3.1 Flash Lite Preview',
    priority: 10,
    isDefault: true,
    defaultParamsJson: {},
  });

  await upsertEndpoint({
    slug: 'platou-gemini-3-1-flash-image-preview',
    familyId: platouGeminiImage.id,
    providerId: platou.id,
    remoteModelKey: 'gemini-3.1-flash-image-preview',
    label: 'Gemini 3.1 Flash Image Preview',
    priority: 5,
    isDefault: true,
    defaultParamsJson: {
      aspectRatio: '9:16',
    },
  });

  await upsertEndpoint({
    slug: 'platou-nano-banana',
    familyId: platouImage.id,
    providerId: platou.id,
    remoteModelKey: 'nano-banana-2',
    label: 'Nano Banana 2',
    priority: 15,
    isDefault: false,
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
    slug: 'platou-veo-3-1',
    familyId: platouVeo.id,
    providerId: platou.id,
    remoteModelKey: 'veo3.1',
    label: 'Veo 3.1',
    priority: 10,
    isDefault: true,
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
    priority: 20,
    isDefault: false,
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
    priority: 30,
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
    priority: 40,
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
