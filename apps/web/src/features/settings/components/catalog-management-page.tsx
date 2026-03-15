'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import type {
  CatalogStyleItem,
  CatalogSubjectItem,
  CatalogTab,
  CatalogVisibility,
  SettingsAuthUser,
  SubjectGenderTag,
  SubjectType,
} from '../lib/catalog-management-api';
import styles from './catalog-management-page.module.css';
import { AuthRequiredPanel } from '../../shared/components/auth-required-panel';
import { SystemShell } from '../../shared/components/system-shell';
import { buildUserShellNavItems } from '../../shared/lib/user-shell-nav';
import { CatalogCardGrid } from './catalog-card-grid';
import type { StyleDraft, SubjectDraft } from './catalog-management-editor-types';
import { CatalogLibraryToolbar } from './catalog-library-toolbar';
import { CatalogStyleDialog } from './catalog-style-dialog';
import { CatalogSubjectDialog } from './catalog-subject-dialog';

interface CatalogManagementPageProps {
  currentUser: SettingsAuthUser | null;
  initialSubjects: CatalogSubjectItem[];
  initialStyles: CatalogStyleItem[];
  initialTab: CatalogTab;
  mode?: 'user' | 'admin';
  scopeMode?: 'all' | 'publicOnly';
}

interface ApiErrorPayload {
  code?: string;
  message?: string;
}

type ApiEnvelope<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiErrorPayload };

function parseApiEnvelope<T>(payload: unknown): ApiEnvelope<T> {
  return payload as ApiEnvelope<T>;
}

function stringifyJson(value: unknown) {
  if (!value) {
    return '';
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return '';
  }
}

