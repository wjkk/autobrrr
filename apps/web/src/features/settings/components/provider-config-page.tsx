'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import type { ProviderConfigItem } from '../lib/provider-config-api';
import styles from './provider-config-page.module.css';

interface ProviderConfigPageProps {
  initialConfigs: ProviderConfigItem[];
}

interface DraftState {
  apiKey: string;
  baseUrlOverride: string;
  enabled: boolean;
  defaults: {
    textEndpointSlug: string;
    imageEndpointSlug: string;
    videoEndpointSlug: string;
  };
}

function makeDraft(config: ProviderConfigItem): DraftState {
  return {
    apiKey: '',
    baseUrlOverride: config.userConfig.baseUrlOverride ?? config.provider.baseUrl ?? '',
    enabled: config.userConfig.enabled,
    defaults: {
      textEndpointSlug: config.userConfig.defaults.textEndpointSlug ?? '',
      imageEndpointSlug: config.userConfig.defaults.imageEndpointSlug ?? '',
      videoEndpointSlug: config.userConfig.defaults.videoEndpointSlug ?? '',
    },
  };
}

async function updateProviderConfig(providerCode: string, draft: DraftState) {
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
    }),
  });

  const payload = (await response.json()) as { ok: boolean; data?: ProviderConfigItem; error?: { message?: string } };
  if (!response.ok || !payload.ok || !payload.data) {
    throw new Error(payload.error?.message ?? '保存配置失败。');
  }

  return payload.data;
}

async function testProviderConfig(providerCode: string) {
  const response = await fetch(`/api/provider-configs/${encodeURIComponent(providerCode)}/test`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
    },
  });

  const payload = (await response.json()) as { ok: boolean; data?: { message?: string }; error?: { message?: string } };
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error?.message ?? '连通性测试失败。');
  }

  return payload.data?.message ?? 'Provider connectivity test succeeded.';
}

