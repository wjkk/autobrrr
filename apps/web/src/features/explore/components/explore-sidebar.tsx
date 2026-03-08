'use client';

import { cx } from '@aiv/ui';

import styles from './explore-page.module.css';
import type { ExploreSidebarNav } from './explore-page.types';

interface ExploreSidebarProps {
  activeNav: ExploreSidebarNav;
  onNavChange: (nav: ExploreSidebarNav) => void;
  onGoExplore: () => void;
  onGoVip: () => void;
  onGoProfile: () => void;
  onGoNotifications: () => void;
  onGoFeedback: () => void;
}

export function ExploreSidebar({
  activeNav,
  onNavChange,
  onGoExplore,
  onGoVip,
  onGoProfile,
  onGoNotifications,
  onGoFeedback,
}: ExploreSidebarProps) {
  return (
    <aside className={styles.globalSidebar}>
      <div className={styles.sidebarGroup}>
        <div className={styles.brandMark} onClick={onGoExplore}>
          <span style={{ fontWeight: 800, fontSize: 18, fontStyle: 'italic' }}>S</span>
        </div>
        <button className={cx(styles.navBtn, activeNav === 'home' && styles.navBtnActive)} aria-label="首页" title="首页" onClick={() => onNavChange('home')}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10L12 3l9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path><line x1="12" y1="12" x2="12" y2="18"></line></svg>
        </button>
        <button className={cx(styles.navBtn, activeNav === 'projects' && styles.navBtnActive)} aria-label="作品" title="我的资产" onClick={() => onNavChange('projects')}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><line x1="9" y1="14" x2="15" y2="14"></line></svg>
        </button>
        <button className={cx(styles.navBtn, activeNav === 'avatar' && styles.navBtnActive)} aria-label="资产" title="数字分身" onClick={() => onNavChange('avatar')}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" /><path d="M4 21v-2a4 4 0 0 1 4-4h4" /><path d="M19 6l1-1 1 1-1 1-1-1z" /><path d="M16 3l.5-.5.5.5-.5.5-.5-.5z" /></svg>
        </button>
        <button className={cx(styles.navBtn, activeNav === 'voice' && styles.navBtnActive)} aria-label="社区" title="声音克隆" onClick={() => onNavChange('voice')}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" /><path d="M4 21v-2a4 4 0 0 1 4-4h4" /><line x1="16" y1="16" x2="16" y2="20" /><line x1="19" y1="15" x2="19" y2="21" /><line x1="22" y1="17" x2="22" y2="19" /></svg>
        </button>
      </div>

      <div className={styles.sidebarGroup}>
        <button className={styles.vipBadge} onClick={onGoVip}>
          <strong>✦ 99</strong>
          <span>开通会员</span>
        </button>
        <button className={styles.utilBtn} aria-label="Profile" onClick={onGoProfile}>
          <div className={styles.avatar}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
          </div>
        </button>
        <button className={styles.utilBtn} aria-label="Notifications" onClick={onGoNotifications}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
        </button>
        <button className={styles.utilBtn} aria-label="Feedback" onClick={onGoFeedback}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path><circle cx="9" cy="10" r="1.5" fill="currentColor"></circle><circle cx="12" cy="10" r="1.5" fill="currentColor"></circle><circle cx="15" cy="10" r="1.5" fill="currentColor"></circle></svg>
        </button>
      </div>
    </aside>
  );
}
