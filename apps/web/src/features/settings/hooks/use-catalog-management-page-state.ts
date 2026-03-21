'use client';

import { useState, type ComponentProps } from 'react';
import { useRouter } from 'next/navigation';

import type {
  CatalogStyleItem,
  CatalogSubjectItem,
  CatalogTab,
  SettingsAuthUser,
} from '../lib/catalog-management-api';
import { fetchCatalogCollections } from '../lib/catalog-management-client';
import { buildUserShellNavItems } from '../../shared/lib/user-shell-nav';
import { catalogManagementAdminNavItems } from '../components/catalog-management-admin-nav';
import { CatalogCardGrid } from '../components/catalog-card-grid';
import { CatalogLibraryToolbar } from '../components/catalog-library-toolbar';
import { CatalogManagementAuthGate } from '../components/catalog-management-auth-gate';
import { CatalogManagementDialogs } from '../components/catalog-management-dialogs';
import { useCatalogAuthState } from './catalog-management/use-catalog-auth-state';
import { useCatalogCrudActions } from './catalog-management/use-catalog-crud-actions';
import { useCatalogEditorState } from './catalog-management/use-catalog-editor-state';
import { useCatalogFilterState } from './catalog-management/use-catalog-filter-state';
import { useCatalogImageActions } from './catalog-management/use-catalog-image-actions';
import type { SystemShellActionItem, SystemShellBadge, SystemShellNavItem } from '../../shared/components/system-shell';

interface CatalogManagementPageProps {
  currentUser: SettingsAuthUser | null;
  initialSubjects: CatalogSubjectItem[];
  initialStyles: CatalogStyleItem[];
  initialTab: CatalogTab;
  mode?: 'user' | 'admin';
  scopeMode?: 'all' | 'publicOnly';
}

interface CatalogManagementPageState {
  currentUser: SettingsAuthUser | null;
  authGate: ComponentProps<typeof CatalogManagementAuthGate>;
  shell: {
    pageTitle: string;
    navItems: SystemShellNavItem[];
    topActions: SystemShellActionItem[];
    badge: SystemShellBadge;
  };
  toolbar: ComponentProps<typeof CatalogLibraryToolbar>;
  grid: ComponentProps<typeof CatalogCardGrid>;
  dialogs: ComponentProps<typeof CatalogManagementDialogs>;
}

