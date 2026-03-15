'use client';

import { useMemo, useState } from 'react';

import {
  CollectionToolbar,
  CollectionToolbarChips,
  CollectionToolbarGroup,
  CollectionToolbarMeta,
  CollectionToolbarPill,
  CollectionToolbarSearch,
} from '@/features/shared/components/collection-toolbar';

import styles from './admin-model-directory-page.module.css';
import type { AdminModelEndpointItem } from '../lib/admin-models-api.server';
import { AdminShell } from './admin-shell';

type ModelKindFilter = 'all' | 'text' | 'image' | 'video' | 'audio';

function searchIndex(endpoint: AdminModelEndpointItem) {
  return [
    endpoint.label,
    endpoint.slug,
    endpoint.family.name,
    endpoint.family.slug,
    endpoint.provider.name,
    endpoint.provider.code,
    endpoint.remoteModelKey,
    endpoint.status,
  ].join(' ').toLowerCase();
}

export function AdminModelDirectoryPage(props: { endpoints: AdminModelEndpointItem[] }) {
  const [modelKindFilter, setModelKindFilter] = useState<ModelKindFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEndpoints = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return props.endpoints.filter((endpoint) => {
      if (modelKindFilter !== 'all' && endpoint.family.modelKind !== modelKindFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return searchIndex(endpoint).includes(normalizedSearch);
    });
  }, [modelKindFilter, props.endpoints, searchTerm]);

  const groups = useMemo(
    () =>
      filteredEndpoints.reduce<Record<string, AdminModelEndpointItem[]>>((acc, endpoint) => {
        const key = endpoint.family.modelKind;
        acc[key] ??= [];
        acc[key].push(endpoint);
        return acc;
      }, {}),
    [filteredEndpoints],
  );

  const kinds: Array<{ id: ModelKindFilter; label: string }> = [
    { id: 'all', label: '全部模型' },
    { id: 'text', label: '文本' },
    { id: 'image', label: '图片' },
    { id: 'video', label: '视频' },
    { id: 'audio', label: '音频' },
  ];

  return (
    <AdminShell pageTitle="模型目录" active="models">
      <div className={styles.shell}>
        <CollectionToolbar>
          <CollectionToolbarGroup nowrap>
            <CollectionToolbarChips>
              {kinds.map((kind) => (
                <CollectionToolbarPill
                  key={kind.id}
                  active={modelKindFilter === kind.id}
                  activeTone={kind.id === 'all' ? 'dark' : 'warm'}
                  inactiveStyle={kind.id === 'all' ? 'plain' : 'outlined'}
                  onClick={() => setModelKindFilter(kind.id)}
                >
                  {kind.label}
                </CollectionToolbarPill>
              ))}
            </CollectionToolbarChips>
            <CollectionToolbarSearch
              width={280}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="搜索模型名称、slug 或 provider"
            />
          </CollectionToolbarGroup>

          <CollectionToolbarGroup align="end" nowrap>
            <CollectionToolbarMeta>{`已展示 ${filteredEndpoints.length} 个 endpoint`}</CollectionToolbarMeta>
          </CollectionToolbarGroup>
        </CollectionToolbar>

        <section className={styles.header}>
          <div>
            <div className={styles.eyebrow}>Model Directory</div>
            <h1 className={styles.title}>系统模型目录</h1>
            <p className={styles.subtitle}>这里维护系统可见的模型目录与默认路由。用户自己的 API Key、连通性与 provider 设置仍保留在用户侧。</p>
          </div>
        </section>

        <div className={styles.groupList}>
          {Object.entries(groups).map(([modelKind, endpoints]) => (
            <section key={modelKind} className={styles.group}>
              <div className={styles.groupTitle}>{modelKind.toUpperCase()}</div>
              <div className={styles.groupHint}>{`共 ${endpoints.length} 个 endpoint`}</div>
              <div className={styles.grid}>
                {endpoints.map((endpoint) => (
                  <article key={endpoint.id} className={styles.card}>
                    <div className={styles.cardTop}>
                      <div>
                        <div className={styles.cardTitle}>{endpoint.label}</div>
                        <div className={styles.cardMeta}>{endpoint.slug}</div>
                      </div>
                      <span className={styles.pill}>{endpoint.status}</span>
                    </div>
                    <div className={styles.cardMeta}>{`${endpoint.family.name} / ${endpoint.provider.name}`}</div>
                    <div className={styles.cardMeta}>{`provider: ${endpoint.provider.code} · priority: ${endpoint.priority}`}</div>
                    <div className={styles.cardMeta}>{`remote model key: ${endpoint.remoteModelKey}`}</div>
                    <div className={styles.cardMeta}>{endpoint.isDefault ? '系统默认 endpoint' : '非默认 endpoint'}</div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}
