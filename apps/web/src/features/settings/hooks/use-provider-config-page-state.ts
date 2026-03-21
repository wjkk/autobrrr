'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import type { ProviderConfigItem, SettingsAuthUser } from '../lib/provider-config-api';
import {
  fetchSettingsAuthUserClient,
  syncProviderModels,
  testProviderConfig,
  updateProviderConfig,
} from '../lib/provider-config-client';
import {
  CONFIGURABLE_PROVIDER_CODES,
  makeDraft,
  shouldAutoSyncConfig,
  type DraftState,
} from '../components/provider-config-page-helpers';

interface ProviderConfigPageProps {
  initialConfigs: ProviderConfigItem[];
  currentUser: SettingsAuthUser | null;
}

export function useProviderConfigPageState({ initialConfigs, currentUser: initialUser }: ProviderConfigPageProps) {
  const visibleInitialConfigs = initialConfigs.filter((item) => CONFIGURABLE_PROVIDER_CODES.has(item.provider.code));
  const [currentUser, setCurrentUser] = useState<SettingsAuthUser | null>(initialUser);
  const [configs, setConfigs] = useState(visibleInitialConfigs);
  const [drafts, setDrafts] = useState<Record<string, DraftState>>(() =>
    Object.fromEntries(visibleInitialConfigs.map((item) => [item.provider.code, makeDraft(item)])),
  );
  const [savingCode, setSavingCode] = useState<string | null>(null);
  const [testingCode, setTestingCode] = useState<string | null>(null);
  const [syncingCode, setSyncingCode] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, { message: string; error?: boolean }>>({});
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authDisplayName, setAuthDisplayName] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authFeedback, setAuthFeedback] = useState<string | null>(null);
  const autoSyncedCodesRef = useRef<Set<string>>(new Set());

  const configuredCount = useMemo(() => configs.filter((item) => item.userConfig.configured).length, [configs]);
  const enabledCount = useMemo(() => configs.filter((item) => item.userConfig.enabled).length, [configs]);
  const testedCount = useMemo(() => configs.filter((item) => !!item.userConfig.lastTest.testedAt).length, [configs]);
  const passedCount = useMemo(() => configs.filter((item) => item.userConfig.lastTest.status === 'passed').length, [configs]);
  const failedCount = useMemo(() => configs.filter((item) => item.userConfig.lastTest.status === 'failed').length, [configs]);

  const applyConfigUpdate = (updated: ProviderConfigItem, options?: { replaceDraft?: boolean }) => {
    setConfigs((current) => current.map((item) => (item.provider.code === updated.provider.code ? updated : item)));
    setDrafts((current) => {
      const existingDraft = current[updated.provider.code];
      if (!options?.replaceDraft) {
        return existingDraft
          ? current
          : {
              ...current,
              [updated.provider.code]: makeDraft(updated),
            };
      }

      return {
        ...current,
        [updated.provider.code]: {
          ...(existingDraft ?? makeDraft(updated)),
          apiKey: '',
          baseUrlOverride: updated.userConfig.baseUrlOverride ?? updated.provider.baseUrl ?? '',
          enabled: updated.userConfig.enabled,
          enabledModels: {
            textEndpointSlugs: updated.userConfig.enabledModels.textEndpointSlugs,
            imageEndpointSlugs: updated.userConfig.enabledModels.imageEndpointSlugs,
            videoEndpointSlugs: updated.userConfig.enabledModels.videoEndpointSlugs,
            audioEndpointSlugs: updated.userConfig.enabledModels.audioEndpointSlugs,
          },
          defaults: {
            textEndpointSlug: updated.userConfig.defaults.textEndpointSlug ?? '',
            imageEndpointSlug: updated.userConfig.defaults.imageEndpointSlug ?? '',
            videoEndpointSlug: updated.userConfig.defaults.videoEndpointSlug ?? '',
            audioEndpointSlug: updated.userConfig.defaults.audioEndpointSlug ?? '',
          },
        },
      };
    });
  };

  const onDraftChange = (providerCode: string, next: Partial<DraftState>) => {
    setDrafts((current) => ({
      ...current,
      [providerCode]: {
        ...current[providerCode],
        ...next,
      },
    }));
  };

  const onSyncModels = async (providerCode: string, options?: { quiet?: boolean }) => {
    setSyncingCode(providerCode);
    if (!options?.quiet) {
      setFeedback((current) => ({
        ...current,
        [providerCode]: { message: '' },
      }));
    }

    try {
      const updated = await syncProviderModels(providerCode);
      applyConfigUpdate(updated);
      if (!options?.quiet) {
        setFeedback((current) => ({
          ...current,
          [providerCode]: { message: updated.userConfig.catalogSync.message ?? '模型目录已同步。' },
        }));
      }
    } catch (error) {
      const providerConfig = error instanceof Error && 'providerConfig' in error ? (error.providerConfig as ProviderConfigItem | undefined) : undefined;
      if (providerConfig) {
        applyConfigUpdate(providerConfig);
      }
      if (!options?.quiet) {
        setFeedback((current) => ({
          ...current,
          [providerCode]: {
            message: error instanceof Error ? error.message : '模型目录同步失败。',
            error: true,
          },
        }));
      }
    } finally {
      setSyncingCode(null);
    }
  };

  const onSave = async (providerCode: string) => {
    const draft = drafts[providerCode];
    if (!draft) {
      return;
    }

    setSavingCode(providerCode);
    setFeedback((current) => ({
      ...current,
      [providerCode]: { message: '' },
    }));

    try {
      let updated = await updateProviderConfig(providerCode, draft);
      applyConfigUpdate(updated, { replaceDraft: true });

      if (CONFIGURABLE_PROVIDER_CODES.has(providerCode)) {
        setSyncingCode(providerCode);
        try {
          updated = await syncProviderModels(providerCode);
          applyConfigUpdate(updated);
        } catch (error) {
          const providerConfig = error instanceof Error && 'providerConfig' in error ? (error.providerConfig as ProviderConfigItem | undefined) : undefined;
          if (providerConfig) {
            updated = providerConfig;
            applyConfigUpdate(providerConfig);
          }
        } finally {
          setSyncingCode(null);
        }
      }

      setFeedback((current) => ({
        ...current,
        [providerCode]: { message: updated.userConfig.catalogSync.message ?? '配置已保存。' },
      }));
      setTestingCode(providerCode);
      try {
        const tested = await testProviderConfig(providerCode, draft.testKind);
        applyConfigUpdate(tested);
        setFeedback((current) => ({
          ...current,
          [providerCode]: { message: `配置已保存，${tested.userConfig.lastTest.message ?? '测试成功。'}` },
        }));
      } catch (error) {
        const providerConfig = error instanceof Error && 'providerConfig' in error ? (error.providerConfig as ProviderConfigItem | undefined) : undefined;
        if (providerConfig) {
          applyConfigUpdate(providerConfig);
        }
        setFeedback((current) => ({
          ...current,
          [providerCode]: {
            message: error instanceof Error ? `配置已保存，但测试失败：${error.message}` : '配置已保存，但测试失败。',
            error: true,
          },
        }));
      } finally {
        setTestingCode(null);
      }
    } catch (error) {
      setFeedback((current) => ({
        ...current,
        [providerCode]: {
          message: error instanceof Error ? error.message : '保存配置失败。',
          error: true,
        },
      }));
    } finally {
      setSavingCode(null);
    }
  };

  const onTest = async (providerCode: string) => {
    const draft = drafts[providerCode];
    if (!draft) {
      return;
    }

    setTestingCode(providerCode);
    setFeedback((current) => ({
      ...current,
      [providerCode]: { message: '' },
    }));

    try {
      const updated = await testProviderConfig(providerCode, draft.testKind);
      applyConfigUpdate(updated);
      setFeedback((current) => ({
        ...current,
        [providerCode]: { message: updated.userConfig.lastTest.message ?? '测试成功。' },
      }));
    } catch (error) {
      const providerConfig = error instanceof Error && 'providerConfig' in error ? (error.providerConfig as ProviderConfigItem | undefined) : undefined;
      if (providerConfig) {
        applyConfigUpdate(providerConfig);
      }
      setFeedback((current) => ({
        ...current,
        [providerCode]: {
          message: error instanceof Error ? error.message : '连通性测试失败。',
          error: true,
        },
      }));
    } finally {
      setTestingCode(null);
    }
  };

  useEffect(() => {
    for (const config of configs) {
      if (!shouldAutoSyncConfig(config, syncingCode, autoSyncedCodesRef.current)) {
        continue;
      }

      autoSyncedCodesRef.current.add(config.provider.code);
      void onSyncModels(config.provider.code, { quiet: true });
    }
  }, [configs, syncingCode]);

  async function refreshCurrentUser() {
    const user = await fetchSettingsAuthUserClient();
    setCurrentUser(user);
  }

  const submitAuth = async () => {
    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthFeedback('请输入邮箱和密码。');
      return;
    }

    setAuthSubmitting(true);
    setAuthFeedback(null);
    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: authEmail.trim(),
          password: authPassword,
          ...(authMode === 'register' && authDisplayName.trim() ? { displayName: authDisplayName.trim() } : {}),
        }),
      });
      const payload = (await response.json()) as { ok: boolean; error?: { message?: string } };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error?.message ?? '认证失败。');
      }

      if (authMode === 'register') {
        const loginResponse = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: authEmail.trim(),
            password: authPassword,
          }),
        });
        const loginPayload = (await loginResponse.json()) as { ok: boolean; error?: { message?: string } };
        if (!loginResponse.ok || !loginPayload.ok) {
          throw new Error(loginPayload.error?.message ?? '注册成功，但自动登录失败。');
        }
      }

      await refreshCurrentUser();
      window.location.reload();
    } catch (error) {
      setAuthFeedback(error instanceof Error ? error.message : '认证失败。');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', headers: { Accept: 'application/json' } });
    window.location.reload();
  };

  return {
    currentUser,
    auth: {
      authMode,
      authEmail,
      authPassword,
      authDisplayName,
      authSubmitting,
      authFeedback,
      onAuthModeChange: setAuthMode,
      onAuthEmailChange: setAuthEmail,
      onAuthPasswordChange: setAuthPassword,
      onAuthDisplayNameChange: setAuthDisplayName,
      onSubmit: submitAuth,
    },
    summary: {
      configs,
      configuredCount,
      enabledCount,
      testedCount,
      passedCount,
      failedCount,
      effectiveUser: currentUser,
      logout,
    },
    cards: {
      configs,
      drafts,
      feedback,
      savingCode,
      testingCode,
      syncingCode,
      onDraftChange,
      onTest,
      onSave,
      onSyncModels,
    },
  };
}
