'use client';

import styles from './catalog-management-page.module.css';
import { SystemShell } from '../../shared/components/system-shell';
import { CatalogManagementAuthGate } from './catalog-management-auth-gate';
import { CatalogManagementDialogs } from './catalog-management-dialogs';
import { CatalogCardGrid } from './catalog-card-grid';
import { CatalogLibraryToolbar } from './catalog-library-toolbar';
import { useCatalogManagementPageState } from '../hooks/use-catalog-management-page-state';
import type {
  CatalogStyleItem,
  CatalogSubjectItem,
  CatalogTab,
  SettingsAuthUser,
} from '../lib/catalog-management-api';

interface CatalogManagementPageProps {
  currentUser: SettingsAuthUser | null;
  initialSubjects: CatalogSubjectItem[];
  initialStyles: CatalogStyleItem[];
  initialTab: CatalogTab;
  mode?: 'user' | 'admin';
  scopeMode?: 'all' | 'publicOnly';
}

export function CatalogManagementPage(props: CatalogManagementPageProps) {
  const state = useCatalogManagementPageState(props);

  if (!state.currentUser) {
    return <CatalogManagementAuthGate {...state.authGate} />;
  }

  return (
    <SystemShell
      pageTitle={state.shell.pageTitle}
      navItems={state.shell.navItems}
      topActions={state.shell.topActions}
    >
      <div className={styles.contentShell}>
        <CatalogLibraryToolbar {...state.toolbar} />

        <section className={styles.workspace}>
          <div className={styles.galleryPane}>
            <CatalogCardGrid {...state.grid} />
          </div>
        </section>

        <CatalogManagementDialogs {...state.dialogs} />
      </div>
    </SystemShell>
  );
}
