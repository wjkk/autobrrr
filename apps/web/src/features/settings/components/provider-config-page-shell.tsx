'use client';

import Link from 'next/link';

import type { ProviderConfigItem, SettingsAuthUser } from '../lib/provider-config-api';
import type { DraftState } from './provider-config-page-helpers';
import { ProviderConfigCard } from './provider-config-card';
import styles from './provider-config-page.module.css';

interface ProviderConfigPageShellProps {
  configs: ProviderConfigItem[];
  drafts: Record<string, DraftState>;
  feedback: Record<string, { message: string; error?: boolean }>;
  savingCode: string | null;
  testingCode: string | null;
  syncingCode: string | null;
  configuredCount: number;
  enabledCount: number;
  testedCount: number;
  passedCount: number;
  failedCount: number;
  effectiveUser: SettingsAuthUser;
  onDraftChange: (providerCode: string, next: Partial<DraftState>) => void;
  onTest: (providerCode: string) => void;
  onSave: (providerCode: string) => void;
  onSyncModels: (providerCode: string) => void;
  onLogout: () => void;
}

export function ProviderConfigPageShell(props: ProviderConfigPageShellProps) {
  const {
    configs,
    drafts,
    feedback,
    savingCode,
    testingCode,
    syncingCode,
    configuredCount,
    enabledCount,
    testedCount,
    passedCount,
    failedCount,
    effectiveUser,
    onDraftChange,
    onTest,
    onSave,
    onSyncModels,
    onLogout,
  } = props;

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
            <button type="button" className={styles.testButton} onClick={onLogout}>
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
            const draft = drafts[item.provider.code];
            const currentFeedback = feedback[item.provider.code];
            if (!draft) {
              return null;
            }

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
