'use client';

import Link from 'next/link';

import styles from './provider-config-page.module.css';

interface ProviderConfigAuthPanelProps {
  authMode: 'login' | 'register';
  authEmail: string;
  authPassword: string;
  authDisplayName: string;
  authSubmitting: boolean;
  authFeedback: string | null;
  onAuthModeChange: (mode: 'login' | 'register') => void;
  onAuthEmailChange: (value: string) => void;
  onAuthPasswordChange: (value: string) => void;
  onAuthDisplayNameChange: (value: string) => void;
  onSubmit: () => void;
}

export function ProviderConfigAuthPanel(props: ProviderConfigAuthPanelProps) {
  const {
    authMode,
    authEmail,
    authPassword,
    authDisplayName,
    authSubmitting,
    authFeedback,
    onAuthModeChange,
    onAuthEmailChange,
    onAuthPasswordChange,
    onAuthDisplayNameChange,
    onSubmit,
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
            <button type="button" className={`${styles.authTab} ${authMode === 'login' ? styles.authTabActive : ''}`} onClick={() => onAuthModeChange('login')}>
              登录
            </button>
            <button type="button" className={`${styles.authTab} ${authMode === 'register' ? styles.authTabActive : ''}`} onClick={() => onAuthModeChange('register')}>
              注册
            </button>
          </div>

          <div className={styles.authFields}>
            {authMode === 'register' ? (
              <input className={styles.input} value={authDisplayName} onChange={(event) => onAuthDisplayNameChange(event.target.value)} placeholder="显示名称（可选）" />
            ) : null}
            <input className={styles.input} type="email" value={authEmail} onChange={(event) => onAuthEmailChange(event.target.value)} placeholder="邮箱" />
            <input className={styles.input} type="password" value={authPassword} onChange={(event) => onAuthPasswordChange(event.target.value)} placeholder="密码（至少 8 位）" />
          </div>

          <div className={styles.authFooter}>
            <div className={`${styles.feedback} ${authFeedback ? styles.feedbackError : ''}`}>{authFeedback ?? ''}</div>
            <button type="button" className={styles.saveButton} onClick={onSubmit} disabled={authSubmitting}>
              {authSubmitting ? '提交中...' : authMode === 'login' ? '登录' : '注册并登录'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
