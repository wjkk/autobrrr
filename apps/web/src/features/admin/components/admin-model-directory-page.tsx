import styles from './admin-model-directory-page.module.css';
import type { AdminModelEndpointItem } from '../lib/admin-models-api.server';
import { AdminShell } from './admin-shell';

export function AdminModelDirectoryPage(props: { endpoints: AdminModelEndpointItem[] }) {
  const groups = props.endpoints.reduce<Record<string, AdminModelEndpointItem[]>>((acc, endpoint) => {
    const key = endpoint.family.modelKind;
    acc[key] ??= [];
    acc[key].push(endpoint);
    return acc;
  }, {});

  return (
    <AdminShell pageTitle="模型目录" active="models">
      <div className={styles.shell}>
        <section className={styles.header}>
          <div>
            <div className={styles.eyebrow}>Model Directory</div>
            <h1 className={styles.title}>系统模型目录</h1>
            <p className={styles.subtitle}>这里只看全局模型 family / provider / endpoint。用户自己的 API Key 与 provider 连通性配置仍留在用户侧设置页。</p>
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
