import { ProviderConfigPage } from '@/features/settings/components/provider-config-page';
import { fetchProviderConfigs, fetchSettingsAuthUser } from '@/features/settings/lib/provider-config-api.server';

export default async function ProviderSettingsPage() {
  const [configs, currentUser] = await Promise.all([fetchProviderConfigs(), fetchSettingsAuthUser()]);

  return <ProviderConfigPage initialConfigs={configs} currentUser={currentUser} />;
}
