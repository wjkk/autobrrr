import { ProviderConfigPage } from '@/features/settings/components/provider-config-page';
import { fetchProviderConfigs } from '@/features/settings/lib/provider-config-api.server';

export default async function ProviderSettingsPage() {
  const configs = await fetchProviderConfigs();

  return <ProviderConfigPage initialConfigs={configs} />;
}
