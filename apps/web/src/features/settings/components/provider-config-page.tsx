'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { ProviderConfigItem, SettingsAuthUser } from '../lib/provider-config-api';
import styles from './provider-config-page.module.css';

interface ProviderConfigPageProps {
  initialConfigs: ProviderConfigItem[];
  currentUser: SettingsAuthUser | null;
}

const CONFIGURABLE_PROVIDER_CODES = new Set(['ark', 'platou']);

interface DraftState {
  apiKey: string;
  baseUrlOverride: string;
  enabled: boolean;
  testKind: 'text' | 'image' | 'video';
  enabledModels: {
    textEndpointSlugs: string[];
    imageEndpointSlugs: string[];
    videoEndpointSlugs: string[];
  };
  defaults: {
    textEndpointSlug: string;
    imageEndpointSlug: string;
    videoEndpointSlug: string;
  };
}

type ModelKind = 'text' | 'image' | 'video';

interface ModelEndpointOption {
  id: string;
  slug: string;
  label: string;
  modelKind: string;
}

function makeDraft(config: ProviderConfigItem): DraftState {
  return {
    apiKey: '',
    baseUrlOverride: config.userConfig.baseUrlOverride ?? config.provider.baseUrl ?? '',
    enabled: config.userConfig.enabled,
    testKind: config.endpoints.some((endpoint) => endpoint.modelKind === 'text')
      ? 'text'
      : config.endpoints.some((endpoint) => endpoint.modelKind === 'image')
        ? 'image'
        : 'video',
    enabledModels: {
      textEndpointSlugs: config.userConfig.enabledModels.textEndpointSlugs,
      imageEndpointSlugs: config.userConfig.enabledModels.imageEndpointSlugs,
      videoEndpointSlugs: config.userConfig.enabledModels.videoEndpointSlugs,
    },
    defaults: {
      textEndpointSlug: config.userConfig.defaults.textEndpointSlug ?? '',
      imageEndpointSlug: config.userConfig.defaults.imageEndpointSlug ?? '',
      videoEndpointSlug: config.userConfig.defaults.videoEndpointSlug ?? '',
    },
  };
}

function modelKindLabel(modelKind: ModelKind) {
  if (modelKind === 'text') {
    return '文本';
  }
  if (modelKind === 'image') {
    return '图片';
  }
  return '视频';
}

function getEnabledModelSlugs(draft: DraftState, modelKind: ModelKind) {
  if (modelKind === 'text') {
    return draft.enabledModels.textEndpointSlugs;
  }
  if (modelKind === 'image') {
    return draft.enabledModels.imageEndpointSlugs;
  }
  return draft.enabledModels.videoEndpointSlugs;
}

function getDefaultModelSlug(draft: DraftState, modelKind: ModelKind) {
  if (modelKind === 'text') {
    return draft.defaults.textEndpointSlug;
  }
  if (modelKind === 'image') {
    return draft.defaults.imageEndpointSlug;
  }
  return draft.defaults.videoEndpointSlug;
}

function setEnabledModelSlugs(draft: DraftState, modelKind: ModelKind, nextSlugs: string[]): DraftState['enabledModels'] {
  if (modelKind === 'text') {
    return {
      ...draft.enabledModels,
      textEndpointSlugs: nextSlugs,
    };
  }
  if (modelKind === 'image') {
    return {
      ...draft.enabledModels,
      imageEndpointSlugs: nextSlugs,
    };
  }
  return {
    ...draft.enabledModels,
    videoEndpointSlugs: nextSlugs,
  };
}

