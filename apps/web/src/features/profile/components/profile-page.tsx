'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { MySpaceProjectItem } from '../../my-space/lib/my-space-api.server';
import type { ProviderConfigItem } from '../../settings/lib/provider-config-api';
import { AuthRequiredPanel } from '../../shared/components/auth-required-panel';
import { SystemShell } from '../../shared/components/system-shell';
import type { SharedAuthUser } from '../../shared/lib/auth-user.server';
import { buildUserShellNavItems } from '../../shared/lib/user-shell-nav';
import styles from './profile-page.module.css';

const quickLinks = [
  { href: '/my-space', title: '我的空间', description: '回到项目列表，继续策划、生成和发布。' },
  { href: '/settings/providers', title: '接口配置', description: '管理模型接口、测试状态和可用 Provider。' },
  { href: '/settings/catalogs', title: '管理目录', description: '维护主体、风格和后续可复用素材。' },
];

const roadmap = [
  { title: '积分与账单', description: '点数余额、消耗明细、套餐和发票入口。' },
  { title: '通知中心', description: '任务完成、失败告警、发布反馈、系统公告。' },
  { title: '安全与授权', description: '登录设备、API 授权、第三方绑定、操作审计。' },
];

function formatRelativeDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '未知时间';
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function summarizePreferredType(projects: MySpaceProjectItem[]) {
  const counts = new Map<string, number>();
  for (const project of projects) {
    const key = project.creationConfig?.selectedTab?.trim() || '未分类';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const top = Array.from(counts.entries()).sort((left, right) => right[1] - left[1])[0];
  return top ? `${top[0]} · ${top[1]} 个项目` : '暂无偏好数据';
}

export function ProfilePage(props: {
  currentUser: SharedAuthUser | null;
  projects: MySpaceProjectItem[];
  providerConfigs: ProviderConfigItem[];
  projectsError?: string | null;
  authRequired?: boolean;
}) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [displayName, setDisplayName] = useState(props.currentUser?.displayName ?? '');
  const [profileDraft, setProfileDraft] = useState(props.currentUser?.displayName ?? '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState('');
  const configuredProviders = props.providerConfigs.filter((item) => item.userConfig.configured);
  const enabledProviders = props.providerConfigs.filter((item) => item.userConfig.enabled);
  const recentProjects = [...props.projects]
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .slice(0, 3);

  const handleLogout = async () => {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Accept: 'application/json' },
      });
      router.replace('/explore');
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!props.currentUser || profileSaving) {
      return;
    }

    setProfileSaving(true);
    setProfileFeedback('');
    try {
      const response = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          displayName: profileDraft.trim(),
        }),
      });
      const payload = (await response.json()) as {
        ok: boolean;
        data?: { displayName: string | null };
        error?: { message?: string };
      };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error?.message ?? '保存失败。');
      }

      const nextDisplayName = payload.data?.displayName ?? '';
      setDisplayName(nextDisplayName);
      setProfileDraft(nextDisplayName);
      setProfileFeedback('资料已更新。');
      router.refresh();
    } catch (error) {
      setProfileFeedback(error instanceof Error ? error.message : '保存失败。');
    } finally {
      setProfileSaving(false);
    }
  };

  return (
    <SystemShell
      pageTitle="个人中心"
      navItems={buildUserShellNavItems('none')}
      topActions={[
        { key: 'providers', label: '接口配置', href: '/settings/providers' },
        { key: 'catalogs', label: '管理目录', href: '/settings/catalogs' },
      ]}
    >
      <div className={styles.page}>
        {props.authRequired || !props.currentUser ? (
          <AuthRequiredPanel
            eyebrow="Profile"
            title="先登录，再进入个人中心"
            description="登录后这里会展示你的账号信息、项目概况、Provider 配置状态，以及后续接入的点数和通知数据。"
          />
        ) : null}

        {props.currentUser ? (
          <>
            <section className={styles.hero}>
              <div>
                <p className={styles.eyebrow}>Profile</p>
                <h1 className={styles.title}>个人中心</h1>
                <p className={styles.description}>
                  当前已经接入真实账户、项目列表和 Provider 配置数据。
                  下一步最值得做的是点数、通知、安全与账单，不再需要继续做静态占位。
                </p>
              </div>
              <div className={styles.identityCard}>
                <div className={styles.avatar}>{(displayName || props.currentUser.email || 'A').slice(0, 1).toUpperCase()}</div>
                <div className={styles.identityBody}>
                  <div className={styles.identityMeta}>
                    <strong>{displayName || '未命名用户'}</strong>
                    <span>{props.currentUser.email}</span>
                    <span>{`已创建 ${props.projects.length} 个项目 · 已配置 ${configuredProviders.length} 个 Provider`}</span>
                  </div>
                  <button
                    type="button"
                    className={styles.logoutButton}
                    onClick={handleLogout}
                    disabled={loggingOut}
                  >
                    {loggingOut ? '退出中...' : '退出登录'}
                  </button>
                </div>
              </div>
            </section>

            <section className={styles.grid}>
              <article className={styles.panel}>
                <h2>账号与创作概况</h2>
                <ul className={styles.list}>
                  <li>
                    <strong>最近活跃项目</strong>
                    <span>{recentProjects[0] ? `${recentProjects[0].title} · ${formatRelativeDate(recentProjects[0].updatedAt)}` : '暂无项目'}</span>
                  </li>
                  <li>
                    <strong>常用创作类型</strong>
                    <span>{summarizePreferredType(props.projects)}</span>
                  </li>
                  <li>
                    <strong>Provider 状态</strong>
                    <span>{`已启用 ${enabledProviders.length} / ${props.providerConfigs.length}，已完成配置 ${configuredProviders.length}`}</span>
                  </li>
                  <li>
                    <strong>项目读取状态</strong>
                    <span>{props.projectsError ? `异常：${props.projectsError}` : '读取正常'}</span>
                  </li>
                </ul>
              </article>

              <article className={styles.panel}>
                <h2>下一批高价值功能</h2>
                <ul className={styles.list}>
                  {roadmap.map((item) => (
                    <li key={item.title}>
                      <strong>{item.title}</strong>
                      <span>{item.description}</span>
                    </li>
                  ))}
                </ul>
              </article>
            </section>

            <section className={styles.grid}>
              <article className={styles.panel}>
                <h2>当前可用入口</h2>
                <div className={styles.linkList}>
                  {quickLinks.map((item) => (
                    <Link key={item.href} href={item.href} className={styles.quickLink}>
                      <strong>{item.title}</strong>
                      <span>{item.description}</span>
                    </Link>
                  ))}
                </div>
              </article>

              <article className={styles.panel}>
                <h2>最近项目</h2>
                <div className={styles.linkList}>
                  {recentProjects.length ? recentProjects.map((item) => (
                    <Link key={item.id} href={`/projects/${item.id}/planner`} className={styles.quickLink}>
                      <strong>{item.title}</strong>
                      <span>{`${item.creationConfig?.selectedTab ?? '未分类'} · ${formatRelativeDate(item.updatedAt)}`}</span>
                    </Link>
                  )) : <div className={styles.emptyHint}>还没有项目，先去创作广场新建一个。</div>}
                </div>
              </article>
            </section>

            <section className={styles.metrics}>
              <article className={styles.metricCard}>
                <span>账户资料</span>
                <strong>{displayName || '未命名用户'}</strong>
                <p>{props.currentUser.email}</p>
                <div className={styles.profileEditor}>
                  <label className={styles.profileEditorLabel} htmlFor="profile-display-name">昵称</label>
                  <input
                    id="profile-display-name"
                    className={styles.profileEditorInput}
                    value={profileDraft}
                    onChange={(event) => setProfileDraft(event.target.value)}
                    placeholder="输入你的昵称"
                    maxLength={64}
                  />
                  <div className={styles.profileEditorActions}>
                    <button
                      type="button"
                      className={styles.profileSaveButton}
                      onClick={handleSaveProfile}
                      disabled={profileSaving || profileDraft.trim() === displayName}
                    >
                      {profileSaving ? '保存中...' : '保存昵称'}
                    </button>
                    {profileFeedback ? <span className={styles.profileFeedback}>{profileFeedback}</span> : null}
                  </div>
                </div>
              </article>
              <article className={styles.metricCard}>
                <span>项目数量</span>
                <strong>{String(props.projects.length)}</strong>
                <p>后续可以补最近 30 天活跃度、内容类型分布与恢复入口。</p>
              </article>
              <article className={styles.metricCard}>
                <span>Provider 配置</span>
                <strong>{`${configuredProviders.length}/${props.providerConfigs.length}`}</strong>
                <p>下一步可以继续接默认模型、测试结果和最近同步时间。</p>
              </article>
            </section>
          </>
        ) : null}
      </div>
    </SystemShell>
  );
}
