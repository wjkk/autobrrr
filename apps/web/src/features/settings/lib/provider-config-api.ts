export interface ProviderConfigItem {
  provider: {
    id: string;
    code: string;
    name: string;
    providerType: string;
    baseUrl: string | null;
    enabled: boolean;
  };
  endpoints: Array<{
    id: string;
    slug: string;
    label: string;
    modelKind: string;
    familySlug: string;
    isDefault: boolean;
  }>;
  userConfig: {
    id: string | null;
    configured: boolean;
    hasApiKey: boolean;
    maskedApiKey: string | null;
    enabled: boolean;
    baseUrlOverride: string | null;
    defaults: {
      textEndpointSlug: string | null;
      imageEndpointSlug: string | null;
      videoEndpointSlug: string | null;
    };
    enabledModels: {
      textEndpointSlugs: string[];
      imageEndpointSlugs: string[];
      videoEndpointSlugs: string[];
    };
    lastTest: {
      status: string | null;
      message: string | null;
      endpointSlug: string | null;
      testedAt: string | null;
    };
    updatedAt: string | null;
  };
}

export interface SettingsAuthUser {
  id: string;
  email: string;
  displayName: string | null;
}