export function ProviderConfigPage({ initialConfigs }: ProviderConfigPageProps) {
  const [configs, setConfigs] = useState(initialConfigs);
  const [drafts, setDrafts] = useState<Record<string, DraftState>>(() =>
    Object.fromEntries(initialConfigs.map((item) => [item.provider.code, makeDraft(item)])),
  );
  const [savingCode, setSavingCode] = useState<string | null>(null);
  const [testingCode, setTestingCode] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, { message: string; error?: boolean }>>({});

  const configuredCount = useMemo(() => configs.filter((item) => item.userConfig.configured).length, [configs]);
  const enabledCount = useMemo(() => configs.filter((item) => item.userConfig.enabled).length, [configs]);

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
      const updated = await updateProviderConfig(providerCode, draft);
      setConfigs((current) => current.map((item) => (item.provider.code === providerCode ? updated : item)));
      setDrafts((current) => ({
        ...current,
        [providerCode]: {
          ...current[providerCode],
          apiKey: '',
          baseUrlOverride: updated.userConfig.baseUrlOverride ?? updated.provider.baseUrl ?? '',
          enabled: updated.userConfig.enabled,
          defaults: {
            textEndpointSlug: updated.userConfig.defaults.textEndpointSlug ?? '',
            imageEndpointSlug: updated.userConfig.defaults.imageEndpointSlug ?? '',
            videoEndpointSlug: updated.userConfig.defaults.videoEndpointSlug ?? '',
          },
        },
      }));
      setFeedback((current) => ({
        ...current,
        [providerCode]: { message: '配置已保存。' },
      }));
      setTestingCode(providerCode);
      try {
        const message = await testProviderConfig(providerCode);
        setFeedback((current) => ({
          ...current,
          [providerCode]: { message: `配置已保存，${message}` },
        }));
      } catch (error) {
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
    setTestingCode(providerCode);
    setFeedback((current) => ({
      ...current,
      [providerCode]: { message: '' },
    }));

    try {
      const message = await testProviderConfig(providerCode);
      setFeedback((current) => ({
        ...current,
        [providerCode]: { message },
      }));
    } catch (error) {
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
              这里统一管理 `ARK`、`AICSO` 等模型网关的密钥与基础地址。保存后，后端会优先读取你在表内配置的 provider 凭据，不再依赖应用环境变量。
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
                <strong>AICSO</strong>
              </div>
              <div className={styles.statsItem}>
                <span>作用范围</span>
                <strong>当前登录用户</strong>
              </div>
            </div>
          </aside>
        </div>

        <div className={styles.list}>
          {configs.map((item) => {
            const draft = drafts[item.provider.code] ?? makeDraft(item);
            const currentFeedback = feedback[item.provider.code];
            const textEndpoints = item.endpoints.filter((endpoint) => endpoint.modelKind === 'text');
            const imageEndpoints = item.endpoints.filter((endpoint) => endpoint.modelKind === 'image');
            const videoEndpoints = item.endpoints.filter((endpoint) => endpoint.modelKind === 'video');

            return (
              <section key={item.provider.id} className={styles.providerCard}>
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
                  </aside>

                  <div className={styles.form}>
                    <label className={styles.field}>
                      <div className={styles.fieldLabel}>
                        <span>API Key</span>
                        <span className={styles.fieldHint}>留空表示保持现有密钥</span>
                      </div>
                      <textarea
                        className={styles.textarea}
                        value={draft.apiKey}
                        placeholder={item.userConfig.hasApiKey ? '已保存密钥，重新输入可覆盖' : '输入当前 provider 的 API Key'}
                        onChange={(event) => onDraftChange(item.provider.code, { apiKey: event.target.value })}
                      />
                    </label>

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
                      <label className={styles.field}>
                        <div className={styles.fieldLabel}>
                          <span>默认文本模型</span>
                          <span className={styles.fieldHint}>planner / 文本任务未显式指定模型时使用</span>
                        </div>
                        <select
                          className={styles.input}
                          value={draft.defaults.textEndpointSlug}
                          onChange={(event) =>
                            onDraftChange(item.provider.code, {
                              defaults: {
                                ...draft.defaults,
                                textEndpointSlug: event.target.value,
                              },
                            })
                          }
                        >
                          <option value="">不设置</option>
                          {textEndpoints.map((endpoint) => (
                            <option key={endpoint.id} value={endpoint.slug}>
                              {endpoint.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}

                    {imageEndpoints.length ? (
                      <label className={styles.field}>
                        <div className={styles.fieldLabel}>
                          <span>默认图片模型</span>
                          <span className={styles.fieldHint}>图片生成未显式指定模型时使用</span>
                        </div>
                        <select
                          className={styles.input}
                          value={draft.defaults.imageEndpointSlug}
                          onChange={(event) =>
                            onDraftChange(item.provider.code, {
                              defaults: {
                                ...draft.defaults,
                                imageEndpointSlug: event.target.value,
                              },
                            })
                          }
                        >
                          <option value="">不设置</option>
                          {imageEndpoints.map((endpoint) => (
                            <option key={endpoint.id} value={endpoint.slug}>
                              {endpoint.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}

                    {videoEndpoints.length ? (
                      <label className={styles.field}>
                        <div className={styles.fieldLabel}>
                          <span>默认视频模型</span>
                          <span className={styles.fieldHint}>视频生成未显式指定模型时使用</span>
                        </div>
                        <select
                          className={styles.input}
                          value={draft.defaults.videoEndpointSlug}
                          onChange={(event) =>
                            onDraftChange(item.provider.code, {
                              defaults: {
                                ...draft.defaults,
                                videoEndpointSlug: event.target.value,
                              },
                            })
                          }
                        >
                          <option value="">不设置</option>
                          {videoEndpoints.map((endpoint) => (
                            <option key={endpoint.id} value={endpoint.slug}>
                              {endpoint.label}
                            </option>
                          ))}
                        </select>
                      </label>
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
                        <button
                          type="button"
                          className={styles.testButton}
                          onClick={() => onTest(item.provider.code)}
                          disabled={testingCode === item.provider.code || savingCode === item.provider.code}
                        >
                          {testingCode === item.provider.code ? '测试中...' : '测试连接'}
                        </button>
                        <button
                          type="button"
                          className={styles.saveButton}
                          onClick={() => onSave(item.provider.code)}
                          disabled={savingCode === item.provider.code}
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