export function useCatalogManagementPageState(props: CatalogManagementPageProps): CatalogManagementPageState {
  const router = useRouter();
  const adminMode = props.mode === 'admin';
  const publicOnly = props.scopeMode === 'publicOnly';
  const editor = useCatalogEditorState({
    initialSubjects: props.initialSubjects,
    initialStyles: props.initialStyles,
    router,
  });
  const filters = useCatalogFilterState({
    initialTab: props.initialTab,
    subjects: editor.subjects,
    styles: editor.stylesList,
  });
  const imageActions = useCatalogImageActions({
    subjectDraft: editor.subjectDraft,
    setSubjectDraft: editor.setSubjectDraft,
  });

  const [feedback, setFeedback] = useState('');
  const [feedbackError, setFeedbackError] = useState(false);

  const triggerFeedback = (message: string, isError = false) => {
    setFeedback(message);
    setFeedbackError(isError);
  };

  const syncCatalogCollections = async () => {
    const nextCollections = await fetchCatalogCollections(publicOnly);
    editor.applyCollections(nextCollections);
  };

  const auth = useCatalogAuthState({
    initialUser: props.currentUser,
    syncCatalogCollections,
    resetCollections: editor.resetCollections,
  });

  const crud = useCatalogCrudActions({
    publicOnly,
    subjectDraft: editor.subjectDraft,
    styleDraft: editor.styleDraft,
    syncCatalogCollections,
    setSelectedSubjectId: editor.setSelectedSubjectId,
    setSubjectDraft: editor.setSubjectDraft,
    setSelectedStyleId: editor.setSelectedStyleId,
    setStyleDraft: editor.setStyleDraft,
    triggerFeedback,
  });

  const pageTitle = adminMode
    ? (filters.renderingSubjects ? '公共主体库' : '公共画风库')
    : (filters.renderingSubjects ? '主体库' : '画风库');

  return {
    currentUser: auth.currentUser,
    authGate: {
      adminMode,
      authMode: auth.authMode,
      authEmail: auth.authEmail,
      authPassword: auth.authPassword,
      authDisplayName: auth.authDisplayName,
      authSubmitting: auth.authSubmitting,
      authFeedback: auth.authFeedback,
      onAuthModeChange: auth.setAuthMode,
      onAuthEmailChange: auth.setAuthEmail,
      onAuthPasswordChange: auth.setAuthPassword,
      onAuthDisplayNameChange: auth.setAuthDisplayName,
      onSubmitAuth: auth.submitAuth,
    },
    shell: {
      pageTitle,
      navItems: adminMode ? catalogManagementAdminNavItems : buildUserShellNavItems('subjects'),
      topActions: [
        ...(adminMode ? [{ key: 'dashboard', label: '后台首页', href: '/admin' }] : []),
        { key: 'providers', label: adminMode ? '用户 API Key 设置' : '接口配置', href: '/settings/providers' },
        { key: 'logout', label: '退出登录', onClick: auth.logout },
      ],
      badge: {
        strong: String(filters.renderingSubjects ? editor.subjects.length : editor.stylesList.length),
        label: filters.renderingSubjects ? '主体目录' : '画风目录',
        onClick: () => filters.setActiveTab(filters.renderingSubjects ? 'styles' : 'subjects'),
      },
    },
    toolbar: {
      activeTab: filters.activeTab,
      visibilityFilter: filters.visibilityFilter,
      publicOnly,
      subjectTypeFilter: filters.subjectTypeFilter,
      searchTerm: filters.searchTerm,
      visibleItemsCount: filters.visibleItemsCount,
      onTabChange: filters.setActiveTab,
      onVisibilityFilterChange: filters.setVisibilityFilter,
      onSubjectTypeFilterChange: filters.setSubjectTypeFilter,
      onSearchTermChange: filters.setSearchTerm,
      onCreate: () => {
        editor.startNew(filters.renderingSubjects);
        imageActions.resetImageState();
        triggerFeedback('', false);
      },
    },
    grid: {
      tab: filters.activeTab,
      selectedSubjectId: editor.selectedSubjectId,
      selectedStyleId: editor.selectedStyleId,
      filteredSubjects: filters.filteredSubjects,
      filteredStyles: filters.filteredStyles,
      onSelectSubject: editor.selectSubject,
      onSelectStyle: editor.selectStyle,
    },
    dialogs: {
      renderingSubjects: filters.renderingSubjects,
      editorOpen: editor.editorOpen,
      subjectDraft: editor.subjectDraft,
      styleDraft: editor.styleDraft,
      saving: crud.saving,
      feedback,
      feedbackError,
      imageSubmitting: imageActions.imageSubmitting,
      imageFeedback: imageActions.imageFeedback,
      imageFeedbackTone: imageActions.imageFeedbackTone,
      imageMode: imageActions.subjectImageMode,
      imagePrompt: imageActions.subjectImagePrompt,
      imagePreviewPulse: imageActions.imagePreviewPulse,
      setSubjectDraft: editor.setSubjectDraft,
      setStyleDraft: editor.setStyleDraft,
      setImageMode: imageActions.setSubjectImageMode,
      setImagePrompt: imageActions.setSubjectImagePrompt,
      onClose: () => {
        editor.closeEditor();
        imageActions.resetImageState();
        triggerFeedback('', false);
      },
      onUseForCreation: () => editor.useSubjectForCreation(triggerFeedback),
      onSaveSubject: crud.handleSubjectSave,
      onUploadImage: (file) => void imageActions.handleSubjectImageUpload(file),
      onGenerateImage: () => void imageActions.handleSubjectImageGeneration(),
      onSaveStyle: crud.handleStyleSave,
    },
  };
}
