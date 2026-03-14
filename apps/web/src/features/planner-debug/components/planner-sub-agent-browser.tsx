'use client';

import Link from 'next/link';

import styles from './planner-agent-debug-page.module.css';

import type { PlannerSubAgentCatalogEntry } from '../lib/planner-agent-debug-types';

interface PlannerSubAgentBrowserProps {
  mode: 'manage' | 'debug';
  loading: boolean;
  entries: PlannerSubAgentCatalogEntry[];
  selectedSubAgentId: string | null;
  onSelect: (subAgentId: string) => void;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  contentTypeFilter: string;
  onContentTypeFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  availableContentTypes: string[];
}

function statusClass(status: string) {
  switch (status) {
    case 'active':
      return `${styles.status} ${styles.statusActive}`;
    case 'draft':
      return `${styles.status} ${styles.statusDraft}`;
    default:
      return `${styles.status} ${styles.statusOther}`;
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'active':
      return '已生效';
    case 'draft':
      return '草稿';
    case 'deprecated':
      return '已弃用';
    case 'archived':
      return '已归档';
    default:
      return status;
  }
}

export function PlannerSubAgentBrowser({
  mode,
  loading,
  entries,
  selectedSubAgentId,
  onSelect,
  searchTerm,
  onSearchTermChange,
  contentTypeFilter,
  onContentTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
  availableContentTypes,
}: PlannerSubAgentBrowserProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <h2 className={styles.panelTitle}>子 Agent 列表</h2>
          <p className={styles.panelHint}>{mode === 'manage' ? '选择一个子类型进入编辑与发布。' : '选择一个子类型进入调试。'}</p>
        </div>
      </div>
      <div className={styles.panelBody}>
        <div className={styles.stack}>
          <div className={styles.filterGrid}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>搜索</label>
              <input
                className={styles.input}
                placeholder="名称 / 子类型 / 标识"
                value={searchTerm}
                onChange={(event) => onSearchTermChange(event.target.value)}
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>内容类型</label>
              <select className={styles.select} value={contentTypeFilter} onChange={(event) => onContentTypeFilterChange(event.target.value)}>
                <option value="all">全部</option>
                {availableContentTypes.map((contentType) => (
                  <option key={contentType} value={contentType}>
                    {contentType}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>状态</label>
              <select className={styles.select} value={statusFilter} onChange={(event) => onStatusFilterChange(event.target.value)}>
                <option value="all">全部</option>
                <option value="active">已生效</option>
                <option value="draft">草稿</option>
                <option value="deprecated">已弃用</option>
                <option value="archived">已归档</option>
              </select>
            </div>
          </div>

          <div className={styles.catalogListMeta}>
            <span>共 {entries.length} 个子 Agent</span>
            {(searchTerm || contentTypeFilter !== 'all' || statusFilter !== 'all') ? (
              <button type="button" className={styles.inlineButton} onClick={() => {
                onSearchTermChange('');
                onContentTypeFilterChange('all');
                onStatusFilterChange('all');
              }}>
                清空筛选
              </button>
            ) : null}
          </div>

          <div className={styles.catalogList}>
            {loading ? <div className={styles.fieldHint}>正在加载配置…</div> : null}
            {!loading && !entries.length ? <div className={styles.fieldHint}>当前筛选条件下没有子 Agent。</div> : null}
            {entries.map(({ profile, subAgent }) => (
              <button
                key={subAgent.id}
                type="button"
                className={`${styles.catalogItem} ${selectedSubAgentId === subAgent.id ? styles.catalogItemActive : ''}`}
                onClick={() => onSelect(subAgent.id)}
              >
                <div className={styles.catalogTitle}>
                  <span>{subAgent.displayName}</span>
                  <span className={statusClass(subAgent.status)}>{statusLabel(subAgent.status)}</span>
                </div>
                <div className={styles.catalogMeta}>
                  <div>{profile.contentType} / {subAgent.subtype}</div>
                  <div>{subAgent.slug}</div>
                </div>
                <div className={styles.catalogMeta}>
                  {mode === 'manage' ? (
                    <Link
                      href={`/internal/planner-debug/${encodeURIComponent(subAgent.slug)}`}
                      onClick={(event) => event.stopPropagation()}
                    >
                      打开独立调试页
                    </Link>
                  ) : (
                    <Link
                      href="/internal/planner-debug/runs"
                      onClick={(event) => event.stopPropagation()}
                    >
                      查看全部回放
                    </Link>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
