import type { ReactNode } from 'react';

import type { SystemShellNavItem } from '../components/system-shell';

export type UserShellActiveKey = 'home' | 'projects' | 'subjects' | 'avatar';

function homeIcon(): ReactNode {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10L12 3l9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><line x1="12" y1="12" x2="12" y2="18"></line></svg>;
}

function projectsIcon(): ReactNode {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><line x1="9" y1="14" x2="15" y2="14"></line></svg>;
}

function subjectsIcon(): ReactNode {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 19v-1a4 4 0 0 1 4-4h2a4 4 0 0 1 4 4v1"></path><circle cx="12" cy="7" r="4"></circle><path d="M5 7H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h1"></path><path d="M19 7h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-1"></path></svg>;
}

function avatarIcon(): ReactNode {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" /><path d="M4 21v-2a4 4 0 0 1 4-4h4" /><path d="M19 6l1-1 1 1-1 1-1-1z" /><path d="M16 3l.5-.5.5.5-.5.5-.5-.5z" /></svg>;
}

export function buildUserShellNavItems(active: UserShellActiveKey): SystemShellNavItem[] {
  return [
    {
      key: 'home',
      label: '首页',
      title: '首页',
      href: '/explore',
      active: active === 'home',
      icon: homeIcon(),
    },
    {
      key: 'projects',
      label: '我的空间',
      title: '我的空间',
      href: '/my-space',
      active: active === 'projects',
      icon: projectsIcon(),
    },
    {
      key: 'subjects',
      label: '主体',
      title: '主体',
      href: '/settings/catalogs',
      active: active === 'subjects',
      icon: subjectsIcon(),
    },
    {
      key: 'avatar',
      label: '数字人',
      title: '数字人',
      noticeText: '数字人功能尚未开放，敬请期待。',
      active: active === 'avatar',
      icon: avatarIcon(),
    },
  ];
}
