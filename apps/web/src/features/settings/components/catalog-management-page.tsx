'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

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

interface CatalogManagementPageProps {
  currentUser: SettingsAuthUser | null;
  initialSubjects: CatalogSubjectItem[];
  initialStyles: CatalogStyleItem[];
  initialTab: CatalogTab;
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

export function CatalogManagementPage(props: CatalogManagementPageProps) {
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
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authDisplayName, setAuthDisplayName] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authFeedback, setAuthFeedback] = useState('');

  const enabledSubjectCount = useMemo(() => subjects.filter((item) => item.enabled !== false).length, [subjects]);
  const enabledStyleCount = useMemo(() => stylesList.filter((item) => item.enabled !== false).length, [stylesList]);

  useEffect(() => {
    const selected = subjects.find((item) => item.id === selectedSubjectId);
    if (selected) {
      setSubjectDraft(subjectToDraft(selected));
    }
  }, [selectedSubjectId, subjects]);

  useEffect(() => {
    const selected = stylesList.find((item) => item.id === selectedStyleId);
    if (selected) {
      setStyleDraft(styleToDraft(selected));
    }
  }, [selectedStyleId, stylesList]);

  const triggerFeedback = (message: string, isError = false) => {
    setFeedback(message);
    setFeedbackError(isError);
  };

  const loadCatalogs = async () => {
    const [subjectsResponse, stylesResponse] = await Promise.all([
      fetch('/api/explore/subjects?scope=all', { headers: { Accept: 'application/json' } }),
      fetch('/api/explore/styles?scope=all', { headers: { Accept: 'application/json' } }),
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
    }
    if (parsedStyles.data.length > 0 && !parsedStyles.data.some((item) => item.id === selectedStyleId)) {
      setSelectedStyleId(parsedStyles.data[0].id);
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

  const saveSubject = async () => {
    setSaving(true);
    try {
      const payload = {
        slug: subjectDraft.slug.trim(),
        name: subjectDraft.name.trim(),
        visibility: subjectDraft.visibility,
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
        visibility: styleDraft.visibility,
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
      triggerFeedback(`画风已保存：${envelope.data.name}`);
    } catch (error) {
      triggerFeedback(error instanceof Error ? error.message : '保存画风失败。', true);
    } finally {
      setSaving(false);
    }
  };

  if (!currentUser) {
    return (
      <div className={styles.page}>
        <div className={styles.shell}>
          <div className={styles.topbar}>
            <div>
              <span className={styles.eyebrow}>
                <span className={styles.eyebrowDot} />
                Explore Catalogs
              </span>
              <h1 className={styles.title}>先登录，再管理主体和画风</h1>
              <p className={styles.subtitle}>目录配置写入当前用户对应的数据表。登录后可以创建公共或个人目录项，并直接影响首页选项。</p>
            </div>
            <div className={styles.topActions}>
              <Link href="/explore" className={styles.navLink}>返回首页</Link>
            </div>
          </div>

          <section className={styles.authCard}>
            <div className={styles.authTabs}>
              <button type="button" className={`${styles.authTab} ${authMode === 'login' ? styles.authTabActive : ''}`} onClick={() => setAuthMode('login')}>
                登录
              </button>
              <button type="button" className={`${styles.authTab} ${authMode === 'register' ? styles.authTabActive : ''}`} onClick={() => setAuthMode('register')}>
                注册
              </button>
            </div>
            <div className={styles.authFields}>
              {authMode === 'register' ? (
                <input className={styles.input} value={authDisplayName} onChange={(event) => setAuthDisplayName(event.target.value)} placeholder="显示名称（可选）" />
              ) : null}
              <input className={styles.input} type="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder="邮箱" />
              <input className={styles.input} type="password" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} placeholder="密码（至少 8 位）" />
            </div>
            <div className={`${styles.feedback} ${authFeedback ? styles.feedbackError : ''}`}>{authFeedback}</div>
            <button type="button" className={styles.primaryButton} onClick={submitAuth} disabled={authSubmitting}>
              {authSubmitting ? '提交中...' : authMode === 'login' ? '登录' : '注册并登录'}
            </button>
          </section>
        </div>
      </div>
    );
  }

  const renderingSubjects = activeTab === 'subjects';

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.topbar}>
          <div>
            <span className={styles.eyebrow}>
              <span className={styles.eyebrowDot} />
              Explore Catalogs
            </span>
            <h1 className={styles.title}>主体与画风管理</h1>
            <p className={styles.subtitle}>首页选择项已经切到后端目录。这里直接管理 `subject_profiles / style_presets`，改完即影响首页和项目入口配置。</p>
          </div>
          <div className={styles.topActions}>
            <Link href="/settings/providers" className={styles.navLink}>Provider 设置</Link>
            <Link href="/explore" className={styles.navLink}>返回首页</Link>
            <button type="button" className={styles.ghostButton} onClick={logout}>退出登录</button>
          </div>
        </div>

        <div className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <div className={styles.summaryLabel}>当前登录用户</div>
            <div className={styles.summaryValue}>{currentUser.displayName || currentUser.email}</div>
            <div className={styles.summaryHint}>{currentUser.email}</div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryLabel}>主体目录</div>
            <div className={styles.summaryValue}>{subjects.length}</div>
            <div className={styles.summaryHint}>已启用 {enabledSubjectCount} 个</div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryLabel}>画风目录</div>
            <div className={styles.summaryValue}>{stylesList.length}</div>
            <div className={styles.summaryHint}>已启用 {enabledStyleCount} 个</div>
          </div>
        </div>

        <div className={styles.content}>
          <aside className={`${styles.panel} ${styles.sidebar}`}>
            <div className={styles.tabs}>
              <button type="button" className={`${styles.tabButton} ${renderingSubjects ? styles.tabButtonActive : ''}`} onClick={() => setActiveTab('subjects')}>
                主体管理
              </button>
              <button type="button" className={`${styles.tabButton} ${!renderingSubjects ? styles.tabButtonActive : ''}`} onClick={() => setActiveTab('styles')}>
                画风管理
              </button>
            </div>

            <div className={styles.toolbar}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => {
                  if (renderingSubjects) {
                    setSelectedSubjectId(null);
                    setSubjectDraft(makeEmptySubjectDraft());
                  } else {
                    setSelectedStyleId(null);
                    setStyleDraft(makeEmptyStyleDraft());
                  }
                }}
              >
                {renderingSubjects ? '新建主体' : '新建画风'}
              </button>
              <button type="button" className={styles.secondaryButton} onClick={() => void loadCatalogs()}>
                刷新
              </button>
            </div>

            <div className={styles.list}>
              {renderingSubjects ? (
                subjects.length > 0 ? subjects.map((item) => (
                  <button key={item.id} type="button" className={`${styles.listItem} ${selectedSubjectId === item.id ? styles.listItemActive : ''}`} onClick={() => setSelectedSubjectId(item.id)}>
                    <img src={item.imageUrl} alt={item.name} className={styles.thumb} />
                    <div>
                      <div className={styles.itemTitleRow}>
                        <span className={styles.itemTitle}>{item.name}</span>
                        <span className={`${styles.pill} ${item.enabled === false ? styles.pillMuted : ''}`}>{item.enabled === false ? '停用' : '启用'}</span>
                      </div>
                      <div className={styles.itemMeta}>{item.slug}</div>
                      <div className={styles.statusRow}>
                        <span className={styles.pill}>{item.visibility === 'public' ? '公共' : '个人'}</span>
                        <span className={styles.pill}>{item.subjectType}</span>
                        <span className={styles.pill}>{item.genderTag}</span>
                      </div>
                    </div>
                  </button>
                )) : <div className={styles.emptyState}>暂无主体。点击“新建主体”开始。</div>
              ) : (
                stylesList.length > 0 ? stylesList.map((item) => (
                  <button key={item.id} type="button" className={`${styles.listItem} ${selectedStyleId === item.id ? styles.listItemActive : ''}`} onClick={() => setSelectedStyleId(item.id)}>
                    <img src={item.imageUrl} alt={item.name} className={styles.thumb} />
                    <div>
                      <div className={styles.itemTitleRow}>
                        <span className={styles.itemTitle}>{item.name}</span>
                        <span className={`${styles.pill} ${item.enabled === false ? styles.pillMuted : ''}`}>{item.enabled === false ? '停用' : '启用'}</span>
                      </div>
                      <div className={styles.itemMeta}>{item.slug}</div>
                      <div className={styles.statusRow}>
                        <span className={styles.pill}>{item.visibility === 'public' ? '公共' : '个人'}</span>
                      </div>
                    </div>
                  </button>
                )) : <div className={styles.emptyState}>暂无画风。点击“新建画风”开始。</div>
              )}
            </div>
          </aside>

          <section className={`${styles.panel} ${styles.editor}`}>
            {renderingSubjects ? (
              <>
                <div className={styles.editorHeader}>
                  <div>
                    <h2 className={styles.editorTitle}>{subjectDraft.id ? `编辑主体：${subjectDraft.name || subjectDraft.slug}` : '创建主体'}</h2>
                    <p className={styles.editorDesc}>主体目录至少要包含封面图、稳定 slug、主体类型、参考图和 prompt 模板。这里保存后，首页会立即读取新数据。</p>
                  </div>
                  <div className={styles.editorActions}>
                    <button type="button" className={styles.ghostButton} onClick={() => setSubjectDraft(makeEmptySubjectDraft())}>清空</button>
                    <button type="button" className={styles.primaryButton} disabled={saving} onClick={saveSubject}>
                      {saving ? '保存中...' : subjectDraft.id ? '保存主体' : '创建主体'}
                    </button>
                  </div>
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.field}><label className={styles.label}>名称</label><input className={styles.input} value={subjectDraft.name} onChange={(event) => setSubjectDraft((current) => ({ ...current, name: event.target.value }))} /></div>
                  <div className={styles.field}><label className={styles.label}>Slug</label><input className={styles.input} value={subjectDraft.slug} onChange={(event) => setSubjectDraft((current) => ({ ...current, slug: event.target.value }))} /></div>
                  <div className={styles.field}>
                    <label className={styles.label}>可见性</label>
                    <select className={styles.select} value={subjectDraft.visibility} onChange={(event) => setSubjectDraft((current) => ({ ...current, visibility: event.target.value as CatalogVisibility }))}>
                      <option value="public">公共</option>
                      <option value="personal">个人</option>
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>主体类型</label>
                    <select className={styles.select} value={subjectDraft.subjectType} onChange={(event) => setSubjectDraft((current) => ({ ...current, subjectType: event.target.value as SubjectType }))}>
                      <option value="human">human</option>
                      <option value="animal">animal</option>
                      <option value="creature">creature</option>
                      <option value="object">object</option>
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>性别标签</label>
                    <select className={styles.select} value={subjectDraft.genderTag} onChange={(event) => setSubjectDraft((current) => ({ ...current, genderTag: event.target.value as SubjectGenderTag }))}>
                      <option value="unknown">unknown</option>
                      <option value="female">female</option>
                      <option value="male">male</option>
                      <option value="child">child</option>
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>排序</label>
                    <input className={styles.input} type="number" value={subjectDraft.sortOrder} onChange={(event) => setSubjectDraft((current) => ({ ...current, sortOrder: Number(event.target.value) || 0 }))} />
                  </div>
                  <div className={styles.fieldFull}><label className={styles.label}>封面图 URL</label><input className={styles.input} value={subjectDraft.imageUrl} onChange={(event) => setSubjectDraft((current) => ({ ...current, imageUrl: event.target.value }))} /></div>
                  <div className={styles.fieldFull}><label className={styles.label}>参考图 URL</label><input className={styles.input} value={subjectDraft.referenceImageUrl} onChange={(event) => setSubjectDraft((current) => ({ ...current, referenceImageUrl: event.target.value }))} /></div>
                  <div className={styles.fieldFull}><label className={styles.label}>描述</label><textarea className={styles.textarea} value={subjectDraft.description} onChange={(event) => setSubjectDraft((current) => ({ ...current, description: event.target.value }))} /></div>
                  <div className={styles.fieldFull}><label className={styles.label}>正向 Prompt 模板</label><textarea className={styles.textarea} value={subjectDraft.promptTemplate} onChange={(event) => setSubjectDraft((current) => ({ ...current, promptTemplate: event.target.value }))} /></div>
                  <div className={styles.fieldFull}><label className={styles.label}>负向 Prompt 模板</label><textarea className={styles.textarea} value={subjectDraft.negativePrompt} onChange={(event) => setSubjectDraft((current) => ({ ...current, negativePrompt: event.target.value }))} /></div>
                  <div className={styles.field}><label className={styles.label}>标签</label><input className={styles.input} value={subjectDraft.tags} onChange={(event) => setSubjectDraft((current) => ({ ...current, tags: event.target.value }))} placeholder="狐狸, 童话, 可爱" /></div>
                  <div className={styles.field}><label className={styles.label}>启用状态</label><div className={styles.checkboxRow}><input type="checkbox" checked={subjectDraft.enabled} onChange={(event) => setSubjectDraft((current) => ({ ...current, enabled: event.target.checked }))} /><span className={styles.hint}>关闭后首页不会显示该主体</span></div></div>
                  <div className={styles.fieldFull}><label className={styles.label}>扩展 Metadata(JSON)</label><textarea className={styles.textarea} value={subjectDraft.metadata} onChange={(event) => setSubjectDraft((current) => ({ ...current, metadata: event.target.value }))} placeholder='{"identityKey":"fox-main","voiceProfileId":"vp_123"}' /></div>
                  <div className={styles.fieldFull}>
                    <div className={styles.previewCard}>
                      <img src={subjectDraft.imageUrl || subjectDraft.referenceImageUrl || 'https://placehold.co/192x192/11151f/f4f7fb?text=Subject'} alt={subjectDraft.name || 'subject'} className={styles.previewImage} />
                      <div>
                        <div className={styles.label}>实时预览</div>
                        <div className={styles.hint}>首页主体选择使用封面图，生成链路建议优先使用参考图与 prompt 模板。</div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className={styles.editorHeader}>
                  <div>
                    <h2 className={styles.editorTitle}>{styleDraft.id ? `编辑画风：${styleDraft.name || styleDraft.slug}` : '创建画风'}</h2>
                    <p className={styles.editorDesc}>画风管理的关键不是预览图，而是 prompt 模板和推荐规则。这里先覆盖首页选项所需的基础字段。</p>
                  </div>
                  <div className={styles.editorActions}>
                    <button type="button" className={styles.ghostButton} onClick={() => setStyleDraft(makeEmptyStyleDraft())}>清空</button>
                    <button type="button" className={styles.primaryButton} disabled={saving} onClick={saveStyle}>
                      {saving ? '保存中...' : styleDraft.id ? '保存画风' : '创建画风'}
                    </button>
                  </div>
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.field}><label className={styles.label}>名称</label><input className={styles.input} value={styleDraft.name} onChange={(event) => setStyleDraft((current) => ({ ...current, name: event.target.value }))} /></div>
                  <div className={styles.field}><label className={styles.label}>Slug</label><input className={styles.input} value={styleDraft.slug} onChange={(event) => setStyleDraft((current) => ({ ...current, slug: event.target.value }))} /></div>
                  <div className={styles.field}>
                    <label className={styles.label}>可见性</label>
                    <select className={styles.select} value={styleDraft.visibility} onChange={(event) => setStyleDraft((current) => ({ ...current, visibility: event.target.value as CatalogVisibility }))}>
                      <option value="public">公共</option>
                      <option value="personal">个人</option>
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>排序</label>
                    <input className={styles.input} type="number" value={styleDraft.sortOrder} onChange={(event) => setStyleDraft((current) => ({ ...current, sortOrder: Number(event.target.value) || 0 }))} />
                  </div>
                  <div className={styles.fieldFull}><label className={styles.label}>封面图 URL</label><input className={styles.input} value={styleDraft.imageUrl} onChange={(event) => setStyleDraft((current) => ({ ...current, imageUrl: event.target.value }))} /></div>
                  <div className={styles.fieldFull}><label className={styles.label}>描述</label><textarea className={styles.textarea} value={styleDraft.description} onChange={(event) => setStyleDraft((current) => ({ ...current, description: event.target.value }))} /></div>
                  <div className={styles.fieldFull}><label className={styles.label}>正向 Prompt 模板</label><textarea className={styles.textarea} value={styleDraft.promptTemplate} onChange={(event) => setStyleDraft((current) => ({ ...current, promptTemplate: event.target.value }))} /></div>
                  <div className={styles.fieldFull}><label className={styles.label}>负向 Prompt 模板</label><textarea className={styles.textarea} value={styleDraft.negativePrompt} onChange={(event) => setStyleDraft((current) => ({ ...current, negativePrompt: event.target.value }))} /></div>
                  <div className={styles.field}><label className={styles.label}>标签</label><input className={styles.input} value={styleDraft.tags} onChange={(event) => setStyleDraft((current) => ({ ...current, tags: event.target.value }))} placeholder="国风, 水墨, 留白" /></div>
                  <div className={styles.field}><label className={styles.label}>启用状态</label><div className={styles.checkboxRow}><input type="checkbox" checked={styleDraft.enabled} onChange={(event) => setStyleDraft((current) => ({ ...current, enabled: event.target.checked }))} /><span className={styles.hint}>关闭后首页不会显示该画风</span></div></div>
                  <div className={styles.fieldFull}><label className={styles.label}>扩展 Metadata(JSON)</label><textarea className={styles.textarea} value={styleDraft.metadata} onChange={(event) => setStyleDraft((current) => ({ ...current, metadata: event.target.value }))} placeholder='{"recommendedModelFamily":"seko-image"}' /></div>
                  <div className={styles.fieldFull}>
                    <div className={styles.previewCard}>
                      <img src={styleDraft.imageUrl || 'https://placehold.co/192x192/11151f/f4f7fb?text=Style'} alt={styleDraft.name || 'style'} className={styles.previewImage} />
                      <div>
                        <div className={styles.label}>实时预览</div>
                        <div className={styles.hint}>建议把真正的风格规则写进 prompt 模板，而不是只依赖这张封面图。</div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className={`${styles.feedback} ${feedbackError ? styles.feedbackError : ''}`}>{feedback}</div>
          </section>
        </div>
      </div>
    </div>
  );
}