function ModelSelectionSection(props: {
  providerCode: string;
  modelKind: ModelKind;
  endpoints: ModelEndpointOption[];
  draft: DraftState;
  onDraftChange: (providerCode: string, next: Partial<DraftState>) => void;
}) {
  const { providerCode, modelKind, endpoints, draft, onDraftChange } = props;
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);
  const enabledSlugs = getEnabledModelSlugs(draft, modelKind);
  const enabledEndpoints = endpoints.filter((endpoint) => enabledSlugs.includes(endpoint.slug));
  const defaultSlug = getDefaultModelSlug(draft, modelKind);
  const selectableEndpoints = endpoints.filter((endpoint) => enabledSlugs.length === 0 || enabledSlugs.includes(endpoint.slug));
  const filteredEndpoints = endpoints.filter((endpoint) => endpoint.label.toLowerCase().includes(searchQuery.trim().toLowerCase()));

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const toggleEndpoint = (endpointSlug: string) => {
    const nextSlugs = enabledSlugs.includes(endpointSlug)
      ? enabledSlugs.filter((slug) => slug !== endpointSlug)
      : [...enabledSlugs, endpointSlug];

    onDraftChange(providerCode, {
      enabledModels: setEnabledModelSlugs(draft, modelKind, nextSlugs),
    });
  };

  return (
    <div className={styles.field}>
      <div className={styles.modelSectionCard}>
        <div className={styles.modelSectionHeader}>
          <div>
            <div className={styles.fieldLabel}>
              <span>{modelKindLabel(modelKind)}模型</span>
              <span className={styles.fieldHint}>已启用 {enabledSlugs.length} / {endpoints.length}</span>
            </div>
          </div>
          <button type="button" className={styles.sectionToggleButton} onClick={() => setIsOpen((current) => !current)}>
            {isOpen ? '收起' : '选择模型'}
          </button>
        </div>

        <div ref={pickerRef} className={styles.modelPicker}>
          <button
            type="button"
            className={`${styles.modelPickerTrigger} ${isOpen ? styles.modelPickerTriggerActive : ''}`}
            onClick={() => setIsOpen((current) => !current)}
          >
            <div className={styles.modelPickerValues}>
              {enabledEndpoints.length > 0 ? (
                enabledEndpoints.map((endpoint) => (
                  <span key={endpoint.id} className={styles.modelPickerTag}>
                    {endpoint.label}
                    <span
                      className={styles.modelPickerTagRemove}
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleEndpoint(endpoint.slug);
                      }}
                    >
                      ×
                    </span>
                  </span>
                ))
              ) : (
                <span className={styles.modelPickerPlaceholder}>点击选择可启用的{modelKindLabel(modelKind)}模型，可搜索、可复选</span>
              )}
            </div>
            <div className={styles.modelPickerActions}>
              {enabledEndpoints.length > 0 ? (
                <span
                  className={styles.modelPickerClear}
                  onClick={(event) => {
                    event.stopPropagation();
                    onDraftChange(providerCode, {
                      enabledModels: setEnabledModelSlugs(draft, modelKind, []),
                    });
                  }}
                >
                  清空
                </span>
              ) : null}
              <span className={styles.modelPickerCaret}>{isOpen ? '⌃' : '⌄'}</span>
            </div>
          </button>

          {isOpen ? (
            <div className={styles.modelPickerPanel}>
              <div className={styles.modelPickerSearchWrap}>
                <input
                  className={styles.modelPickerSearch}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="搜索模型"
                />
              </div>
              <div className={styles.modelPickerList}>
                {filteredEndpoints.length > 0 ? (
                  filteredEndpoints.map((endpoint) => {
                    const checked = enabledSlugs.includes(endpoint.slug);
                    return (
                      <button
                        key={endpoint.id}
                        type="button"
                        className={`${styles.modelPickerOption} ${checked ? styles.modelPickerOptionChecked : ''}`}
                        onClick={() => toggleEndpoint(endpoint.slug)}
                      >
                        <span className={styles.modelPickerOptionMark}>{checked ? '✓' : ''}</span>
                        <span className={styles.modelPickerOptionLabel}>{endpoint.label}</span>
                      </button>
                    );
                  })
                ) : (
                  <div className={styles.modelPickerEmpty}>没有匹配到模型，请换个关键词。</div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <div className={styles.modelDefaultRow}>
          <div className={styles.fieldLabel}>
            <span>默认{modelKindLabel(modelKind)}模型</span>
            <span className={styles.fieldHint}>{modelKind === 'text' ? 'planner / 文本任务' : modelKind === 'image' ? '图片生成' : '视频生成'} 未显式指定模型时使用</span>
          </div>
          <select
            className={styles.input}
            value={defaultSlug}
            onChange={(event) =>
              onDraftChange(providerCode, {
                defaults: {
                  ...draft.defaults,
                  textEndpointSlug: modelKind === 'text' ? event.target.value : draft.defaults.textEndpointSlug,
                  imageEndpointSlug: modelKind === 'image' ? event.target.value : draft.defaults.imageEndpointSlug,
                  videoEndpointSlug: modelKind === 'video' ? event.target.value : draft.defaults.videoEndpointSlug,
                },
              })
            }
          >
            <option value="">不设置</option>
            {selectableEndpoints.map((endpoint) => (
              <option key={endpoint.id} value={endpoint.slug}>
                {endpoint.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

async function updateProviderConfig(providerCode: string, draft: DraftState): Promise<ProviderConfigItem> {
  const response = await fetch(`/api/provider-configs/${encodeURIComponent(providerCode)}`, {
    method: 'PUT',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      apiKey: draft.apiKey.trim() ? draft.apiKey.trim() : undefined,
      baseUrlOverride: draft.baseUrlOverride.trim() ? draft.baseUrlOverride.trim() : null,
      enabled: draft.enabled,
      defaults: {
        textEndpointSlug: draft.defaults.textEndpointSlug || null,
        imageEndpointSlug: draft.defaults.imageEndpointSlug || null,
        videoEndpointSlug: draft.defaults.videoEndpointSlug || null,
      },
      enabledModels: {
        textEndpointSlugs: draft.enabledModels.textEndpointSlugs,
        imageEndpointSlugs: draft.enabledModels.imageEndpointSlugs,
        videoEndpointSlugs: draft.enabledModels.videoEndpointSlugs,
      },
    }),
  });

  const payload = (await response.json()) as { ok: boolean; data?: ProviderConfigItem; error?: { message?: string } };
  if (!response.ok || !payload.ok || !payload.data) {
    throw new Error(payload.error?.message ?? '保存配置失败。');
  }

  return payload.data;
}

async function testProviderConfig(providerCode: string, testKind: 'text' | 'image' | 'video'): Promise<ProviderConfigItem> {
  const response = await fetch(`/api/provider-configs/${encodeURIComponent(providerCode)}/test`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ testKind }),
  });

  const payload = (await response.json()) as { ok: boolean; data?: ProviderConfigItem; error?: { message?: string } };
  if (!response.ok || !payload.ok) {
    const error = new Error(payload.error?.message ?? '连通性测试失败。') as Error & { providerConfig?: ProviderConfigItem };
    if (payload.data) {
      error.providerConfig = payload.data;
    }
    throw error;
  }

  if (!payload.data) {
    throw new Error('测试返回为空。');
  }

  return payload.data;
}

async function syncProviderModels(providerCode: string): Promise<ProviderConfigItem> {
  const response = await fetch(`/api/provider-configs/${encodeURIComponent(providerCode)}/sync-models`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
    },
  });

  const payload = (await response.json()) as { ok: boolean; data?: ProviderConfigItem; error?: { message?: string } };
  if (!response.ok || !payload.ok) {
    const error = new Error(payload.error?.message ?? '模型目录同步失败。') as Error & { providerConfig?: ProviderConfigItem };
    if (payload.data) {
      error.providerConfig = payload.data;
    }
    throw error;
  }

  if (!payload.data) {
    throw new Error('模型目录同步返回为空。');
  }

  return payload.data;
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
          },
          defaults: {
            textEndpointSlug: updated.userConfig.defaults.textEndpointSlug ?? '',
            imageEndpointSlug: updated.userConfig.defaults.imageEndpointSlug ?? '',
            videoEndpointSlug: updated.userConfig.defaults.videoEndpointSlug ?? '',
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

      if (providerCode === 'platou') {
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
    const platouConfig = configs.find((item) => item.provider.code === 'platou');
    if (!platouConfig || !platouConfig.userConfig.configured || !platouConfig.userConfig.enabled) {
      return;
    }
    if (platouConfig.userConfig.catalogSync.syncedAt || autoSyncedCodesRef.current.has('platou') || syncingCode === 'platou') {
      return;
    }

    autoSyncedCodesRef.current.add('platou');
    void onSyncModels('platou', { quiet: true });
  }, [configs, syncingCode]);

  const effectiveUser = currentUser;

  async function refreshCurrentUser() {
    const response = await fetch('/api/auth/me', { headers: { Accept: 'application/json' } });
    const payload = (await response.json()) as { ok: boolean; data?: SettingsAuthUser; error?: { message?: string } };
    if (!response.ok || !payload.ok || !payload.data) {
      throw new Error(payload.error?.message ?? '获取当前用户失败。');
    }
    setCurrentUser(payload.data);
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
      <div className={styles.page}>
        <div className={styles.shell}>
          <div className={styles.topbar}>
            <div>
              <span className={styles.eyebrow}>
                <span className={styles.eyebrowDot} />
                Provider Keys
              </span>
              <h1 className={styles.title}>先登录，再测试 provider 配置</h1>
              <p className={styles.subtitle}>
                这里会把 `ARK`、`Platou` 等配置保存到当前用户自己的表里。为了让你直接在页面里完成测试，我补了一个最小登录入口。
              </p>
            </div>
            <Link href="/explore" className={styles.backLink}>
              返回工作台
            </Link>
          </div>

          <section className={styles.authCard}>
            <div className={styles.authTabs}>
              <button type="button" className={`${styles.authTab} ${authMode === 'login' ? styles.authTabActive : ''}`} onClick={() => setAuthMode('login')}>
                登录
              </button>
              <button type="button" className={`${styles.authTab} ${authMode === 'register' ? styles.authTabActive : ''}`} onClick={() => setAuthMode('register')}>
                注册
              </button>
            </div>

            <div className={styles.authFields}>
              {authMode === 'register' ? (
                <input className={styles.input} value={authDisplayName} onChange={(event) => setAuthDisplayName(event.target.value)} placeholder="显示名称（可选）" />
              ) : null}
              <input className={styles.input} type="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder="邮箱" />
              <input className={styles.input} type="password" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} placeholder="密码（至少 8 位）" />
            </div>

            <div className={styles.authFooter}>
              <div className={`${styles.feedback} ${authFeedback ? styles.feedbackError : ''}`}>{authFeedback ?? ''}</div>
              <button type="button" className={styles.saveButton} onClick={submitAuth} disabled={authSubmitting}>
                {authSubmitting ? '提交中...' : authMode === 'login' ? '登录' : '注册并登录'}
              </button>
            </div>
          </section>
        </div>
      </div>
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
                <span>图片 / 视频</span>
                <strong>Platou</strong>
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
            const textEndpoints = item.endpoints.filter((endpoint) => endpoint.modelKind === 'text');
            const imageEndpoints = item.endpoints.filter((endpoint) => endpoint.modelKind === 'image');
            const videoEndpoints = item.endpoints.filter((endpoint) => endpoint.modelKind === 'video');
            const testKinds = [
              ...(textEndpoints.length ? (['text'] as const) : []),
              ...(imageEndpoints.length ? (['image'] as const) : []),
              ...(videoEndpoints.length ? (['video'] as const) : []),
            ];
            const testStatus = item.userConfig.lastTest.status;
            const testStatusLabel =
              testStatus === 'passed'
                ? '最近测试成功'
                : testStatus === 'failed'
                  ? '最近测试失败'
                  : '尚未测试';
            const catalogStatus = item.userConfig.catalogSync.status;
            const catalogStatusLabel =
              catalogStatus === 'passed'
                ? '模型目录已同步'
                : catalogStatus === 'failed'
                  ? '模型目录同步失败'
                  : '模型目录未同步';

            return (
              <section key={item.provider.id} className={styles.providerCard}>
                <div
                  className={`${styles.testRibbon} ${
                    testStatus === 'passed'
                      ? styles.testRibbonSuccess
                      : testStatus === 'failed'
                        ? styles.testRibbonDanger
                        : styles.testRibbonNeutral
                  }`}
                >
                  <span className={styles.testRibbonDot} />
                  <strong className={styles.testRibbonLabel}>{testStatusLabel}</strong>
                  <span className={styles.testRibbonTime}>
                    {item.userConfig.lastTest.testedAt ? new Date(item.userConfig.lastTest.testedAt).toLocaleString('zh-CN') : '等待首次测试'}
                  </span>
                </div>
                <div className={styles.providerHead}>
                  <div>
                    <div className={styles.providerName}>
                      <span className={styles.providerMonogram}>{item.provider.code.slice(0, 3).toUpperCase()}</span>
                      <div>
                        <h2>{item.provider.name}</h2>
                        <div className={styles.providerMeta}>
                          <span className={styles.chip}>{item.provider.code}</span>
                          <span className={styles.chip}>{item.provider.providerType}</span>
                          <span className={`${styles.statusChip} ${item.userConfig.enabled ? '' : styles.statusChipOff}`}>
                            {item.userConfig.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={styles.providerBody}>
                  <aside className={styles.providerAside}>
                    <div className={styles.asideCard}>
                      <small>默认地址</small>
                      <strong>{item.provider.baseUrl ?? '未提供'}</strong>
                    </div>
                    <div className={styles.asideCard}>
                      <small>当前状态</small>
                      <strong>{item.userConfig.configured ? '已写入密钥' : '尚未配置'}</strong>
                      <p>{item.userConfig.updatedAt ? `最近更新：${new Date(item.userConfig.updatedAt).toLocaleString('zh-CN')}` : '首次保存后立即生效。'}</p>
                    </div>
                    <div className={styles.asideCard}>
                      <small>模型目录</small>
                      <div className={styles.statusRow}>
                        <strong>{catalogStatusLabel}</strong>
                        <span
                          className={`${styles.statusBadge} ${
                            catalogStatus === 'passed'
                              ? styles.statusBadgeSuccess
                              : catalogStatus === 'failed'
                                ? styles.statusBadgeDanger
                                : styles.statusBadgeNeutral
                          }`}
                        >
                          {catalogStatus === 'passed' ? 'SYNCED' : catalogStatus === 'failed' ? 'FAILED' : 'PENDING'}
                        </span>
                      </div>
                      <p>
                        {item.userConfig.catalogSync.syncedAt
                          ? `${new Date(item.userConfig.catalogSync.syncedAt).toLocaleString('zh-CN')} · 共 ${item.userConfig.catalogSync.modelCount ?? item.endpoints.length} 个模型`
                          : `当前已收录 ${item.endpoints.length} 个模型（文本 ${textEndpoints.length} / 图片 ${imageEndpoints.length} / 视频 ${videoEndpoints.length}）`}
                      </p>
                      {item.userConfig.catalogSync.message ? <p>{item.userConfig.catalogSync.message}</p> : null}
                    </div>
                    <div className={styles.asideCard}>
                      <small>最近一次测试</small>
                      <div className={styles.statusRow}>
                        <strong>
                          {item.userConfig.lastTest.status === 'passed'
                            ? '连接成功'
                            : item.userConfig.lastTest.status === 'failed'
                              ? '连接失败'
                              : '尚未测试'}
                        </strong>
                        <span
                          className={`${styles.statusBadge} ${
                            item.userConfig.lastTest.status === 'passed'
                              ? styles.statusBadgeSuccess
                              : item.userConfig.lastTest.status === 'failed'
                                ? styles.statusBadgeDanger
                                : styles.statusBadgeNeutral
                          }`}
                        >
                          {item.userConfig.lastTest.status === 'passed'
                            ? 'PASS'
                            : item.userConfig.lastTest.status === 'failed'
                              ? 'FAIL'
                              : 'PENDING'}
                        </span>
                      </div>
                      <p>
                        {item.userConfig.lastTest.testedAt
                          ? `${new Date(item.userConfig.lastTest.testedAt).toLocaleString('zh-CN')} · ${item.userConfig.lastTest.endpointSlug ?? '未记录模型'}`
                          : '保存后会自动跑一次测试，也可以手动点击“测试连接”。'}
                      </p>
                      {item.userConfig.lastTest.message ? <p>{item.userConfig.lastTest.message}</p> : null}
                    </div>
                  </aside>

                  <div className={styles.form}>
                    <label className={styles.field}>
                      <div className={styles.fieldLabel}>
                        <span>API Key</span>
                        <span className={styles.fieldHint}>
                          {item.userConfig.maskedApiKey ? `当前：${item.userConfig.maskedApiKey}` : '留空表示保持现有密钥'}
                        </span>
                      </div>
                      <input
                        className={styles.input}
                        value={draft.apiKey}
                        placeholder={item.userConfig.hasApiKey ? '已保存密钥，重新输入可覆盖' : '输入当前 provider 的 API Key'}
                        type="text"
                        autoComplete="off"
                        spellCheck={false}
                        onChange={(event) => onDraftChange(item.provider.code, { apiKey: event.target.value })}
                      />
                    </label>

                    {testKinds.length > 1 ? (
                      <label className={styles.field}>
                        <div className={styles.fieldLabel}>
                          <span>测试类型</span>
                          <span className={styles.fieldHint}>决定“测试连接”时实际验证的模型类别</span>
                        </div>
                        <select
                          className={styles.input}
                          value={draft.testKind}
                          onChange={(event) =>
                            onDraftChange(item.provider.code, {
                              testKind: event.target.value as 'text' | 'image' | 'video',
                            })
                          }
                        >
                          {testKinds.map((kind) => (
                            <option key={kind} value={kind}>
                              {kind === 'text' ? '测文本' : kind === 'image' ? '测图片' : '测视频'}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}

                    <label className={styles.field}>
                      <div className={styles.fieldLabel}>
                        <span>Base URL</span>
                        <span className={styles.fieldHint}>默认会沿用 provider 的官方地址</span>
                      </div>
                      <input
                        className={styles.input}
                        value={draft.baseUrlOverride}
                        onChange={(event) => onDraftChange(item.provider.code, { baseUrlOverride: event.target.value })}
                      />
                    </label>

                    {textEndpoints.length ? (
                      <ModelSelectionSection
                        providerCode={item.provider.code}
                        modelKind="text"
                        endpoints={textEndpoints}
                        draft={draft}
                        onDraftChange={onDraftChange}
                      />
                    ) : null}

                    {imageEndpoints.length ? (
                      <ModelSelectionSection
                        providerCode={item.provider.code}
                        modelKind="image"
                        endpoints={imageEndpoints}
                        draft={draft}
                        onDraftChange={onDraftChange}
                      />
                    ) : null}

                    {videoEndpoints.length ? (
                      <ModelSelectionSection
                        providerCode={item.provider.code}
                        modelKind="video"
                        endpoints={videoEndpoints}
                        draft={draft}
                        onDraftChange={onDraftChange}
                      />
                    ) : null}

                    <div className={styles.toggleRow}>
                      <div className={styles.toggleCopy}>
                        <strong>启用这个 Provider</strong>
                        <span>关闭后，当前用户下的该 provider 不会参与实际执行。</span>
                      </div>
                      <button
                        type="button"
                        className={`${styles.toggle} ${draft.enabled ? styles.toggleOn : ''}`}
                        onClick={() => onDraftChange(item.provider.code, { enabled: !draft.enabled })}
                        aria-pressed={draft.enabled}
                      >
                        <span className={styles.toggleThumb} />
                      </button>
                    </div>

                    <div className={styles.footer}>
                      <div className={`${styles.feedback} ${currentFeedback?.error ? styles.feedbackError : ''}`}>
                        {currentFeedback?.message ?? ''}
                      </div>
                      <div className={styles.footerActions}>
                        {item.provider.code === 'platou' ? (
                          <button
                            type="button"
                            className={styles.testButton}
                            onClick={() => onSyncModels(item.provider.code)}
                            disabled={syncingCode === item.provider.code || savingCode === item.provider.code}
                          >
                            {syncingCode === item.provider.code ? '同步模型中...' : '同步模型'}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className={styles.testButton}
                          onClick={() => onTest(item.provider.code)}
                          disabled={testingCode === item.provider.code || savingCode === item.provider.code || syncingCode === item.provider.code}
                        >
                          {testingCode === item.provider.code ? '测试中...' : '测试连接'}
                        </button>
                        <button
                          type="button"
                          className={styles.saveButton}
                          onClick={() => onSave(item.provider.code)}
                          disabled={savingCode === item.provider.code || syncingCode === item.provider.code}
                        >
                          {savingCode === item.provider.code ? '保存中...' : '保存配置'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
