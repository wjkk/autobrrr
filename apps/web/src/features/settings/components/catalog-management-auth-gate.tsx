'use client';

import { AuthRequiredPanel } from '../../shared/components/auth-required-panel';
import { SystemShell } from '../../shared/components/system-shell';
import styles from './catalog-management-page.module.css';

interface CatalogManagementAuthGateProps {
  adminMode: boolean;
  authMode: 'login' | 'register';
  authEmail: string;
  authPassword: string;
  authDisplayName: string;
  authSubmitting: boolean;
  authFeedback: string;
  onAuthModeChange: (mode: 'login' | 'register') => void;
  onAuthEmailChange: (value: string) => void;
  onAuthPasswordChange: (value: string) => void;
  onAuthDisplayNameChange: (value: string) => void;
  onSubmitAuth: () => void;
}

export function CatalogManagementAuthGate({
  adminMode,
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
  onSubmitAuth,
}: CatalogManagementAuthGateProps) {
  return (
    <SystemShell
      pageTitle={adminMode ? '系统目录管理' : '主体库'}
      navItems={[]}
      topActions={[{ key: 'home', label: adminMode ? '返回后台首页' : '返回首页', href: adminMode ? '/admin' : '/explore' }]}
    >
      <AuthRequiredPanel
        eyebrow="Characters"
        title="先登录，再管理你的主体库与画风库"
        description="目录项写入当前用户对应的数据表。登录后，你就能像素材库一样浏览主体卡片，同时继续编辑 prompt 模板和参考图配置。"
      >
        <div className={styles.contentShell}>
          <section className={styles.authCard}>
            <div className={styles.authTabs}>
              <button type="button" className={`${styles.authTab} ${authMode === 'login' ? styles.authTabActive : ''}`} onClick={() => onAuthModeChange('login')}>登录</button>
              <button type="button" className={`${styles.authTab} ${authMode === 'register' ? styles.authTabActive : ''}`} onClick={() => onAuthModeChange('register')}>注册</button>
            </div>
            <div className={styles.authFields}>
              {authMode === 'register' ? (
                <input className={styles.input} value={authDisplayName} onChange={(event) => onAuthDisplayNameChange(event.target.value)} placeholder="显示名称（可选）" />
              ) : null}
              <input className={styles.input} type="email" value={authEmail} onChange={(event) => onAuthEmailChange(event.target.value)} placeholder="邮箱" />
              <input className={styles.input} type="password" value={authPassword} onChange={(event) => onAuthPasswordChange(event.target.value)} placeholder="密码（至少 8 位）" />
            </div>
            {authFeedback ? <div className={`${styles.feedback} ${styles.feedbackError}`}>{authFeedback}</div> : null}
            <button type="button" className={styles.primaryButton} onClick={onSubmitAuth} disabled={authSubmitting}>
              {authSubmitting ? '提交中...' : authMode === 'login' ? '登录' : '注册并登录'}
            </button>
          </section>
        </div>
      </AuthRequiredPanel>
    </SystemShell>
  );
}
