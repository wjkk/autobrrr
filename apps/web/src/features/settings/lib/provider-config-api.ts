export interface ProviderConfigItem {
  provider: {
    id: string;
    code: string;
    name: string;
    providerType: string;
    baseUrl: string | null;
    enabled: boolean;
  };
  userConfig: {
    id: string | null;
    configured: boolean;
    hasApiKey: boolean;
    enabled: boolean;
    baseUrlOverride: string | null;
    updatedAt: string | null;
  };
}
