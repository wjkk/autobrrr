import { parseProviderConfigOptions } from './provider-config-options.js';

export const providerConfigUserSelect = {
  id: true,
  enabled: true,
  apiKey: true,
  baseUrlOverride: true,
  optionsJson: true,
  lastTestStatus: true,
  lastTestMessage: true,
  lastTestAt: true,
  lastTestEndpointSlug: true,
  updatedAt: true,
} as const;

export const providerEndpointInclude = {
  family: {
    select: {
      slug: true,
      modelKind: true,
    },
  },
} as const;

export const providerEndpointOrderBy = [{ family: { modelKind: 'asc' } }, { priority: 'asc' }, { createdAt: 'asc' }] as const;

function maskApiKey(apiKey: string | null | undefined) {
  if (!apiKey) {
    return null;
  }

  if (apiKey.length > 8) {
    return `${apiKey.slice(0, 4)}••••${apiKey.slice(-4)}`;
  }

  return '••••';
}

export function mapProviderEndpoints(endpoints: Array<{
  id: string;
  slug: string;
  label: string;
  isDefault: boolean;
  family: {
    slug: string;
    modelKind: string;
  };
}>) {
  return endpoints.map((endpoint) => ({
    id: endpoint.id,
    slug: endpoint.slug,
    label: endpoint.label,
    modelKind: endpoint.family.modelKind.toLowerCase(),
    familySlug: endpoint.family.slug,
    isDefault: endpoint.isDefault,
  }));
}

export function mapProviderConfig(args: {
  provider: {
    id: string;
    code: string;
    name: string;
    providerType: string;
    baseUrl: string | null;
    enabled: boolean;
  };
  endpoints?: Array<{
    id: string;
    slug: string;
    label: string;
    modelKind: string;
    familySlug: string;
    isDefault: boolean;
  }>;
  config?: {
    id: string;
    enabled: boolean;
    apiKey: string | null;
    baseUrlOverride: string | null;
    optionsJson: unknown;
    lastTestStatus?: string | null;
    lastTestMessage?: string | null;
    lastTestAt?: Date | null;
    lastTestEndpointSlug?: string | null;
    updatedAt: Date;
  } | null;
}) {
  const options = parseProviderConfigOptions(args.config?.optionsJson);

  return {
    provider: {
      id: args.provider.id,
      code: args.provider.code,
      name: args.provider.name,
      providerType: args.provider.providerType.toLowerCase(),
      baseUrl: args.provider.baseUrl,
      enabled: args.provider.enabled,
    },
    endpoints: (args.endpoints ?? []).map((endpoint) => ({
      id: endpoint.id,
      slug: endpoint.slug,
      label: endpoint.label,
      modelKind: endpoint.modelKind,
      familySlug: endpoint.familySlug,
      isDefault: endpoint.isDefault,
    })),
    userConfig: args.config
      ? {
          id: args.config.id,
          configured: !!args.config.apiKey,
          hasApiKey: !!args.config.apiKey,
          maskedApiKey: maskApiKey(args.config.apiKey),
          enabled: args.config.enabled,
          baseUrlOverride: args.config.baseUrlOverride,
          defaults: options.defaults,
          enabledModels: options.enabledModels,
          catalogSync: options.catalogSync,
          lastTest: {
            status: args.config.lastTestStatus ?? null,
            message: args.config.lastTestMessage ?? null,
            endpointSlug: args.config.lastTestEndpointSlug ?? null,
            testedAt: args.config.lastTestAt?.toISOString() ?? null,
          },
          updatedAt: args.config.updatedAt.toISOString(),
        }
      : {
          id: null,
          configured: false,
          hasApiKey: false,
          maskedApiKey: null,
          enabled: true,
          baseUrlOverride: null,
          defaults: {
            textEndpointSlug: null,
            imageEndpointSlug: null,
            videoEndpointSlug: null,
            audioEndpointSlug: null,
          },
          enabledModels: {
            textEndpointSlugs: [],
            imageEndpointSlugs: [],
            videoEndpointSlugs: [],
            audioEndpointSlugs: [],
          },
          catalogSync: {
            status: null,
            message: null,
            syncedAt: null,
            modelCount: null,
          },
          lastTest: {
            status: null,
            message: null,
            endpointSlug: null,
            testedAt: null,
          },
          updatedAt: null,
        },
  };
}
