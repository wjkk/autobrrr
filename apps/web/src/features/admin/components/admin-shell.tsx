'use client';

import { SystemShell } from '@/features/shared/components/system-shell';

export function AdminShell(props: { pageTitle: string; active: 'dashboard' | 'planner' | 'catalogs' | 'models'; children: React.ReactNode }) {
  return (
    <SystemShell
      pageTitle={props.pageTitle}
      navItems={[
        { key: 'dashboard', label: '后台首页', title: '后台首页', href: '/admin', active: props.active === 'dashboard', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="14" width="7" height="7" rx="1.5"></rect><rect x="3" y="14" width="7" height="7" rx="1.5"></rect></svg> },
        { key: 'planner', label: 'Agent 管理', title: 'Agent 管理', href: '/admin/planner-agents', active: props.active === 'planner', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4"></path><path d="M12 18v4"></path><path d="M4.93 4.93l2.83 2.83"></path><path d="M16.24 16.24l2.83 2.83"></path><path d="M2 12h4"></path><path d="M18 12h4"></path><path d="M4.93 19.07l2.83-2.83"></path><path d="M16.24 7.76l2.83-2.83"></path><circle cx="12" cy="12" r="4"></circle></svg> },
        { key: 'catalogs', label: '公共目录', title: '公共目录', href: '/admin/catalogs', active: props.active === 'catalogs', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><line x1="9" y1="14" x2="15" y2="14"></line></svg> },
        { key: 'models', label: '模型目录', title: '模型目录', href: '/admin/models', active: props.active === 'models', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="7" ry="3"></ellipse><path d="M5 5v6c0 1.66 3.13 3 7 3s7-1.34 7-3V5"></path><path d="M5 11v8c0 1.66 3.13 3 7 3s7-1.34 7-3v-8"></path></svg> },
      ]}
      topActions={[
        { key: 'catalogs', label: '用户侧目录', href: '/settings/catalogs' },
        { key: 'providers', label: '用户 API Key 设置', href: '/settings/providers' },
      ]}
      badge={{ strong: 'Admin', label: '系统后台', href: '/admin' }}
    >
      {props.children}
    </SystemShell>
  );
}
