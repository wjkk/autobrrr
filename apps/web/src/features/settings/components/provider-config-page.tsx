'use client';

import Link from 'next/link';
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
  type SettingsProviderTestKind,
} from './provider-config-page-helpers';
import { ProviderConfigAuthPanel } from './provider-config-auth-panel';
import { ProviderConfigCard } from './provider-config-card';
import styles from './provider-config-page.module.css';

interface ProviderConfigPageProps {
  initialConfigs: ProviderConfigItem[];
  currentUser: SettingsAuthUser | null;
}

export function ProviderConfigPage({ initialConfigs, currentUser: initialUser }: ProviderConfigPageProps) {
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

  useEffect(() => {
    for (const config of configs) {
      if (!shouldAutoSyncConfig(config, syncingCode, autoSyncedCodesRef.current)) {
        continue;
      }

      autoSyncedCodesRef.current.add(config.provider.code);
      void onSyncModels(config.provider.code, { quiet: true });
    }
  }, [configs, syncingCode]);

  const effectiveUser = currentUser;

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

  if (!effectiveUser) {
    return (
      <ProviderConfigAuthPanel
        authMode={authMode}
        authEmail={authEmail}
        authPassword={authPassword}
        authDisplayName={authDisplayName}
        authSubmitting={authSubmitting}
        authFeedback={authFeedback}
        onAuthModeChange={setAuthMode}
        onAuthEmailChange={setAuthEmail}
        onAuthPasswordChange={setAuthPassword}
        onAuthDisplayNameChange={setAuthDisplayName}
        onSubmit={submitAuth}
      />
    );
  }


  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.topbar}>
          <div>
            <span className={styles.eyebrow}>
              <span className={styles.eyebrowDot} />
              Provider Keys
            </span>
            <h1 className={styles.title}>把模型权限交给用户自己配置</h1>
            <p className={styles.subtitle}>
              这里统一管理 `ARK`、`Platou` 等模型网关的密钥与基础地址。保存后，后端会优先读取你在表内配置的 provider 凭据，不再依赖应用环境变量。
            </p>
          </div>
          <Link href="/explore" className={styles.backLink}>
            返回工作台
          </Link>
        </div>

        <div className={styles.heroGrid}>
          <section className={styles.heroCard}>
            <div className={styles.heroMeta}>
              <div className={styles.heroPill}>
                <small>已接入 Provider</small>
                <strong>{configs.length}</strong>
              </div>
              <div className={styles.heroPill}>
                <small>已配置密钥</small>
                <strong>{configuredCount}</strong>
              </div>
              <div className={styles.heroPill}>
                <small>当前启用</small>
                <strong>{enabledCount}</strong>
              </div>
              <div className={styles.heroPill}>
                <small>当前用户</small>
                <strong>{effectiveUser.displayName ?? effectiveUser.email}</strong>
              </div>
            </div>
          </section>

          <aside className={styles.statsCard}>
            <h2>配置说明</h2>
            <div className={styles.statsList}>
              <div className={styles.statsItem}>
                <span>文本主链</span>
                <strong>ARK / Doubao 1.8</strong>
              </div>
              <div className={styles.statsItem}>
                <span>图片 / 视频 / 音频</span>
                <strong>Ark / Platou</strong>
              </div>
              <div className={styles.statsItem}>
                <span>作用范围</span>
                <strong>当前登录用户</strong>
              </div>
              <div className={styles.statsItem}>
                <span>账号</span>
                <strong>{effectiveUser.email}</strong>
              </div>
            </div>
            <button type="button" className={styles.testButton} onClick={logout}>
              退出登录
            </button>
          </aside>
        </div>

        <section className={styles.healthSection}>
          <div className={styles.healthHeader}>
            <div>
              <small className={styles.healthEyebrow}>Health Snapshot</small>
              <h2 className={styles.healthTitle}>最近一次连接测试总览</h2>
            </div>
            <p className={styles.healthSummary}>
              {testedCount > 0 ? `最近已测试 ${testedCount} 个 provider，其中 ${passedCount} 个成功、${failedCount} 个失败。` : '还没有 provider 做过连接测试。保存配置后会自动触发一次测试。'}
            </p>
          </div>

          <div className={styles.healthGrid}>
            <article className={`${styles.healthCard} ${styles.healthCardNeutral}`}>
              <small>最近已测试</small>
              <strong>{testedCount}</strong>
              <span>至少完成过一次连通性测试</span>
            </article>
            <article className={`${styles.healthCard} ${styles.healthCardSuccess}`}>
              <small>测试成功</small>
              <strong>{passedCount}</strong>
              <span>可直接参与实际执行</span>
            </article>
            <article className={`${styles.healthCard} ${styles.healthCardDanger}`}>
              <small>测试失败</small>
              <strong>{failedCount}</strong>
              <span>建议优先检查 key、地址或通道</span>
            </article>
          </div>
        </section>

        <div className={styles.list}>
          {configs.map((item) => {
            const draft = drafts[item.provider.code] ?? makeDraft(item);
            const currentFeedback = feedback[item.provider.code];

            return (
              <ProviderConfigCard
                key={item.provider.id}
                item={item}
                draft={draft}
                currentFeedback={currentFeedback}
                saving={savingCode === item.provider.code}
                testing={testingCode === item.provider.code}
                syncing={syncingCode === item.provider.code}
                onDraftChange={onDraftChange}
                onTest={onTest}
                onSave={onSave}
                onSyncModels={(providerCode) => void onSyncModels(providerCode)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
