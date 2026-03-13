import { prisma } from '../src/lib/prisma.js';

async function upsertFamily(slug: string, name: string, modelKind: 'IMAGE' | 'VIDEO', capabilityJson: Record<string, unknown>) {
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

  const officialSeko = await upsertProvider('official-seko', 'Seko Official', 'OFFICIAL', 'https://api.seko.local');
  const proxyA = await upsertProvider('proxy-hub-a', 'Proxy Hub A', 'PROXY', 'https://proxy-hub-a.local');

  await upsertEndpoint({
    slug: 'official-seko-image-v1',
    familyId: sekoImage.id,
    providerId: officialSeko.id,
    remoteModelKey: 'seko-image-v1',
    label: 'Seko Image V1',
    priority: 10,
    isDefault: true,
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
    priority: 20,
    isDefault: false,
    defaultParamsJson: {
      aspectRatio: '2:3',
    },
  });

  await upsertEndpoint({
    slug: 'official-seko-video-v1',
    familyId: sekoVideo.id,
    providerId: officialSeko.id,
    remoteModelKey: 'seko-video-v1',
    label: 'Seko Video V1',
    priority: 10,
    isDefault: true,
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
    priority: 20,
    isDefault: false,
    defaultParamsJson: {
      durationSeconds: 4,
      aspectRatio: '9:16',
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
