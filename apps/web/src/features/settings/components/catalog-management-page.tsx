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
import {
  CollectionToolbar,
  CollectionToolbarAction,
  CollectionToolbarChips,
  CollectionToolbarGroup,
  CollectionToolbarMeta,
  CollectionToolbarPill,
  CollectionToolbarSearch,
  CollectionToolbarSelect,
} from '../../shared/components/collection-toolbar';
import { SystemShell } from '../../shared/components/system-shell';
import { Dialog } from '../../shared/components/dialog';
import { buildUserShellNavItems } from '../../shared/lib/user-shell-nav';

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

interface SubjectDraft {
  id: string | null;
  slug: string;
  name: string;
  visibility: CatalogVisibility;
  subjectType: SubjectType;
  genderTag: SubjectGenderTag;
  imageUrl: string;
  referenceImageUrl: string;
  description: string;
  promptTemplate: string;
  negativePrompt: string;
  tags: string;
  metadata: string;
  enabled: boolean;
  sortOrder: number;
}

interface StyleDraft {
  id: string | null;
  slug: string;
  name: string;
  visibility: CatalogVisibility;
  imageUrl: string;
  description: string;
  promptTemplate: string;
  negativePrompt: string;
  tags: string;
  metadata: string;
  enabled: boolean;
  sortOrder: number;
}

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

function visibilityLabel(value: CatalogVisibility) {
  return value === 'public' ? '公共' : '个人';
}

function subjectTypeLabel(value: SubjectType) {
  switch (value) {
    case 'animal':
      return '动物';
    case 'creature':
      return '幻想生物';
    case 'object':
      return '物体';
    default:
      return '人物';
  }
}

