import { ArkApiError } from './ark-client.js';
import { fetchProviderConfigItem } from './provider-config-query-service.js';
import { parseProviderConfigOptions } from './provider-config-options.js';
import { prisma } from './prisma.js';
import {
  queryVideoGenerationTask,
  submitAudioGeneration,
  submitImageGeneration,
  submitTextGeneration,
  submitVideoGeneration,
  supportsProviderGatewayCapability,
} from './provider-gateway.js';
import type { ProviderConfigServiceResult } from './provider-config-service-types.js';

function readString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function findStringDeep(value: unknown, keys: string[]): string | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const direct = readString(record[key]);
    if (direct) {
      return direct;
    }
  }

  for (const nested of Object.values(record)) {
    const found = findStringDeep(nested, keys);
    if (found) {
      return found;
    }
  }

  return null;
}

function needsVideoReferenceImage(remoteModelKey: string) {
  return /(^|[-_])i2v([-_]|$)/i.test(remoteModelKey);
}

function pickTestEndpoint(args: {
  providerCode: string;
  requestedKind?: 'text' | 'image' | 'video' | 'audio';
  endpoints: Array<{
    id: string;
    slug: string;
    label: string;
    modelKind: string;
    familySlug: string;
    isDefault: boolean;
    remoteModelKey: string;
  }>;
  defaults: {
    textEndpointSlug: string | null;
    imageEndpointSlug: string | null;
    videoEndpointSlug: string | null;
    audioEndpointSlug: string | null;
  };
}) {
  const bySlug = new Map(args.endpoints.map((endpoint) => [endpoint.slug, endpoint]));
  const candidates = args.requestedKind
    ? args.endpoints.filter((endpoint) => endpoint.modelKind === args.requestedKind)
    : args.endpoints;
  const requested = [
    args.requestedKind === 'text'
      ? args.defaults.textEndpointSlug
      : args.requestedKind === 'image'
        ? args.defaults.imageEndpointSlug
        : args.requestedKind === 'video'
          ? args.defaults.videoEndpointSlug
          : args.requestedKind === 'audio'
            ? args.defaults.audioEndpointSlug
            : args.defaults.textEndpointSlug,
  ]
    .filter((value): value is string => !!value)
    .map((slug) => bySlug.get(slug))
    .filter((value): value is NonNullable<typeof value> => !!value);

  if (requested.length > 0) {
    return requested[0];
  }

  if (args.requestedKind) {
    return candidates[0] ?? null;
  }

  if (args.providerCode === 'platou') {
    return (
      args.endpoints.find((endpoint) => endpoint.modelKind === 'video')
      ?? args.endpoints.find((endpoint) => endpoint.modelKind === 'image')
      ?? args.endpoints.find((endpoint) => endpoint.modelKind === 'text')
      ?? null
    );
  }

  return args.endpoints[0] ?? null;
}

function getProviderTestError(error: unknown) {
  if (error instanceof ArkApiError && error.code === 'ModelNotOpen') {
    return {
      code: 'PROVIDER_MODEL_NOT_OPEN',
      message: error.message,
    } as const;
  }

  return {
    code: 'PROVIDER_TEST_FAILED',
    message: error instanceof Error ? error.message : 'Provider test failed.',
  } as const;
}

async function runProviderConnectivityTest(args: {
  userId: string;
  providerCode: string;
  baseUrl: string;
  apiKey: string;
  modelKind: string;
  remoteModelKey: string;
  modelEndpointId?: string;
  modelProviderId?: string;
}) {
  const kind = args.modelKind.toLowerCase();
  const hookMetadata = {
    traceId: `provider-test:${args.userId}:${args.providerCode}:${kind}`,
    userId: args.userId,
    resourceType: 'provider_config_test',
    modelProviderId: args.modelProviderId,
    modelEndpointId: args.modelEndpointId,
  } as const;

  if (kind === 'text') {
    if (!supportsProviderGatewayCapability(args.providerCode, 'text')) {
      throw new Error(`Provider ${args.providerCode} does not support text testing yet.`);
    }
    await submitTextGeneration({
      providerCode: args.providerCode,
      baseUrl: args.baseUrl,
      apiKey: args.apiKey,
      model: args.remoteModelKey,
      prompt: args.providerCode === 'ark' ? '请只返回 ok' : 'reply with ok',
      hookMetadata,
    });
    return;
  }

  if (kind === 'image') {
    if (!supportsProviderGatewayCapability(args.providerCode, 'image')) {
      throw new Error(`Provider ${args.providerCode} does not support image testing yet.`);
    }
    await submitImageGeneration({
      providerCode: args.providerCode,
      baseUrl: args.baseUrl,
      apiKey: args.apiKey,
      model: args.remoteModelKey,
      prompt: 'A clean minimal test image.',
      hookMetadata,
    });
    return;
  }

  if (kind === 'video') {
    if (!supportsProviderGatewayCapability(args.providerCode, 'video')) {
      throw new Error(`Provider ${args.providerCode} does not support video testing yet.`);
    }
    const created = await submitVideoGeneration({
      providerCode: args.providerCode,
      baseUrl: args.baseUrl,
      apiKey: args.apiKey,
      model: args.remoteModelKey,
      prompt: 'A short simple test video of moving light.',
      images: needsVideoReferenceImage(args.remoteModelKey)
        ? ['https://ark-doc.tos-ap-southeast-1.bytepluses.com/doc_image/seedream4_imagesToimages_1.png']
        : undefined,
      hookMetadata,
    });
    const taskId = findStringDeep(created, ['task_id', 'id']);
    if (!taskId) {
      throw new Error(`${args.providerCode} video test did not return a task id.`);
    }
    await queryVideoGenerationTask({
      providerCode: args.providerCode,
      baseUrl: args.baseUrl,
      apiKey: args.apiKey,
      taskId,
      hookMetadata,
    });
    return;
  }

  if (kind === 'audio') {
    if (!supportsProviderGatewayCapability(args.providerCode, 'audio')) {
      throw new Error(`Provider ${args.providerCode} does not support audio testing yet.`);
    }
    const audio = await submitAudioGeneration({
      providerCode: args.providerCode,
      baseUrl: args.baseUrl,
      apiKey: args.apiKey,
      model: args.remoteModelKey,
      prompt: args.providerCode === 'ark' ? '请只读出：ok。' : 'Say ok.',
      hookMetadata,
    });
    if (!audio.buffer.byteLength) {
      throw new Error(`${args.providerCode} audio test returned empty audio content.`);
    }
    return;
  }

  throw new Error(`Unsupported provider test kind: ${args.modelKind}`);
}