function parseTags(input: string) {
  return input
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function parseMetadata(input: string) {
  const normalized = input.trim();
  if (!normalized) {
    return undefined;
  }

  return JSON.parse(normalized) as Record<string, unknown>;
}

function makeEmptySubjectDraft(): SubjectDraft {
  return {
    id: null,
    slug: '',
    name: '',
    visibility: 'personal',
    subjectType: 'human',
    genderTag: 'unknown',
    imageUrl: '',
    referenceImageUrl: '',
    description: '',
    promptTemplate: '',
    negativePrompt: '',
    tags: '',
    metadata: '',
    enabled: true,
    sortOrder: 100,
  };
}

function makeEmptyStyleDraft(): StyleDraft {
  return {
    id: null,
    slug: '',
    name: '',
    visibility: 'personal',
    imageUrl: '',
    description: '',
    promptTemplate: '',
    negativePrompt: '',
    tags: '',
    metadata: '',
    enabled: true,
    sortOrder: 100,
  };
}

function subjectToDraft(subject: CatalogSubjectItem): SubjectDraft {
  return {
    id: subject.id,
    slug: subject.slug,
    name: subject.name,
    visibility: subject.visibility,
    subjectType: subject.subjectType,
    genderTag: subject.genderTag,
    imageUrl: subject.imageUrl,
    referenceImageUrl: subject.referenceImageUrl ?? '',
    description: subject.description ?? '',
    promptTemplate: subject.promptTemplate ?? '',
    negativePrompt: subject.negativePrompt ?? '',
    tags: Array.isArray(subject.tags) ? subject.tags.join(', ') : '',
    metadata: stringifyJson(subject.metadata),
    enabled: subject.enabled ?? true,
    sortOrder: subject.sortOrder ?? 100,
  };
}

function styleToDraft(style: CatalogStyleItem): StyleDraft {
  return {
    id: style.id,
    slug: style.slug,
    name: style.name,
    visibility: style.visibility,
    imageUrl: style.imageUrl,
    description: style.description ?? '',
    promptTemplate: style.promptTemplate ?? '',
    negativePrompt: style.negativePrompt ?? '',
    tags: Array.isArray(style.tags) ? style.tags.join(', ') : '',
    metadata: stringifyJson(style.metadata),
    enabled: style.enabled ?? true,
    sortOrder: style.sortOrder ?? 100,
  };
}

function nextImageFeedbackTone(message: string, isError: boolean): 'idle' | 'pending' | 'success' | 'error' {
  if (!message) {
    return 'idle';
  }
  if (isError) {
    return 'error';
  }
  if (message.includes('正在') || message.includes('中…')) {
    return 'pending';
  }
  return 'success';
}

export function CatalogManagementPage(props: CatalogManagementPageProps) {
  const router = useRouter();
  const previousSubjectImageUrlRef = useRef('');
  const [currentUser, setCurrentUser] = useState<SettingsAuthUser | null>(props.currentUser);
  const [activeTab, setActiveTab] = useState<CatalogTab>(props.initialTab);
  const [subjects, setSubjects] = useState<CatalogSubjectItem[]>(props.initialSubjects);
  const [stylesList, setStylesList] = useState<CatalogStyleItem[]>(props.initialStyles);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(props.initialSubjects[0]?.id ?? null);
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(props.initialStyles[0]?.id ?? null);
  const [subjectDraft, setSubjectDraft] = useState<SubjectDraft>(() => props.initialSubjects[0] ? subjectToDraft(props.initialSubjects[0]) : makeEmptySubjectDraft());
  const [styleDraft, setStyleDraft] = useState<StyleDraft>(() => props.initialStyles[0] ? styleToDraft(props.initialStyles[0]) : makeEmptyStyleDraft());
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [feedbackError, setFeedbackError] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('qa.local@aiv.dev');
  const [authPassword, setAuthPassword] = useState('AivLocal123!');
  const [authDisplayName, setAuthDisplayName] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authFeedback, setAuthFeedback] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<CatalogVisibility>('public');
  const [subjectTypeFilter, setSubjectTypeFilter] = useState<'all' | SubjectType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [subjectImageMode, setSubjectImageMode] = useState<'upload' | 'ai'>('upload');
  const [subjectImagePrompt, setSubjectImagePrompt] = useState('');
  const [imageSubmitting, setImageSubmitting] = useState(false);
  const [imageFeedback, setImageFeedback] = useState('');
  const [imageFeedbackError, setImageFeedbackError] = useState(false);
  const [imagePreviewPulse, setImagePreviewPulse] = useState(false);

  const enabledSubjectCount = useMemo(() => subjects.filter((item) => item.enabled !== false).length, [subjects]);
  const enabledStyleCount = useMemo(() => stylesList.filter((item) => item.enabled !== false).length, [stylesList]);

  const renderingSubjects = activeTab === 'subjects';
  const adminMode = props.mode === 'admin';
  const publicOnly = props.scopeMode === 'publicOnly';

  const selectedSubject = useMemo(
    () => subjects.find((item) => item.id === selectedSubjectId) ?? null,
    [selectedSubjectId, subjects],
  );
  const selectedStyle = useMemo(
    () => stylesList.find((item) => item.id === selectedStyleId) ?? null,
    [selectedStyleId, stylesList],
  );
  const adminShellNavItems = [
        { key: 'dashboard', label: '后台首页', title: '后台首页', href: '/admin', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="14" width="7" height="7" rx="1.5"></rect><rect x="3" y="14" width="7" height="7" rx="1.5"></rect></svg> },
        { key: 'planner', label: 'Agent 管理', title: 'Agent 管理', href: '/admin/planner-agents', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4"></path><path d="M12 18v4"></path><path d="M4.93 4.93l2.83 2.83"></path><path d="M16.24 16.24l2.83 2.83"></path><path d="M2 12h4"></path><path d="M18 12h4"></path><path d="M4.93 19.07l2.83-2.83"></path><path d="M16.24 7.76l2.83-2.83"></path><circle cx="12" cy="12" r="4"></circle></svg> },
        { key: 'catalogs', label: '公共目录', title: '公共目录', href: '/admin/catalogs', active: true, icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><line x1="9" y1="14" x2="15" y2="14"></line></svg> },
        { key: 'models', label: '模型目录', title: '模型目录', href: '/admin/models', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="7" ry="3"></ellipse><path d="M5 5v6c0 1.66 3.13 3 7 3s7-1.34 7-3V5"></path><path d="M5 11v8c0 1.66 3.13 3 7 3s7-1.34 7-3v-8"></path></svg> },
      ];
  const filteredSubjects = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return subjects.filter((item) => {
      if (item.visibility !== visibilityFilter) {
        return false;
      }
      if (subjectTypeFilter !== 'all' && item.subjectType !== subjectTypeFilter) {
        return false;
      }
      if (!normalizedSearch) {
        return true;
      }
      return [item.name, item.slug, item.description ?? '', ...(Array.isArray(item.tags) ? item.tags.filter((tag): tag is string => typeof tag === 'string') : [])]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [searchTerm, subjectTypeFilter, subjects, visibilityFilter]);

  const filteredStyles = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return stylesList.filter((item) => {
      if (item.visibility !== visibilityFilter) {
        return false;
      }
      if (!normalizedSearch) {
        return true;
      }
      return [item.name, item.slug, item.description ?? '', ...(Array.isArray(item.tags) ? item.tags.filter((tag): tag is string => typeof tag === 'string') : [])]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [searchTerm, stylesList, visibilityFilter]);

  const visibleItemsCount = renderingSubjects ? filteredSubjects.length : filteredStyles.length;

  const triggerFeedback = (message: string, isError = false) => {
    setFeedback(message);
    setFeedbackError(isError);
  };

  const triggerImageFeedback = (message: string, isError = false) => {
    setImageFeedback(message);
    setImageFeedbackError(isError);
  };

  const imageFeedbackTone = nextImageFeedbackTone(imageFeedback, imageFeedbackError);

  useEffect(() => {
    if (!imageFeedback) {
      return;
    }

    const timer = window.setTimeout(() => {
      setImageFeedback('');
      setImageFeedbackError(false);
    }, 2800);

    return () => window.clearTimeout(timer);
  }, [imageFeedback]);

  useEffect(() => {
    const nextImageUrl = subjectDraft.imageUrl.trim();
    if (!nextImageUrl || !previousSubjectImageUrlRef.current || previousSubjectImageUrlRef.current === nextImageUrl) {
      previousSubjectImageUrlRef.current = nextImageUrl;
      return;
    }

    previousSubjectImageUrlRef.current = nextImageUrl;
    setImagePreviewPulse(true);
    const timer = window.setTimeout(() => setImagePreviewPulse(false), 900);
    return () => window.clearTimeout(timer);
  }, [subjectDraft.imageUrl]);

  const loadCatalogs = async () => {
    const [subjectsResponse, stylesResponse] = await Promise.all([
      fetch(`/api/explore/subjects?scope=${publicOnly ? 'public' : 'all'}`, { headers: { Accept: 'application/json' } }),
      fetch(`/api/explore/styles?scope=${publicOnly ? 'public' : 'all'}`, { headers: { Accept: 'application/json' } }),
    ]);

    const [subjectsPayload, stylesPayload] = await Promise.all([subjectsResponse.json(), stylesResponse.json()]);
    const parsedSubjects = parseApiEnvelope<CatalogSubjectItem[]>(subjectsPayload);
    const parsedStyles = parseApiEnvelope<CatalogStyleItem[]>(stylesPayload);

    if (!subjectsResponse.ok || !parsedSubjects.ok) {
      throw new Error(!parsedSubjects.ok ? parsedSubjects.error.message ?? '加载主体目录失败。' : '加载主体目录失败。');
    }
    if (!stylesResponse.ok || !parsedStyles.ok) {
      throw new Error(!parsedStyles.ok ? parsedStyles.error.message ?? '加载画风目录失败。' : '加载画风目录失败。');
    }

    setSubjects(parsedSubjects.data);
    setStylesList(parsedStyles.data);

    if (parsedSubjects.data.length > 0 && !parsedSubjects.data.some((item) => item.id === selectedSubjectId)) {
      setSelectedSubjectId(parsedSubjects.data[0].id);
      setSubjectDraft(subjectToDraft(parsedSubjects.data[0]));
    }
    if (parsedStyles.data.length > 0 && !parsedStyles.data.some((item) => item.id === selectedStyleId)) {
      setSelectedStyleId(parsedStyles.data[0].id);
      setStyleDraft(styleToDraft(parsedStyles.data[0]));
    }
  };

  const refreshCurrentUser = async () => {
    const response = await fetch('/api/auth/me', { headers: { Accept: 'application/json' } });
    const payload = parseApiEnvelope<SettingsAuthUser>(await response.json());
    if (!response.ok || !payload.ok) {
      setCurrentUser(null);
      return;
    }
    setCurrentUser(payload.data);
  };

  const submitAuth = async () => {
    setAuthSubmitting(true);
    setAuthFeedback('');
    try {
      if (authMode === 'register') {
        const registerResponse = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: authEmail,
            password: authPassword,
            ...(authDisplayName.trim() ? { displayName: authDisplayName.trim() } : {}),
          }),
        });
        const registerPayload = parseApiEnvelope<SettingsAuthUser>(await registerResponse.json());
        if (!registerResponse.ok || !registerPayload.ok) {
          throw new Error(!registerPayload.ok ? registerPayload.error.message ?? '注册失败。' : '注册失败。');
        }
      }

      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: authEmail,
          password: authPassword,
        }),
      });
      const loginPayload = parseApiEnvelope<SettingsAuthUser>(await loginResponse.json());
      if (!loginResponse.ok || !loginPayload.ok) {
        throw new Error(!loginPayload.ok ? loginPayload.error.message ?? '登录失败。' : '登录失败。');
      }

      await refreshCurrentUser();
      await loadCatalogs();
      setAuthFeedback(authMode === 'login' ? '登录成功。' : '注册并登录成功。');
    } catch (error) {
      setAuthFeedback(error instanceof Error ? error.message : '认证失败。');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', headers: { Accept: 'application/json' } });
    setCurrentUser(null);
    setSubjects([]);
    setStylesList([]);
  };

  const shellTopActions = [
    ...(adminMode ? [{ key: 'dashboard', label: '后台首页', href: '/admin' }] : []),
    { key: 'providers', label: adminMode ? '用户 API Key 设置' : '接口配置', href: '/settings/providers' },
    { key: 'logout', label: '退出登录', onClick: logout },
  ];

  const selectSubject = (item: CatalogSubjectItem) => {
    setSelectedSubjectId(item.id);
    setSubjectDraft(subjectToDraft(item));
    setEditorOpen(true);
  };

  const selectStyle = (item: CatalogStyleItem) => {
    setSelectedStyleId(item.id);
    setStyleDraft(styleToDraft(item));
    setEditorOpen(true);
  };

  const startNew = () => {
    if (renderingSubjects) {
      setSelectedSubjectId(null);
      setSubjectDraft(makeEmptySubjectDraft());
      setSubjectImageMode('upload');
      setSubjectImagePrompt('');
      setImageFeedback('');
      setImageFeedbackError(false);
    } else {
      setSelectedStyleId(null);
      setStyleDraft(makeEmptyStyleDraft());
    }
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setImageFeedback('');
    setImageFeedbackError(false);
  };

  const useSubjectForCreation = () => {
    if (!subjectDraft.slug.trim()) {
      triggerFeedback('请先保存主体后再使用主体创作。', true);
      return;
    }

    closeEditor();
    router.push(`/explore?subject=${encodeURIComponent(subjectDraft.slug.trim())}`);
  };

  const uploadSubjectImage = async (file: File) => {
    setImageSubmitting(true);
    triggerImageFeedback('正在上传主体图…');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/explore/subjects/upload-image', {
        method: 'POST',
        body: formData,
      });
      const envelope = parseApiEnvelope<{ imageUrl: string }>(await response.json());
      if (!response.ok || !envelope.ok) {
        throw new Error(!envelope.ok ? envelope.error.message ?? '上传主体图失败。' : '上传主体图失败。');
      }
      setSubjectDraft((current) => ({ ...current, imageUrl: envelope.data.imageUrl }));
      triggerImageFeedback('主体图已上传，可继续保存主体。');
    } catch (error) {
      triggerImageFeedback(error instanceof Error ? error.message : '上传主体图失败。', true);
    } finally {
      setImageSubmitting(false);
    }
  };

  const generateSubjectImage = async () => {
    setImageSubmitting(true);
    triggerImageFeedback('正在生成主体图…');
    try {
      const description = subjectImagePrompt.trim() || subjectDraft.description.trim();
      if (!subjectDraft.name.trim() || !description) {
        throw new Error('请先填写主体名称和描述，再生成主体图。');
      }
      const response = await fetch('/api/explore/subjects/generate-image', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: subjectDraft.name.trim(),
          subjectType: subjectDraft.subjectType,
          description,
        }),
      });
      const envelope = parseApiEnvelope<{ imageUrl: string }>(await response.json());
      if (!response.ok || !envelope.ok) {
        throw new Error(!envelope.ok ? envelope.error.message ?? 'AI 生成主体图失败。' : 'AI 生成主体图失败。');
      }
      setSubjectDraft((current) => ({ ...current, imageUrl: envelope.data.imageUrl }));
      triggerImageFeedback('AI 主体图已生成，可继续保存主体。');
    } catch (error) {
      triggerImageFeedback(error instanceof Error ? error.message : 'AI 生成主体图失败。', true);
    } finally {
      setImageSubmitting(false);
    }
  };

  const saveSubject = async () => {
    setSaving(true);
    try {
      const payload = {
        slug: subjectDraft.slug.trim(),
        name: subjectDraft.name.trim(),
        visibility: publicOnly ? 'public' : subjectDraft.visibility,
        subjectType: subjectDraft.subjectType,
        genderTag: subjectDraft.genderTag,
        previewImageUrl: subjectDraft.imageUrl.trim(),
        referenceImageUrl: subjectDraft.referenceImageUrl.trim() || undefined,
        description: subjectDraft.description.trim() || undefined,
        promptTemplate: subjectDraft.promptTemplate.trim() || undefined,
        negativePrompt: subjectDraft.negativePrompt.trim() || undefined,
        tags: parseTags(subjectDraft.tags),
        metadata: parseMetadata(subjectDraft.metadata),
        enabled: subjectDraft.enabled,
        sortOrder: subjectDraft.sortOrder,
      };

      const response = await fetch(subjectDraft.id ? `/api/explore/subjects/${encodeURIComponent(subjectDraft.id)}` : '/api/explore/subjects', {
        method: subjectDraft.id ? 'PATCH' : 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const envelope = parseApiEnvelope<CatalogSubjectItem>(await response.json());
      if (!response.ok || !envelope.ok) {
        throw new Error(!envelope.ok ? envelope.error.message ?? '保存主体失败。' : '保存主体失败。');
      }

      await loadCatalogs();
      setSelectedSubjectId(envelope.data.id);
      setSubjectDraft(subjectToDraft(envelope.data));
      triggerFeedback(`主体已保存：${envelope.data.name}`);
    } catch (error) {
      triggerFeedback(error instanceof Error ? error.message : '保存主体失败。', true);
    } finally {
      setSaving(false);
    }
  };

  const saveStyle = async () => {
    setSaving(true);
    try {
      const payload = {
        slug: styleDraft.slug.trim(),
        name: styleDraft.name.trim(),
        visibility: publicOnly ? 'public' : styleDraft.visibility,
        previewImageUrl: styleDraft.imageUrl.trim(),
        description: styleDraft.description.trim() || undefined,
        promptTemplate: styleDraft.promptTemplate.trim() || undefined,
        negativePrompt: styleDraft.negativePrompt.trim() || undefined,
        tags: parseTags(styleDraft.tags),
        metadata: parseMetadata(styleDraft.metadata),
        enabled: styleDraft.enabled,
        sortOrder: styleDraft.sortOrder,
      };

      const response = await fetch(styleDraft.id ? `/api/explore/styles/${encodeURIComponent(styleDraft.id)}` : '/api/explore/styles', {
        method: styleDraft.id ? 'PATCH' : 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const envelope = parseApiEnvelope<CatalogStyleItem>(await response.json());
      if (!response.ok || !envelope.ok) {
        throw new Error(!envelope.ok ? envelope.error.message ?? '保存画风失败。' : '保存画风失败。');
      }

      await loadCatalogs();
      setSelectedStyleId(envelope.data.id);
      setStyleDraft(styleToDraft(envelope.data));
      triggerFeedback(`画风已保存：${envelope.data.name}`);
    } catch (error) {
      triggerFeedback(error instanceof Error ? error.message : '保存画风失败。', true);
    } finally {
      setSaving(false);
    }
  };

  if (!currentUser) {
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
                <button type="button" className={`${styles.authTab} ${authMode === 'login' ? styles.authTabActive : ''}`} onClick={() => setAuthMode('login')}>登录</button>
                <button type="button" className={`${styles.authTab} ${authMode === 'register' ? styles.authTabActive : ''}`} onClick={() => setAuthMode('register')}>注册</button>
              </div>
              <div className={styles.authFields}>
                {authMode === 'register' ? (
                  <input className={styles.input} value={authDisplayName} onChange={(event) => setAuthDisplayName(event.target.value)} placeholder="显示名称（可选）" />
                ) : null}
                <input className={styles.input} type="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder="邮箱" />
                <input className={styles.input} type="password" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} placeholder="密码（至少 8 位）" />
              </div>
              {authFeedback ? <div className={`${styles.feedback} ${styles.feedbackError}`}>{authFeedback}</div> : null}
              <button type="button" className={styles.primaryButton} onClick={submitAuth} disabled={authSubmitting}>
                {authSubmitting ? '提交中...' : authMode === 'login' ? '登录' : '注册并登录'}
              </button>
            </section>
          </div>
        </AuthRequiredPanel>
      </SystemShell>
    );
  }

  return (
      <SystemShell
        pageTitle={adminMode ? (renderingSubjects ? '公共主体库' : '公共画风库') : (renderingSubjects ? '主体库' : '画风库')}
      navItems={adminMode ? adminShellNavItems : buildUserShellNavItems('subjects')}
      topActions={shellTopActions}
      badge={{ strong: String(renderingSubjects ? subjects.length : stylesList.length), label: renderingSubjects ? '主体目录' : '画风目录', onClick: () => setActiveTab(renderingSubjects ? 'styles' : 'subjects') }}
    >
      <div className={styles.contentShell}>
          <CatalogLibraryToolbar
            activeTab={activeTab}
            visibilityFilter={visibilityFilter}
            publicOnly={publicOnly}
            subjectTypeFilter={subjectTypeFilter}
            searchTerm={searchTerm}
            visibleItemsCount={visibleItemsCount}
            onTabChange={setActiveTab}
            onVisibilityFilterChange={setVisibilityFilter}
            onSubjectTypeFilterChange={setSubjectTypeFilter}
            onSearchTermChange={setSearchTerm}
            onCreate={startNew}
          />

          <section className={styles.workspace}>
            <div className={styles.galleryPane}>
              <CatalogCardGrid
                tab={activeTab}
                selectedSubjectId={selectedSubjectId}
                selectedStyleId={selectedStyleId}
                filteredSubjects={filteredSubjects}
                filteredStyles={filteredStyles}
                onSelectSubject={selectSubject}
                onSelectStyle={selectStyle}
              />
            </div>
          </section>
          {renderingSubjects ? (
            <CatalogSubjectDialog
              open={editorOpen}
              draft={subjectDraft}
              saving={saving}
              feedback={feedback}
              feedbackError={feedbackError}
              imageSubmitting={imageSubmitting}
              imageFeedback={imageFeedback}
              imageFeedbackTone={imageFeedbackTone}
              imageMode={subjectImageMode}
              imagePrompt={subjectImagePrompt}
              imagePreviewPulse={imagePreviewPulse}
              onClose={closeEditor}
              onUseForCreation={useSubjectForCreation}
              onClear={() => setSubjectDraft(makeEmptySubjectDraft())}
              onSave={saveSubject}
              onDraftChange={(updater) => setSubjectDraft(updater)}
              onImageModeChange={setSubjectImageMode}
              onImagePromptChange={setSubjectImagePrompt}
              onUploadImage={(file) => void uploadSubjectImage(file)}
              onGenerateImage={() => void generateSubjectImage()}
            />
          ) : (
            <CatalogStyleDialog
              open={editorOpen}
              draft={styleDraft}
              saving={saving}
              feedback={feedback}
              feedbackError={feedbackError}
              onClose={closeEditor}
              onClear={() => setStyleDraft(makeEmptyStyleDraft())}
              onSave={saveStyle}
              onDraftChange={(updater) => setStyleDraft(updater)}
            />
          )}
      </div>
    </SystemShell>
  );
}
