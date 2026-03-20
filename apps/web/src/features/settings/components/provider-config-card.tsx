'use client';

import { ProviderModelSelectionSection } from './provider-model-selection-section';
import styles from './provider-config-page.module.css';
import type { ProviderConfigItem } from '../lib/provider-config-api';
import type { DraftState } from './provider-config-page-helpers';

interface ProviderConfigCardProps {
  item: ProviderConfigItem;
  draft: DraftState;
  currentFeedback?: { message: string; error?: boolean };
  saving: boolean;
  testing: boolean;
  syncing: boolean;
  onDraftChange: (providerCode: string, next: Partial<DraftState>) => void;
  onTest: (providerCode: string) => void;
  onSave: (providerCode: string) => void;
  onSyncModels: (providerCode: string) => void;
}

export function ProviderConfigCard(props: ProviderConfigCardProps) {
  const { item, draft, currentFeedback, saving, testing, syncing, onDraftChange, onTest, onSave, onSyncModels } = props;

  const textEndpoints = item.endpoints.filter((endpoint) => endpoint.modelKind === 'text');
  const imageEndpoints = item.endpoints.filter((endpoint) => endpoint.modelKind === 'image');
  const videoEndpoints = item.endpoints.filter((endpoint) => endpoint.modelKind === 'video');
  const audioEndpoints = item.endpoints.filter((endpoint) => endpoint.modelKind === 'audio');
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
                : `当前已收录 ${item.endpoints.length} 个模型（文本 ${textEndpoints.length} / 图片 ${imageEndpoints.length} / 视频 ${videoEndpoints.length} / 音频 ${audioEndpoints.length}）`}
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
            <input className={styles.input} value={draft.baseUrlOverride} onChange={(event) => onDraftChange(item.provider.code, { baseUrlOverride: event.target.value })} />
          </label>

          {textEndpoints.length || item.provider.code === 'ark' ? <ProviderModelSelectionSection providerCode={item.provider.code} modelKind="text" endpoints={textEndpoints} draft={draft} onDraftChange={onDraftChange} /> : null}
          {imageEndpoints.length || item.provider.code === 'ark' ? <ProviderModelSelectionSection providerCode={item.provider.code} modelKind="image" endpoints={imageEndpoints} draft={draft} onDraftChange={onDraftChange} /> : null}
          {videoEndpoints.length || item.provider.code === 'ark' ? <ProviderModelSelectionSection providerCode={item.provider.code} modelKind="video" endpoints={videoEndpoints} draft={draft} onDraftChange={onDraftChange} /> : null}
          {audioEndpoints.length || item.provider.code === 'ark' ? <ProviderModelSelectionSection providerCode={item.provider.code} modelKind="audio" endpoints={audioEndpoints} draft={draft} onDraftChange={onDraftChange} /> : null}

          <div className={styles.toggleRow}>
            <div className={styles.toggleCopy}>
              <strong>启用这个 Provider</strong>
              <span>关闭后，当前用户下的该 provider 不会参与实际执行。</span>
            </div>
            <button type="button" className={`${styles.toggle} ${draft.enabled ? styles.toggleOn : ''}`} onClick={() => onDraftChange(item.provider.code, { enabled: !draft.enabled })} aria-pressed={draft.enabled}>
              <span className={styles.toggleThumb} />
            </button>
          </div>

          <div className={styles.footer}>
            <div className={`${styles.feedback} ${currentFeedback?.error ? styles.feedbackError : ''}`}>{currentFeedback?.message ?? ''}</div>
            <div className={styles.footerActions}>
              {item.provider.code === 'platou' ? (
                <button type="button" className={styles.testButton} onClick={() => onSyncModels(item.provider.code)} disabled={syncing || saving}>
                  {syncing ? '同步模型中...' : '同步模型'}
                </button>
              ) : null}
              <button type="button" className={styles.testButton} onClick={() => onTest(item.provider.code)} disabled={testing || saving || syncing}>
                {testing ? '测试中...' : '测试连接'}
              </button>
              <button type="button" className={styles.saveButton} onClick={() => onSave(item.provider.code)} disabled={saving || syncing}>
                {saving ? '保存中...' : '保存配置'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