export async function testProviderConfigForUser(args: {
  providerCode: string;
  userId: string;
  testKind?: 'text' | 'image' | 'video' | 'audio';
}): Promise<ProviderConfigServiceResult<Awaited<ReturnType<typeof fetchProviderConfigItem>>>> {
  const provider = await prisma.modelProvider.findUnique({
    where: { code: args.providerCode },
    include: {
      endpoints: {
        where: { status: 'ACTIVE' },
        include: {
          family: {
            select: {
              slug: true,
              modelKind: true,
            },
          },
        },
        orderBy: [{ family: { modelKind: 'asc' } }, { priority: 'asc' }, { createdAt: 'asc' }],
      },
      userConfigs: {
        where: { userId: args.userId },
        take: 1,
      },
    },
  });

  if (!provider) {
    return {
      ok: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Provider not found.',
      },
    };
  }

  const config = provider.userConfigs[0] ?? null;
  if (!config?.enabled || !config.apiKey) {
    await prisma.userProviderConfig.updateMany({
      where: {
        userId: args.userId,
        providerId: provider.id,
      },
      data: {
        lastTestStatus: 'failed',
        lastTestMessage: 'This provider is not configured for the current user.',
        lastTestAt: new Date(),
        lastTestEndpointSlug: null,
      },
    });
    return {
      ok: false,
      error: {
        code: 'PROVIDER_NOT_CONFIGURED',
        message: 'This provider is not configured for the current user.',
        data: await fetchProviderConfigItem(provider.code, args.userId),
      },
    };
  }

  const defaults = parseProviderConfigOptions(config.optionsJson).defaults;
  const endpoints = provider.endpoints.map((endpoint) => ({
    id: endpoint.id,
    slug: endpoint.slug,
    label: endpoint.label,
    modelKind: endpoint.family.modelKind.toLowerCase(),
    familySlug: endpoint.family.slug,
    isDefault: endpoint.isDefault,
    remoteModelKey: endpoint.remoteModelKey,
  }));

  const testEndpoint = pickTestEndpoint({
    providerCode: provider.code,
    requestedKind: args.testKind,
    endpoints,
    defaults,
  });

  if (!testEndpoint) {
    return {
      ok: false,
      error: {
        code: 'ENDPOINT_NOT_FOUND',
        message: 'No active endpoint is available to test for this provider.',
      },
    };
  }

  const baseUrl = config.baseUrlOverride ?? provider.baseUrl;
  if (!baseUrl) {
    await prisma.userProviderConfig.updateMany({
      where: {
        userId: args.userId,
        providerId: provider.id,
      },
      data: {
        lastTestStatus: 'failed',
        lastTestMessage: 'This provider requires a base URL to be configured.',
        lastTestAt: new Date(),
        lastTestEndpointSlug: testEndpoint.slug,
      },
    });
    return {
      ok: false,
      error: {
        code: 'BASE_URL_REQUIRED',
        message: 'This provider requires a base URL to be configured.',
        data: await fetchProviderConfigItem(provider.code, args.userId),
      },
    };
  }

  try {
    await runProviderConnectivityTest({
      userId: args.userId,
      providerCode: provider.code,
      baseUrl,
      apiKey: config.apiKey,
      modelKind: testEndpoint.modelKind,
      remoteModelKey: testEndpoint.remoteModelKey,
      modelEndpointId: testEndpoint.id,
      modelProviderId: provider.id,
    });
  } catch (error) {
    const providerError = getProviderTestError(error);
    await prisma.userProviderConfig.updateMany({
      where: {
        userId: args.userId,
        providerId: provider.id,
      },
      data: {
        lastTestStatus: 'failed',
        lastTestMessage: providerError.message,
        lastTestAt: new Date(),
        lastTestEndpointSlug: testEndpoint.slug,
      },
    });
    return {
      ok: false,
      error: {
        code: providerError.code,
        message: providerError.message,
        data: await fetchProviderConfigItem(provider.code, args.userId),
      },
    };
  }

  await prisma.userProviderConfig.updateMany({
    where: {
      userId: args.userId,
      providerId: provider.id,
    },
    data: {
      lastTestStatus: 'passed',
      lastTestMessage: 'Provider connectivity test succeeded.',
      lastTestAt: new Date(),
      lastTestEndpointSlug: testEndpoint.slug,
    },
  });

  return {
    ok: true,
    data: await fetchProviderConfigItem(provider.code, args.userId),
  };
}

export const __testables = {
  needsVideoReferenceImage,
  pickTestEndpoint,
  getProviderTestError,
};
