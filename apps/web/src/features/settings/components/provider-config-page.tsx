'use client';

import { ProviderConfigAuthPanel } from './provider-config-auth-panel';
import { ProviderConfigPageShell } from './provider-config-page-shell';
import { useProviderConfigPageState } from '../hooks/use-provider-config-page-state';
import type { ProviderConfigItem, SettingsAuthUser } from '../lib/provider-config-api';

interface ProviderConfigPageProps {
  initialConfigs: ProviderConfigItem[];
  currentUser: SettingsAuthUser | null;
}

export function ProviderConfigPage(props: ProviderConfigPageProps) {
  const state = useProviderConfigPageState(props);

  if (!state.currentUser) {
    return <ProviderConfigAuthPanel {...state.auth} />;
  }

  return (
    <ProviderConfigPageShell
      configs={state.summary.configs}
      drafts={state.cards.drafts}
      feedback={state.cards.feedback}
      savingCode={state.cards.savingCode}
      testingCode={state.cards.testingCode}
      syncingCode={state.cards.syncingCode}
      configuredCount={state.summary.configuredCount}
      enabledCount={state.summary.enabledCount}
      testedCount={state.summary.testedCount}
      passedCount={state.summary.passedCount}
      failedCount={state.summary.failedCount}
      effectiveUser={state.summary.effectiveUser!}
      onDraftChange={state.cards.onDraftChange}
      onTest={state.cards.onTest}
      onSave={state.cards.onSave}
      onSyncModels={state.cards.onSyncModels}
      onLogout={state.summary.logout}
    />
  );
}
