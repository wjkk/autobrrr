import type { Run } from '@prisma/client';

import { readObject, readString } from './json-helpers.js';
import { prisma } from './prisma.js';

export interface ProviderRuntimeConfig {
  providerCode: string | null;
  baseUrl: string | null;
  apiKey: string | null;
  enabled: boolean;
  ownerUserId: string | null;
}

export function hasUsableProviderRuntimeConfig(config: ProviderRuntimeConfig) {
  return Boolean(config.enabled && config.apiKey && config.baseUrl);
}

type RuntimeProviderRecord = {
  id: string;
  code: string;
  baseUrl: string | null;
  enabled: boolean;
};

type RuntimeUserProviderConfigRecord = {
  apiKey: string | null;
  baseUrlOverride: string | null;
  enabled: boolean;
};

type RuntimeProjectOwnerRecord = {
  createdById: string;
};

type ResolveProviderRuntimeConfigForUserArgs = {
  userId: string;
  providerId: string;
  fallbackCode?: string | null;
  fallbackBaseUrl?: string | null;
};

async function resolveProviderRuntimeConfigForUserWithDeps(
  args: ResolveProviderRuntimeConfigForUserArgs,
  deps: {
    findProvider: (args: {
      where: { id: string };
      select: {
        id: true;
        code: true;
        baseUrl: true;
        enabled: true;
      };
    }) => Promise<RuntimeProviderRecord | null>;
    findUserProviderConfig: (args: {
      where: {
        userId_providerId: {
          userId: string;
          providerId: string;
        };
      };
      select: {
        apiKey: true;
        baseUrlOverride: true;
        enabled: true;
      };
    }) => Promise<RuntimeUserProviderConfigRecord | null>;
  },
) {
  const provider = await deps.findProvider({
    where: { id: args.providerId },
    select: {
      id: true,
      code: true,
      baseUrl: true,
      enabled: true,
    },
  });

  if (!provider) {
    return {
      providerCode: args.fallbackCode ?? null,
      baseUrl: args.fallbackBaseUrl ?? null,
      apiKey: null,
      enabled: true,
      ownerUserId: args.userId,
    } satisfies ProviderRuntimeConfig;
  }

  const userConfig = await deps.findUserProviderConfig({
    where: {
      userId_providerId: {
        userId: args.userId,
        providerId: provider.id,
      },
    },
    select: {
      apiKey: true,
      baseUrlOverride: true,
      enabled: true,
    },
  });

  return {
    providerCode: provider.code,
    baseUrl: userConfig?.baseUrlOverride ?? provider.baseUrl,
    apiKey: userConfig?.apiKey ?? null,
    enabled: userConfig?.enabled ?? provider.enabled,
    ownerUserId: args.userId,
  } satisfies ProviderRuntimeConfig;
}

export async function resolveProviderRuntimeConfigForUser(args: ResolveProviderRuntimeConfigForUserArgs) {
  return resolveProviderRuntimeConfigForUserWithDeps(args, {
    findProvider: prisma.modelProvider.findUnique.bind(prisma.modelProvider),
    findUserProviderConfig: prisma.userProviderConfig.findUnique.bind(prisma.userProviderConfig),
  });
}

async function resolveRunProviderRuntimeConfigWithDeps(
  run: Run,
  deps: {
    findProject: (args: {
      where: { id: string };
      select: { createdById: true };
    }) => Promise<RuntimeProjectOwnerRecord | null>;
    findProvider: (args: {
      where: { id: string };
      select: {
        id: true;
        code: true;
        baseUrl: true;
        enabled: true;
      };
    }) => Promise<RuntimeProviderRecord | null>;
    resolveProviderRuntimeConfigForUser: typeof resolveProviderRuntimeConfigForUser;
  },
): Promise<ProviderRuntimeConfig> {
  const input = readObject(run.inputJson);
  const modelProvider = readObject(input.modelProvider);
  const inputProviderCode = readString(modelProvider.code);
  const inputBaseUrl = readString(modelProvider.baseUrl);

  if (!run.projectId || !run.modelProviderId) {
    return {
      providerCode: inputProviderCode,
      baseUrl: inputBaseUrl,
      apiKey: null,
      enabled: true,
      ownerUserId: null,
    };
  }

  const [project, provider] = await Promise.all([
    deps.findProject({
      where: { id: run.projectId },
      select: { createdById: true },
    }),
    deps.findProvider({
      where: { id: run.modelProviderId },
      select: {
        id: true,
        code: true,
        baseUrl: true,
        enabled: true,
      },
    }),
  ]);

  if (!project || !provider) {
    return {
      providerCode: inputProviderCode,
      baseUrl: inputBaseUrl,
      apiKey: null,
      enabled: true,
      ownerUserId: project?.createdById ?? null,
    };
  }

  return deps.resolveProviderRuntimeConfigForUser({
    userId: project.createdById,
    providerId: provider.id,
    fallbackCode: inputProviderCode,
    fallbackBaseUrl: inputBaseUrl,
  });
}

export async function resolveRunProviderRuntimeConfig(run: Run): Promise<ProviderRuntimeConfig> {
  return resolveRunProviderRuntimeConfigWithDeps(run, {
    findProject: prisma.project.findUnique.bind(prisma.project),
    findProvider: prisma.modelProvider.findUnique.bind(prisma.modelProvider),
    resolveProviderRuntimeConfigForUser,
  });
}

export const __testables = {
  hasUsableProviderRuntimeConfig,
  resolveProviderRuntimeConfigForUserWithDeps,
  resolveRunProviderRuntimeConfigWithDeps,
};