function genderLabel(value: SubjectGenderTag) {
  switch (value) {
    case 'female':
      return '女性';
    case 'male':
      return '男性';
    case 'child':
      return '儿童';
    default:
      return '未知';
  }
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
        <div className={styles.contentShell}>
            <section className={styles.authHero}>
              <div className={styles.headerEyebrow}>Characters</div>
              <h1 className={styles.headerTitle}>先登录，再管理你的主体库与画风库</h1>
              <p className={styles.headerSubtitle}>目录项写入当前用户对应的数据表。登录后，你就能像素材库一样浏览主体卡片，同时继续编辑 prompt 模板和参考图配置。</p>
            </section>

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
          <CollectionToolbar>
            <CollectionToolbarGroup nowrap>
              <CollectionToolbarChips>
                <CollectionToolbarPill
                  active={renderingSubjects}
                  activeTone="dark"
                  inactiveStyle="plain"
                  onClick={() => setActiveTab('subjects')}
                >
                  主体库
                </CollectionToolbarPill>
                <CollectionToolbarPill
                  active={!renderingSubjects}
                  activeTone="dark"
                  inactiveStyle="plain"
                  onClick={() => setActiveTab('styles')}
                >
                  画风库
                </CollectionToolbarPill>
              </CollectionToolbarChips>

              <CollectionToolbarChips>
                <CollectionToolbarPill
                  active={visibilityFilter === 'public'}
                  activeTone="warm"
                  inactiveStyle="outlined"
                  onClick={() => setVisibilityFilter('public')}
                >
                  公共{renderingSubjects ? '主体' : '画风'}
                </CollectionToolbarPill>
                {!publicOnly ? (
                  <CollectionToolbarPill
                    active={visibilityFilter === 'personal'}
                    activeTone="warm"
                    inactiveStyle="outlined"
                    onClick={() => setVisibilityFilter('personal')}
                  >
                    个人添加
                  </CollectionToolbarPill>
                ) : null}
              </CollectionToolbarChips>

              {renderingSubjects ? (
                <CollectionToolbarSelect width={148} value={subjectTypeFilter} onChange={(event) => setSubjectTypeFilter(event.target.value as 'all' | SubjectType)}>
                  <option value="all">类别</option>
                  <option value="human">人物</option>
                  <option value="animal">动物</option>
                  <option value="creature">幻想生物</option>
                  <option value="object">物体</option>
                </CollectionToolbarSelect>
              ) : null}
            </CollectionToolbarGroup>

            <CollectionToolbarGroup align="end" nowrap>
              <CollectionToolbarSearch
                width={208}
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={`输入${renderingSubjects ? '主体' : '画风'}名称进行搜索`}
              />
              <CollectionToolbarAction onClick={startNew}>{renderingSubjects ? '新建主体' : '新建画风'}</CollectionToolbarAction>
              <CollectionToolbarMeta>{`已展示 ${visibleItemsCount} 个${renderingSubjects ? '主体' : '画风'}`}</CollectionToolbarMeta>
            </CollectionToolbarGroup>
          </CollectionToolbar>

          <section className={styles.workspace}>
            <div className={styles.galleryPane}>
              <div className={`${styles.cardGrid} ${renderingSubjects ? styles.cardGridSubjects : styles.cardGridStyles}`}>
                {renderingSubjects ? (
                  filteredSubjects.length > 0 ? filteredSubjects.map((item) => (
                    <button key={item.id} type="button" className={`${styles.card} ${styles.cardSubject} ${selectedSubjectId === item.id ? styles.cardActive : ''}`} onClick={() => selectSubject(item)}>
                      <div className={styles.cardMediaWrap}>
                        <img src={item.imageUrl} alt={item.name} className={styles.cardMedia} />
                      </div>
                      <div className={styles.cardTitleRow}>
                        <span className={styles.cardName}>{item.name}</span>
                        <span className={styles.cardSlug}>{item.slug}</span>
                      </div>
                      <div className={styles.cardMetaRow}>
                        <span className={styles.cardMetaPill}>{visibilityLabel(item.visibility)}</span>
                        <span className={styles.cardMetaPill}>{subjectTypeLabel(item.subjectType)}</span>
                      </div>
                    </button>
                  )) : <div className={styles.emptyState}>当前筛选条件下没有主体，试试切换公共 / 个人或调整搜索词。</div>
                ) : (
                  filteredStyles.length > 0 ? filteredStyles.map((item) => (
                    <button key={item.id} type="button" className={`${styles.card} ${styles.cardStyle} ${selectedStyleId === item.id ? styles.cardActive : ''}`} onClick={() => selectStyle(item)}>
                      <div className={styles.cardMediaWrap}>
                        <img src={item.imageUrl} alt={item.name} className={styles.cardMedia} />
                      </div>
                      <div className={styles.cardTitleRow}>
                        <span className={styles.cardName}>{item.name}</span>
                        <span className={styles.cardSlug}>{item.slug}</span>
                      </div>
                      <div className={styles.cardMetaRow}>
                        <span className={styles.cardMetaPill}>{visibilityLabel(item.visibility)}</span>
                      </div>
                    </button>
                  )) : <div className={styles.emptyState}>当前筛选条件下没有画风，试试切换公共 / 个人或调整搜索词。</div>
                )}
              </div>
            </div>
          </section>

          <Dialog
            open={editorOpen}
            title={renderingSubjects ? (subjectDraft.id ? `编辑主体：${subjectDraft.name || subjectDraft.slug}` : '创建主体') : (styleDraft.id ? `编辑画风：${styleDraft.name || styleDraft.slug}` : '创建画风')}
            description={renderingSubjects ? '在弹层里集中维护主体信息，并可直接使用当前主体继续创作。' : '在弹层里集中维护画风信息与 prompt 模板。'}
            size="wide"
            onClose={closeEditor}
            footer={(
              <div className={styles.dialogFooter}>
                <div className={styles.dialogFooterInfo}>
                  <div className={styles.dialogFooterTitle}>{renderingSubjects ? '下一步动作' : '保存当前配置'}</div>
                  <div className={`${styles.feedback} ${feedbackError ? styles.feedbackError : ''}`}>
                    {feedback || (renderingSubjects ? '先完善主体信息，再选择继续创作或保存入库。' : '保存后会立即更新画风库卡片与 prompt 模板。')}
                  </div>
                </div>
                <div className={styles.dialogFooterActions}>
                  {renderingSubjects ? <button type="button" className={styles.secondaryButton} onClick={useSubjectForCreation}>使用主体创作</button> : null}
                  <button type="button" className={styles.ghostButton} onClick={renderingSubjects ? () => setSubjectDraft(makeEmptySubjectDraft()) : () => setStyleDraft(makeEmptyStyleDraft())}>清空</button>
                  <button type="button" className={styles.primaryButton} disabled={saving} onClick={renderingSubjects ? saveSubject : saveStyle}>{saving ? '保存中...' : renderingSubjects ? (subjectDraft.id ? '保存主体' : '创建主体') : (styleDraft.id ? '保存画风' : '创建画风')}</button>
                </div>
              </div>
            )}
          >
            {renderingSubjects ? (
              <div className={styles.dialogLayout}>
                <div className={styles.dialogPreviewColumn}>
                  <div className={`${styles.previewHero} ${imagePreviewPulse ? styles.previewHeroPulse : ''}`}>
                    <img src={subjectDraft.imageUrl || subjectDraft.referenceImageUrl || 'https://placehold.co/640x720/e5e7eb/111827?text=Subject'} alt={subjectDraft.name || 'subject'} className={styles.previewHeroImage} />
                    <div className={styles.previewHeroMeta}>
                      <span className={styles.previewPill}>{visibilityLabel(subjectDraft.visibility)}</span>
                      <span className={styles.previewPill}>{subjectTypeLabel(subjectDraft.subjectType)}</span>
                      <span className={styles.previewPill}>{genderLabel(subjectDraft.genderTag)}</span>
                      {imageSubmitting ? <span className={`${styles.previewPill} ${styles.previewPillPending}`}>{subjectImageMode === 'upload' ? '上传中' : '生成中'}</span> : null}
                    </div>
                  </div>
                  <div className={styles.imageToolCard}>
                    <div className={styles.imageToolHeader}>
                      <div>
                        <div className={styles.imageToolEyebrow}>主体图工具</div>
                        <div className={styles.imageToolTitle}>默认按 3:4 主体封面处理</div>
                      </div>
                      <span className={styles.imageToolRatio}>3:4</span>
                    </div>
                    <div className={styles.imageModeTabs}>
                      <button type="button" className={`${styles.imageModeTab} ${subjectImageMode === 'upload' ? styles.imageModeTabActive : ''}`} onClick={() => setSubjectImageMode('upload')}>
                        本地上传
                      </button>
                      <button type="button" className={`${styles.imageModeTab} ${subjectImageMode === 'ai' ? styles.imageModeTabActive : ''}`} onClick={() => setSubjectImageMode('ai')}>
                        AI 生成
                      </button>
                    </div>
                    {subjectImageMode === 'upload' ? (
                      <label className={styles.uploadBox}>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className={styles.hiddenFileInput}
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            event.currentTarget.value = '';
                            if (file) {
                              void uploadSubjectImage(file);
                            }
                          }}
                        />
                        <span className={styles.uploadBoxIcon}>+</span>
                        <span className={styles.uploadBoxTitle}>{imageSubmitting ? '上传中…' : '上传主体图'}</span>
                        <span className={styles.uploadBoxHint}>支持 PNG / JPG / WEBP，建议使用干净背景、完整主体的 3:4 竖图。</span>
                      </label>
                    ) : (
                      <div className={styles.aiToolStack}>
                        <div className={styles.aiPromptExamples}>
                          {[
                            '温柔知性的年轻女老师，浅米色背景，半写实，完整半身到全身',
                            '可爱拟人狐狸侦探，暖色工作室灯光，童话质感，完整主体',
                            '未来感机甲少年，干净科技背景，角色海报感，完整人物',
                          ].map((example) => (
                            <button
                              key={example}
                              type="button"
                              className={styles.examplePromptChip}
                              onClick={() => setSubjectImagePrompt(example)}
                            >
                              {example}
                            </button>
                          ))}
                        </div>
                        <textarea
                          className={`${styles.textarea} ${styles.imageToolTextarea}`}
                          value={subjectImagePrompt}
                          onChange={(event) => setSubjectImagePrompt(event.target.value)}
                          placeholder="输入你对主体图的描述；留空则默认使用主体描述字段。"
                        />
                        <button type="button" className={styles.primaryButton} disabled={imageSubmitting} onClick={generateSubjectImage}>
                          {imageSubmitting ? '生成中…' : 'AI 生成主体图'}
                        </button>
                      </div>
                    )}
                    {imageFeedback ? (
                      <div
                        className={`${styles.inlineFeedback} ${
                          imageFeedbackTone === 'error'
                            ? styles.inlineFeedbackError
                            : imageFeedbackTone === 'pending'
                              ? styles.inlineFeedbackPending
                              : styles.inlineFeedbackSuccess
                        }`}
                      >
                        {imageFeedback}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className={styles.dialogFormColumn}>
                  <div className={styles.formGrid}>
                    <div className={styles.field}><label className={styles.label}>名称</label><input className={styles.input} value={subjectDraft.name} onChange={(event) => setSubjectDraft((current) => ({ ...current, name: event.target.value }))} /></div>
                    <div className={styles.field}><label className={styles.label}>Slug</label><input className={styles.input} value={subjectDraft.slug} onChange={(event) => setSubjectDraft((current) => ({ ...current, slug: event.target.value }))} /></div>
                    {!publicOnly ? <div className={styles.field}><label className={styles.label}>可见性</label><select className={styles.select} value={subjectDraft.visibility} onChange={(event) => setSubjectDraft((current) => ({ ...current, visibility: event.target.value as CatalogVisibility }))}><option value="public">公共</option><option value="personal">个人</option></select></div> : null}
                    <div className={styles.field}><label className={styles.label}>主体类型</label><select className={styles.select} value={subjectDraft.subjectType} onChange={(event) => setSubjectDraft((current) => ({ ...current, subjectType: event.target.value as SubjectType }))}><option value="human">人物</option><option value="animal">动物</option><option value="creature">幻想生物</option><option value="object">物体</option></select></div>
                    <div className={styles.field}><label className={styles.label}>性别标签</label><select className={styles.select} value={subjectDraft.genderTag} onChange={(event) => setSubjectDraft((current) => ({ ...current, genderTag: event.target.value as SubjectGenderTag }))}><option value="unknown">未知</option><option value="female">女性</option><option value="male">男性</option><option value="child">儿童</option></select></div>
                    <div className={styles.field}><label className={styles.label}>排序</label><input className={styles.input} type="number" value={subjectDraft.sortOrder} onChange={(event) => setSubjectDraft((current) => ({ ...current, sortOrder: Number(event.target.value) || 0 }))} /></div>
                    <div className={styles.fieldFull}><label className={styles.label}>封面图 URL</label><input className={styles.input} value={subjectDraft.imageUrl} onChange={(event) => setSubjectDraft((current) => ({ ...current, imageUrl: event.target.value }))} /></div>
                    <div className={styles.fieldFull}><label className={styles.label}>参考图 URL</label><input className={styles.input} value={subjectDraft.referenceImageUrl} onChange={(event) => setSubjectDraft((current) => ({ ...current, referenceImageUrl: event.target.value }))} /></div>
                    <div className={styles.fieldFull}><label className={styles.label}>描述</label><textarea className={styles.textarea} value={subjectDraft.description} onChange={(event) => setSubjectDraft((current) => ({ ...current, description: event.target.value }))} /></div>
                    <div className={styles.fieldFull}><label className={styles.label}>正向 Prompt 模板</label><textarea className={styles.textarea} value={subjectDraft.promptTemplate} onChange={(event) => setSubjectDraft((current) => ({ ...current, promptTemplate: event.target.value }))} /></div>
                    <div className={styles.fieldFull}><label className={styles.label}>负向 Prompt 模板</label><textarea className={styles.textarea} value={subjectDraft.negativePrompt} onChange={(event) => setSubjectDraft((current) => ({ ...current, negativePrompt: event.target.value }))} /></div>
                    <div className={styles.field}><label className={styles.label}>标签</label><input className={styles.input} value={subjectDraft.tags} onChange={(event) => setSubjectDraft((current) => ({ ...current, tags: event.target.value }))} placeholder="狐狸, 童话, 可爱" /></div>
                    <div className={styles.field}><label className={styles.label}>启用状态</label><div className={styles.checkboxRow}><input type="checkbox" checked={subjectDraft.enabled} onChange={(event) => setSubjectDraft((current) => ({ ...current, enabled: event.target.checked }))} /><span className={styles.hint}>关闭后首页不会显示该主体</span></div></div>
                    <div className={styles.fieldFull}><label className={styles.label}>扩展 Metadata(JSON)</label><textarea className={styles.textarea} value={subjectDraft.metadata} onChange={(event) => setSubjectDraft((current) => ({ ...current, metadata: event.target.value }))} placeholder='{"identityKey":"fox-main","voiceProfileId":"vp_123"}' /></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className={styles.dialogLayout}>
                <div className={styles.dialogPreviewColumn}>
                  <div className={styles.previewHero}>
                    <img src={styleDraft.imageUrl || 'https://placehold.co/640x720/e5e7eb/111827?text=Style'} alt={styleDraft.name || 'style'} className={styles.previewHeroImage} />
                    <div className={styles.previewHeroMeta}>
                      <span className={styles.previewPill}>{visibilityLabel(styleDraft.visibility)}</span>
                    </div>
                  </div>
                  <div className={styles.imageToolCard}>
                    <div className={styles.imageModeTabs}>
                      <button type="button" className={`${styles.imageModeTab} ${styles.imageModeTabActive}`}>风格封面</button>
                    </div>
                    <div className={styles.styleHelperCard}>
                      <div className={styles.styleHelperTitle}>封面作用</div>
                      <div className={styles.styleHelperText}>画风封面主要用于列表识别与风格气质传达。真正决定生成效果的仍然是描述、正向 prompt 与负向 prompt 模板。</div>
                    </div>
                  </div>
                </div>
                <div className={styles.dialogFormColumn}>
                  <div className={styles.formGrid}>
                    <div className={styles.field}><label className={styles.label}>名称</label><input className={styles.input} value={styleDraft.name} onChange={(event) => setStyleDraft((current) => ({ ...current, name: event.target.value }))} /></div>
                    <div className={styles.field}><label className={styles.label}>Slug</label><input className={styles.input} value={styleDraft.slug} onChange={(event) => setStyleDraft((current) => ({ ...current, slug: event.target.value }))} /></div>
                    {!publicOnly ? <div className={styles.field}><label className={styles.label}>可见性</label><select className={styles.select} value={styleDraft.visibility} onChange={(event) => setStyleDraft((current) => ({ ...current, visibility: event.target.value as CatalogVisibility }))}><option value="public">公共</option><option value="personal">个人</option></select></div> : null}
                    <div className={styles.field}><label className={styles.label}>排序</label><input className={styles.input} type="number" value={styleDraft.sortOrder} onChange={(event) => setStyleDraft((current) => ({ ...current, sortOrder: Number(event.target.value) || 0 }))} /></div>
                    <div className={styles.fieldFull}><label className={styles.label}>封面图 URL</label><input className={styles.input} value={styleDraft.imageUrl} onChange={(event) => setStyleDraft((current) => ({ ...current, imageUrl: event.target.value }))} /></div>
                    <div className={styles.fieldFull}><label className={styles.label}>描述</label><textarea className={styles.textarea} value={styleDraft.description} onChange={(event) => setStyleDraft((current) => ({ ...current, description: event.target.value }))} /></div>
                    <div className={styles.fieldFull}><label className={styles.label}>正向 Prompt 模板</label><textarea className={styles.textarea} value={styleDraft.promptTemplate} onChange={(event) => setStyleDraft((current) => ({ ...current, promptTemplate: event.target.value }))} /></div>
                    <div className={styles.fieldFull}><label className={styles.label}>负向 Prompt 模板</label><textarea className={styles.textarea} value={styleDraft.negativePrompt} onChange={(event) => setStyleDraft((current) => ({ ...current, negativePrompt: event.target.value }))} /></div>
                    <div className={styles.field}><label className={styles.label}>标签</label><input className={styles.input} value={styleDraft.tags} onChange={(event) => setStyleDraft((current) => ({ ...current, tags: event.target.value }))} placeholder="国风, 水墨, 留白" /></div>
                    <div className={styles.field}><label className={styles.label}>启用状态</label><div className={styles.checkboxRow}><input type="checkbox" checked={styleDraft.enabled} onChange={(event) => setStyleDraft((current) => ({ ...current, enabled: event.target.checked }))} /><span className={styles.hint}>关闭后首页不会显示该画风</span></div></div>
                    <div className={styles.fieldFull}><label className={styles.label}>扩展 Metadata(JSON)</label><textarea className={styles.textarea} value={styleDraft.metadata} onChange={(event) => setStyleDraft((current) => ({ ...current, metadata: event.target.value }))} placeholder='{"recommendedModelFamily":"seko-image"}' /></div>
                  </div>
                </div>
              </div>
            )}
          </Dialog>
      </div>
    </SystemShell>
  );
}
