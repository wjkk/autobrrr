'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import styles from './system-shell.module.css';

export interface SystemShellNavItem {
  key: string;
  label: string;
  title: string;
  icon: ReactNode;
  active?: boolean;
  href?: string;
  onClick?: () => void;
  noticeText?: string;
}

export interface SystemShellActionItem {
  key: string;
  label: string;
  icon?: ReactNode;
  href?: string;
  onClick?: () => void;
  noticeText?: string;
}

export interface SystemShellBadge {
  strong: string;
  label: string;
  href?: string;
  onClick?: () => void;
}

export function SystemShell(props: {
  pageTitle: string;
  navItems: SystemShellNavItem[];
  topActions?: SystemShellActionItem[];
  badge?: SystemShellBadge;
  children: ReactNode;
}) {
  const router = useRouter();
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!notice) {
      return;
    }
    const timer = window.setTimeout(() => setNotice(''), 2400);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const trigger = (href?: string, onClick?: () => void, noticeText?: string) => {
    if (onClick) {
      onClick();
    }
    if (!onClick && href) {
      router.push(href);
    }
    if (noticeText) {
      setNotice(noticeText);
    }
  };

  return (
    <div className={styles.page}>
      <aside className={styles.globalSidebar}>
        <div className={styles.sidebarGroup}>
          <div className={styles.brandMark} onClick={() => router.push('/explore')}>
            <span style={{ fontWeight: 800, fontSize: 18, fontStyle: 'italic', color: 'var(--text-primary)' }}>S</span>
          </div>
          {props.navItems.map((item) => (
            <button
              key={item.key}
              className={`${styles.navBtn} ${item.active ? styles.navBtnActive : ''}`}
              aria-label={item.label}
              title={item.title}
              onClick={() => trigger(item.href, item.onClick, item.noticeText)}
            >
              {item.icon}
            </button>
          ))}
        </div>

        <div className={styles.sidebarGroup}>
          {props.badge ? (
            <button className={styles.vipBadge} onClick={() => trigger(props.badge?.href, props.badge?.onClick)}>
              <strong>{props.badge.strong}</strong>
              <span>{props.badge.label}</span>
            </button>
          ) : null}
          <button className={styles.utilBtn} aria-label="Profile" onClick={() => router.push('/profile')}>
            <div className={styles.avatar}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
            </div>
          </button>
          <button className={styles.utilBtn} aria-label="Notifications" onClick={() => router.push('/notifications')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          </button>
          <button className={styles.utilBtn} aria-label="Feedback" onClick={() => router.push('/feedback')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path><circle cx="9" cy="10" r="1.5" fill="currentColor"></circle><circle cx="12" cy="10" r="1.5" fill="currentColor"></circle><circle cx="15" cy="10" r="1.5" fill="currentColor"></circle></svg>
          </button>
        </div>
      </aside>

      <header className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <span className={styles.brandTitle}>AIV Studio</span>
          <span className={styles.divider}>/</span>
          <span className={styles.pageTitle}>{props.pageTitle}</span>
        </div>
        <div className={styles.topBarRight}>
          {(props.topActions ?? []).map((item) => (
            <button key={item.key} className={styles.actionBtn} onClick={() => trigger(item.href, item.onClick, item.noticeText)}>
              {item.icon ?? null}
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <div className={styles.pageScrollContainer}>
        {props.children}
        {notice ? <div className={styles.noticeToast}>{notice}</div> : null}
      </div>
    </div>
  );
}
