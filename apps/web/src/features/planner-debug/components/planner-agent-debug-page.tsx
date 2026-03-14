'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import styles from './planner-agent-debug-page.module.css';
import { PlannerSubAgentBrowser } from './planner-sub-agent-browser';
import { PlannerStepDefinitionEditor } from './planner-step-definition-editor';

import type {
  PlannerAgentProfileDebugItem,
  PlannerDebugCompareResponse,
  PlannerDebugRunDetail,
  PlannerDebugRunListItem,
  PlannerDebugRunResponse,
  PlannerSubAgentCatalogEntry,
  PlannerSubAgentReleaseItem,
  PlannerSubAgentProfileDebugItem,
  PlannerStepDefinitionEditorItem,
} from '../lib/planner-agent-debug-types';

interface EnvelopeSuccess<T> {
  ok: true;
  data: T;
}

interface EnvelopeFailure {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

type Envelope<T> = EnvelopeSuccess<T> | EnvelopeFailure;

interface EditableSubAgentState {
  displayName: string;
  description: string;
  systemPromptOverride: string;
  developerPromptOverride: string;
  stepDefinitions: PlannerStepDefinitionEditorItem[];
  status: 'draft' | 'active' | 'deprecated' | 'archived';
}

interface DebugFormState {
  projectTitle: string;
  episodeTitle: string;
  userPrompt: string;
  scriptContent: string;
  selectedSubjectName: string;
  selectedStyleName: string;
  selectedImageModelLabel: string;
  modelFamily: string;
  modelEndpoint: string;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

async function requestJson<T>(path: string, init?: RequestInit) {
  const response = await fetch(path, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
  });

  const payload = (await response.json()) as Envelope<T>;
  if (!response.ok || !payload.ok) {
    throw new Error(payload.ok ? 'Request failed.' : payload.error.message);
  }

  return payload.data;
}

function buildEditableState(subAgent: PlannerSubAgentProfileDebugItem | null): EditableSubAgentState {
  return {
    displayName: subAgent?.displayName ?? '',
    description: subAgent?.description ?? '',
    systemPromptOverride: subAgent?.systemPromptOverride ?? '',
    developerPromptOverride: subAgent?.developerPromptOverride ?? '',
    stepDefinitions: normalizeStepDefinitions(subAgent?.stepDefinitionsJson),
    status: ((subAgent?.status ?? 'active').toLowerCase() as EditableSubAgentState['status']),
  };
}

function normalizeStepDefinitions(value: unknown): PlannerStepDefinitionEditorItem[] {
  if (!Array.isArray(value)) {
    return [
      {
        id: 'step-1',
        title: '',
        status: 'done',
        details: [''],
      },
    ];
  }

  const normalized = value
    .map((item, index) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const record = item as Record<string, unknown>;
      const details = Array.isArray(record.details)
        ? record.details.filter((detail): detail is string => typeof detail === 'string')
        : [];

      return {
        id: typeof record.id === 'string' && record.id.trim() ? record.id : `step-${index + 1}`,
        title: typeof record.title === 'string' ? record.title : '',
        status:
          record.status === 'pending' || record.status === 'running' || record.status === 'failed' || record.status === 'done'
            ? record.status
            : 'done',
        details: details.length > 0 ? details : [''],
      } satisfies PlannerStepDefinitionEditorItem;
    })
    .filter((item): item is PlannerStepDefinitionEditorItem => item !== null);

  return normalized.length > 0
    ? normalized
    : [
        {
          id: 'step-1',
          title: '',
          status: 'done',
          details: [''],
        },
      ];
}

function serializeStepDefinitions(value: PlannerStepDefinitionEditorItem[]) {
  return value
    .map((step, index) => ({
      id: step.id.trim() || `step-${index + 1}`,
      title: step.title.trim(),
      status: step.status,
      details: step.details.map((detail) => detail.trim()).filter(Boolean),
    }))
    .filter((step) => step.title.length > 0);
}

function buildInitialDebugForm(subAgent: PlannerSubAgentProfileDebugItem | null): DebugFormState {
  return {
    projectTitle: '调试项目',
    episodeTitle: '第1集',
    userPrompt: '',
    scriptContent: '',
    selectedSubjectName: '',
    selectedStyleName: '',
    selectedImageModelLabel: '',
    modelFamily: 'doubao-text',
    modelEndpoint: '',
  };
}

function statusClass(status: string) {
  switch (status) {
    case 'active':
      return `${styles.status} ${styles.statusActive}`;
    case 'draft':
      return `${styles.status} ${styles.statusDraft}`;
    default:
      return `${styles.status} ${styles.statusOther}`;
  }
}

interface PlannerAgentDebugPageProps {
  initialSubAgentSlug?: string;
  mode?: 'manage' | 'debug';
  initialReplayRunId?: string;
}

export function PlannerAgentDebugPage({ initialSubAgentSlug, mode = 'debug', initialReplayRunId }: PlannerAgentDebugPageProps) {
  const [profiles, setProfiles] = useState<PlannerAgentProfileDebugItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubAgentId, setSelectedSubAgentId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [contentTypeFilter, setContentTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editorState, setEditorState] = useState<EditableSubAgentState>(buildEditableState(null));
  const [debugForm, setDebugForm] = useState<DebugFormState>(buildInitialDebugForm(null));
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [recentRuns, setRecentRuns] = useState<PlannerDebugRunListItem[]>([]);
  const [selectedRun, setSelectedRun] = useState<PlannerDebugRunDetail | null>(null);
  const [loadingRun, setLoadingRun] = useState(false);
  const [compareSubAgentId, setCompareSubAgentId] = useState<string>('');
  const [compareRunning, setCompareRunning] = useState(false);
  const [compareResult, setCompareResult] = useState<PlannerDebugCompareResponse | null>(null);
  const [releases, setReleases] = useState<PlannerSubAgentReleaseItem[]>([]);
  const [message, setMessage] = useState<{ kind: 'ok' | 'warn' | 'error'; text: string } | null>(null);
  const [debugResult, setDebugResult] = useState<PlannerDebugRunResponse | null>(null);

  const subAgents = useMemo<PlannerSubAgentCatalogEntry[]>(
    () =>
      profiles.flatMap((profile) =>
        profile.subAgentProfiles.map((subAgent) => ({
          profile,
          subAgent,
        })),
      ),
    [profiles],
  );

  const availableContentTypes = useMemo(
    () => Array.from(new Set(subAgents.map((item) => item.profile.contentType))),
    [subAgents],
  );

  const filteredSubAgents = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return subAgents.filter(({ profile, subAgent }) => {
      if (contentTypeFilter !== 'all' && profile.contentType !== contentTypeFilter) {
        return false;
      }
      if (statusFilter !== 'all' && subAgent.status !== statusFilter) {
        return false;
      }
      if (!normalizedSearch) {
        return true;
      }

      const haystack = [
        profile.contentType,
        subAgent.subtype,
        subAgent.displayName,
        subAgent.slug,
        subAgent.description ?? '',
      ].join(' ').toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [contentTypeFilter, searchTerm, statusFilter, subAgents]);

  const selectedSubAgentEntry = useMemo(
    () => subAgents.find((item) => item.subAgent.id === selectedSubAgentId) ?? subAgents[0] ?? null,
    [selectedSubAgentId, subAgents],
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const nextProfiles = await requestJson<PlannerAgentProfileDebugItem[]>('/api/planner/agent-profiles');
        if (cancelled) {
          return;
        }
        setProfiles(nextProfiles);
        const matchedSubAgent = initialSubAgentSlug
          ? nextProfiles.flatMap((profile) => profile.subAgentProfiles).find((subAgent) => subAgent.slug === initialSubAgentSlug)
          : null;
        if (matchedSubAgent) {
          setSelectedSubAgentId(matchedSubAgent.id);
        } else if (!selectedSubAgentId) {
          setSelectedSubAgentId(nextProfiles[0]?.subAgentProfiles[0]?.id ?? null);
        }
      } catch (error) {
        if (!cancelled) {
          setMessage({ kind: 'error', text: getErrorMessage(error, '加载 agent 配置失败。') });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [initialSubAgentSlug]);

  useEffect(() => {
    if (!filteredSubAgents.length || !selectedSubAgentId) {
      return;
    }

    if (!filteredSubAgents.some((item) => item.subAgent.id === selectedSubAgentId)) {
      setSelectedSubAgentId(filteredSubAgents[0]?.subAgent.id ?? null);
    }
  }, [filteredSubAgents, selectedSubAgentId]);

  useEffect(() => {
    setEditorState(buildEditableState(selectedSubAgentEntry?.subAgent ?? null));
    setDebugForm((current) => ({
      ...buildInitialDebugForm(selectedSubAgentEntry?.subAgent ?? null),
      userPrompt: current.userPrompt,
      scriptContent: current.scriptContent,
      selectedSubjectName: current.selectedSubjectName,
      selectedStyleName: current.selectedStyleName,
      selectedImageModelLabel: current.selectedImageModelLabel,
      modelFamily: current.modelFamily,
      modelEndpoint: current.modelEndpoint,
      projectTitle: current.projectTitle,
      episodeTitle: current.episodeTitle,
    }));
    setDebugResult(null);
    if (!initialReplayRunId) {
      setSelectedRun(null);
    }
    setCompareResult(null);
    setCompareSubAgentId((current) => {
      if (current && current !== selectedSubAgentEntry?.subAgent.id) {
        return current;
      }
      const fallback = subAgents.find((item) => item.subAgent.id !== selectedSubAgentEntry?.subAgent.id)?.subAgent.id ?? '';
      return fallback;
    });
  }, [initialReplayRunId, selectedSubAgentEntry]);

  useEffect(() => {
    if (!selectedSubAgentEntry) {
      setReleases([]);
      return;
    }

    let cancelled = false;

    const loadReleases = async () => {
      try {
        const nextReleases = await requestJson<PlannerSubAgentReleaseItem[]>(
          `/api/planner/sub-agent-profiles/${encodeURIComponent(selectedSubAgentEntry.subAgent.id)}/releases`,
        );
        if (!cancelled) {
          setReleases(nextReleases);
        }
      } catch (error) {
        if (!cancelled) {
          setMessage({ kind: 'error', text: getErrorMessage(error, '加载发布快照失败。') });
        }
      }
    };

    void loadReleases();
    return () => {
      cancelled = true;
    };
  }, [selectedSubAgentEntry]);

  useEffect(() => {
    if (mode !== 'debug') {
      return;
    }

    let cancelled = false;

    const loadRecentRuns = async () => {
      try {
        const query = selectedSubAgentEntry?.subAgent.slug ? `?subAgentSlug=${encodeURIComponent(selectedSubAgentEntry.subAgent.slug)}` : '';
        const runs = await requestJson<PlannerDebugRunListItem[]>(`/api/planner/debug/runs${query}`);
        if (!cancelled) {
          setRecentRuns(runs);
        }
      } catch (error) {
        if (!cancelled) {
          setMessage({ kind: 'error', text: getErrorMessage(error, '加载调试历史失败。') });
        }
      }
    };

    void loadRecentRuns();
    return () => {
      cancelled = true;
    };
  }, [mode, selectedSubAgentEntry]);

  useEffect(() => {
    if (!initialReplayRunId || mode !== 'debug') {
      return;
    }

    let cancelled = false;

    const hydrateFromRun = async () => {
      try {
        const detail = await requestJson<PlannerDebugRunDetail>(`/api/planner/debug/runs/${encodeURIComponent(initialReplayRunId)}`);
        if (cancelled) {
          return;
        }
        setSelectedRun(detail);
        const input = detail.input ?? {};
        setDebugForm((current) => ({
          ...current,
          projectTitle: typeof input.projectTitle === 'string' ? input.projectTitle : current.projectTitle,
          episodeTitle: typeof input.episodeTitle === 'string' ? input.episodeTitle : current.episodeTitle,
          userPrompt: typeof input.userPrompt === 'string' ? input.userPrompt : current.userPrompt,
          scriptContent: typeof input.scriptContent === 'string' ? input.scriptContent : '',
          selectedSubjectName: typeof input.selectedSubjectName === 'string' ? input.selectedSubjectName : '',
          selectedStyleName: typeof input.selectedStyleName === 'string' ? input.selectedStyleName : '',
          selectedImageModelLabel: typeof input.selectedImageModelLabel === 'string' ? input.selectedImageModelLabel : '',
        }));
      } catch (error) {
        if (!cancelled) {
          setMessage({ kind: 'error', text: getErrorMessage(error, '从历史回放恢复调试表单失败。') });
        }
      }
    };

    void hydrateFromRun();
    return () => {
      cancelled = true;
    };
  }, [initialReplayRunId, mode]);

  const handleSave = async () => {
    if (!selectedSubAgentEntry) {
      return;
    }

    const stepDefinitionsJson = serializeStepDefinitions(editorState.stepDefinitions);
    if (!stepDefinitionsJson.length) {
      setMessage({ kind: 'error', text: '至少保留一个有效步骤，并填写步骤标题。' });
      return;
    }

    setSaving(true);
    try {
      await requestJson(`/api/planner/sub-agent-profiles/${encodeURIComponent(selectedSubAgentEntry.subAgent.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          displayName: editorState.displayName,
          description: editorState.description || null,
          systemPromptOverride: editorState.systemPromptOverride || null,
          developerPromptOverride: editorState.developerPromptOverride || null,
          stepDefinitionsJson,
          status: editorState.status.toUpperCase(),
        }),
      });

      const nextProfiles = await requestJson<PlannerAgentProfileDebugItem[]>('/api/planner/agent-profiles');
      setProfiles(nextProfiles);
      setMessage({ kind: 'ok', text: '子 agent 配置已保存到数据库。' });
    } catch (error) {
      setMessage({ kind: 'error', text: getErrorMessage(error, '保存子 agent 失败。') });
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!selectedSubAgentEntry) {
      return;
    }

    setPublishing(true);
    try {
      await requestJson(`/api/planner/sub-agent-profiles/${encodeURIComponent(selectedSubAgentEntry.subAgent.id)}/publish`, {
        method: 'POST',
      });
      const nextProfiles = await requestJson<PlannerAgentProfileDebugItem[]>('/api/planner/agent-profiles');
      setProfiles(nextProfiles);
      const nextReleases = await requestJson<PlannerSubAgentReleaseItem[]>(
        `/api/planner/sub-agent-profiles/${encodeURIComponent(selectedSubAgentEntry.subAgent.id)}/releases`,
      );
      setReleases(nextReleases);
      setMessage({ kind: 'ok', text: '子 agent 已发布为 ACTIVE。' });
    } catch (error) {
      setMessage({ kind: 'error', text: getErrorMessage(error, '发布子 agent 失败。') });
    } finally {
      setPublishing(false);
    }
  };

  const handleRun = async () => {
    if (!selectedSubAgentEntry || !debugForm.userPrompt.trim()) {
      setMessage({ kind: 'warn', text: '先选择子 agent 并填写调试提示词。' });
      return;
    }

    setRunning(true);
    setDebugResult(null);
    try {
      const result = await requestJson<PlannerDebugRunResponse>('/api/planner/debug/run', {
        method: 'POST',
        body: JSON.stringify({
          contentType: selectedSubAgentEntry.profile.contentType,
          subtype: selectedSubAgentEntry.subAgent.subtype,
          projectTitle: debugForm.projectTitle,
          episodeTitle: debugForm.episodeTitle,
          userPrompt: debugForm.userPrompt,
          scriptContent: debugForm.scriptContent || undefined,
          selectedSubjectName: debugForm.selectedSubjectName || undefined,
          selectedStyleName: debugForm.selectedStyleName || undefined,
          selectedImageModelLabel: debugForm.selectedImageModelLabel || undefined,
          modelFamily: debugForm.modelFamily || undefined,
          modelEndpoint: debugForm.modelEndpoint || undefined,
        }),
      });
      setDebugResult(result);
      const runs = await requestJson<PlannerDebugRunListItem[]>(
        `/api/planner/debug/runs?subAgentSlug=${encodeURIComponent(selectedSubAgentEntry.subAgent.slug)}`,
      );
      setRecentRuns(runs);
      setMessage({
        kind: result.executionMode === 'live' ? 'ok' : 'warn',
        text: result.executionMode === 'live' ? '已完成真实模型调试运行。' : '当前使用回退模式生成调试结果，请检查 provider 配置。',
      });
    } catch (error) {
      setMessage({ kind: 'error', text: getErrorMessage(error, '调试运行失败。') });
    } finally {
      setRunning(false);
    }
  };

  const handleSelectRun = async (runId: string) => {
    setLoadingRun(true);
    try {
      const detail = await requestJson<PlannerDebugRunDetail>(`/api/planner/debug/runs/${encodeURIComponent(runId)}`);
      setSelectedRun(detail);
    } catch (error) {
      setMessage({ kind: 'error', text: getErrorMessage(error, '加载调试运行详情失败。') });
    } finally {
      setLoadingRun(false);
    }
  };

  const handleCompare = async () => {
    if (!selectedSubAgentEntry || !compareSubAgentId || !debugForm.userPrompt.trim()) {
      setMessage({ kind: 'warn', text: '先选择 A/B 两个子 agent，并填写调试提示词。' });
      return;
    }

    setCompareRunning(true);
    setCompareResult(null);
    try {
      const result = await requestJson<PlannerDebugCompareResponse>('/api/planner/debug/compare', {
        method: 'POST',
        body: JSON.stringify({
          leftSubAgentId: selectedSubAgentEntry.subAgent.id,
          rightSubAgentId: compareSubAgentId,
          contentType: selectedSubAgentEntry.profile.contentType,
          subtype: selectedSubAgentEntry.subAgent.subtype,
          projectTitle: debugForm.projectTitle,
          episodeTitle: debugForm.episodeTitle,
          userPrompt: debugForm.userPrompt,
          scriptContent: debugForm.scriptContent || undefined,
          selectedSubjectName: debugForm.selectedSubjectName || undefined,
          selectedStyleName: debugForm.selectedStyleName || undefined,
          selectedImageModelLabel: debugForm.selectedImageModelLabel || undefined,
          modelFamily: debugForm.modelFamily || undefined,
          modelEndpoint: debugForm.modelEndpoint || undefined,
        }),
      });
      setCompareResult(result);
      const runs = await requestJson<PlannerDebugRunListItem[]>(
        `/api/planner/debug/runs?compareGroupKey=${encodeURIComponent(result.compareGroupKey)}`,
      );
      setRecentRuns((current) => [...runs, ...current].slice(0, 20));
      setMessage({ kind: 'ok', text: 'A/B 对比已完成。' });
    } catch (error) {
      setMessage({ kind: 'error', text: getErrorMessage(error, 'A/B 对比失败。') });
    } finally {
      setCompareRunning(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.hero}>
          <div>
            <div className={styles.eyebrow}>{mode === 'manage' ? 'Planner Agent Registry' : 'Planner Debug Console'}</div>
            <h1 className={styles.title}>{mode === 'manage' ? '策划 Agent 管理台' : '策划 Agent 调试台'}</h1>
            <p className={styles.subtitle}>
              {mode === 'manage'
                ? '独立于主流程的内部页面。这里直接读写数据库中的 AgentProfile / SubAgentProfile，并负责编辑、发布与跳转到独立调试页。'
                : '独立于主流程的内部页面。这里使用数据库中的 AgentProfile / SubAgentProfile 运行一次真实或回退调试，并查看历史回放与 A/B 对比。'}
            </p>
          </div>
          <div className={styles.heroMeta}>
            <div className={styles.metaPill}>主流程页不暴露 Prompt 编辑、A/B、回放入口</div>
            <div className={styles.metaPill}>运行时配置真相来源：MySQL 表</div>
          </div>
        </section>

        {message ? (
          <div className={`${styles.message} ${message.kind === 'ok' ? styles.messageOk : message.kind === 'warn' ? styles.messageWarn : styles.messageError}`}>
            {message.text}
          </div>
        ) : null}

        <section className={styles.grid}>
          <PlannerSubAgentBrowser
            mode={mode}
            loading={loading}
            entries={filteredSubAgents}
            selectedSubAgentId={selectedSubAgentEntry?.subAgent.id ?? null}
            onSelect={setSelectedSubAgentId}
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            contentTypeFilter={contentTypeFilter}
            onContentTypeFilterChange={setContentTypeFilter}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            availableContentTypes={availableContentTypes}
          />

          {mode === 'manage' ? (
            <>
              <div className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <h2 className={styles.panelTitle}>配置编辑</h2>
                    <p className={styles.panelHint}>直接修改表内子 Agent 配置。这里不进入主流程 planner 页。</p>
                  </div>
                  <button type="button" className={styles.buttonGhost} onClick={handleSave} disabled={!selectedSubAgentEntry || saving}>
                    {saving ? '保存中…' : '保存配置'}
                  </button>
                </div>
                <div className={styles.panelBody}>
                  {selectedSubAgentEntry ? (
                    <div className={styles.stack}>
                      <div className={styles.twoCol}>
                        <div className={styles.fieldGroup}>
                          <label className={styles.fieldLabel}>Display Name</label>
                          <input className={styles.input} value={editorState.displayName} onChange={(event) => setEditorState((current) => ({ ...current, displayName: event.target.value }))} />
                        </div>
                        <div className={styles.fieldGroup}>
                          <label className={styles.fieldLabel}>Status</label>
                          <select className={styles.select} value={editorState.status} onChange={(event) => setEditorState((current) => ({ ...current, status: event.target.value as EditableSubAgentState['status'] }))}>
                            <option value="draft">draft</option>
                            <option value="active">active</option>
                            <option value="deprecated">deprecated</option>
                            <option value="archived">archived</option>
                          </select>
                        </div>
                      </div>

                      <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>Description</label>
                        <textarea className={styles.textarea} value={editorState.description} onChange={(event) => setEditorState((current) => ({ ...current, description: event.target.value }))} />
                      </div>

                      <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>System Prompt Override</label>
                        <textarea className={styles.textarea} value={editorState.systemPromptOverride} onChange={(event) => setEditorState((current) => ({ ...current, systemPromptOverride: event.target.value }))} />
                      </div>

                      <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>Developer Prompt Override</label>
                        <textarea className={styles.textarea} value={editorState.developerPromptOverride} onChange={(event) => setEditorState((current) => ({ ...current, developerPromptOverride: event.target.value }))} />
                      </div>

                      <div className={styles.fieldGroup}>
                        <div className={styles.fieldLabelRow}>
                          <label className={styles.fieldLabel}>Step Definitions</label>
                          <span className={styles.fieldHint}>结构化编辑，保存时自动序列化为 JSON</span>
                        </div>
                        <PlannerStepDefinitionEditor
                          value={editorState.stepDefinitions}
                          onChange={(stepDefinitions) => setEditorState((current) => ({ ...current, stepDefinitions }))}
                        />
                        <details className={styles.jsonPreview}>
                          <summary className={styles.jsonPreviewSummary}>查看保存后的 JSON</summary>
                          <pre className={styles.pre}>{JSON.stringify(serializeStepDefinitions(editorState.stepDefinitions), null, 2)}</pre>
                        </details>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.fieldHint}>当前没有可编辑的子 Agent。</div>
                  )}
                </div>
              </div>

              <div className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <h2 className={styles.panelTitle}>发布与调试入口</h2>
                    <p className={styles.panelHint}>编辑完成后发布，再跳转到独立调试页做验证。</p>
                  </div>
                  <button type="button" className={styles.button} onClick={handlePublish} disabled={!selectedSubAgentEntry || publishing}>
                    {publishing ? '发布中…' : '发布为 ACTIVE'}
                  </button>
                </div>
                <div className={styles.panelBody}>
                  {selectedSubAgentEntry ? (
                    <div className={styles.stack}>
                      <div className={styles.resultBlock}>
                        <h3 className={styles.resultTitle}>当前选择</h3>
                        <pre className={styles.pre}>{JSON.stringify({
                          contentType: selectedSubAgentEntry.profile.contentType,
                          subtype: selectedSubAgentEntry.subAgent.subtype,
                          slug: selectedSubAgentEntry.subAgent.slug,
                          status: selectedSubAgentEntry.subAgent.status,
                        }, null, 2)}</pre>
                      </div>
                      <div className={styles.linkRow}>
                        <Link href={`/internal/planner-debug/${encodeURIComponent(selectedSubAgentEntry.subAgent.slug)}`}>打开单项调试页</Link>
                        <Link href="/internal/planner-debug/compare">打开 A/B 对比页</Link>
                        <Link href="/internal/planner-debug/runs">查看调试历史</Link>
                      </div>
                      <div className={styles.resultBlock}>
                        <h3 className={styles.resultTitle}>发布快照</h3>
                      <div className={styles.historyList}>
                        {releases.map((release) => (
                          <div key={release.id} className={styles.historyRunItem}>
                            <div className={styles.catalogTitle}>
                              <span>{`Release v${release.releaseVersion}`}</span>
                              <span className={styles.status}>published</span>
                            </div>
                            <div className={styles.catalogMeta}>
                              <div>{release.displayName}</div>
                              <div>{new Date(release.publishedAt).toLocaleString('zh-CN')}</div>
                            </div>
                          </div>
                        ))}
                        {!releases.length ? <div className={styles.fieldHint}>当前还没有发布快照。</div> : null}
                      </div>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.fieldHint}>当前没有可发布的子 Agent。</div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <h2 className={styles.panelTitle}>调试运行</h2>
                    <p className={styles.panelHint}>运行一次独立 debug，不回写主流程 planner workspace。</p>
                  </div>
                  <button type="button" className={styles.button} onClick={handleRun} disabled={running || !selectedSubAgentEntry}>
                    {running ? '运行中…' : '运行 Debug'}
                  </button>
                </div>
                <div className={styles.panelBody}>
                  <div className={styles.stack}>
                <div className={styles.twoCol}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>Project Title</label>
                    <input className={styles.input} value={debugForm.projectTitle} onChange={(event) => setDebugForm((current) => ({ ...current, projectTitle: event.target.value }))} />
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>Episode Title</label>
                    <input className={styles.input} value={debugForm.episodeTitle} onChange={(event) => setDebugForm((current) => ({ ...current, episodeTitle: event.target.value }))} />
                  </div>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>User Prompt</label>
                  <textarea className={styles.textarea} value={debugForm.userPrompt} onChange={(event) => setDebugForm((current) => ({ ...current, userPrompt: event.target.value }))} />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Script Content</label>
                  <textarea className={styles.textarea} value={debugForm.scriptContent} onChange={(event) => setDebugForm((current) => ({ ...current, scriptContent: event.target.value }))} />
                </div>

                <div className={styles.twoCol}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>主体</label>
                    <input className={styles.input} value={debugForm.selectedSubjectName} onChange={(event) => setDebugForm((current) => ({ ...current, selectedSubjectName: event.target.value }))} />
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>画风</label>
                    <input className={styles.input} value={debugForm.selectedStyleName} onChange={(event) => setDebugForm((current) => ({ ...current, selectedStyleName: event.target.value }))} />
                  </div>
                </div>

                <div className={styles.twoCol}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>主体图模型标签</label>
                    <input className={styles.input} value={debugForm.selectedImageModelLabel} onChange={(event) => setDebugForm((current) => ({ ...current, selectedImageModelLabel: event.target.value }))} />
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>Text Model Family</label>
                    <input className={styles.input} value={debugForm.modelFamily} onChange={(event) => setDebugForm((current) => ({ ...current, modelFamily: event.target.value }))} />
                  </div>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Text Model Endpoint Slug</label>
                  <input className={styles.input} placeholder="可留空，走 family 默认解析" value={debugForm.modelEndpoint} onChange={(event) => setDebugForm((current) => ({ ...current, modelEndpoint: event.target.value }))} />
                </div>

                    {debugResult ? (
                      <>
                        <div className={styles.resultBlock}>
                          <h3 className={styles.resultTitle}>运行信息</h3>
                          <pre className={styles.pre}>{JSON.stringify({
                            debugRunId: debugResult.debugRunId,
                            executionMode: debugResult.executionMode,
                            agentProfile: debugResult.agentProfile,
                            subAgentProfile: debugResult.subAgentProfile,
                            model: debugResult.model,
                          }, null, 2)}</pre>
                        </div>

                        <div className={styles.linkRow}>
                          <Link href={`/internal/planner-debug/runs/${encodeURIComponent(debugResult.debugRunId)}`}>打开本次回放页</Link>
                          <Link href="/internal/planner-debug/compare">打开 A/B 对比页</Link>
                          {selectedSubAgentEntry ? (
                            <Link href={`/internal/planner-debug/${encodeURIComponent(selectedSubAgentEntry.subAgent.slug)}?replayRunId=${encodeURIComponent(debugResult.debugRunId)}`}>
                              用本次结果回填调试表单
                            </Link>
                          ) : null}
                        </div>

                        <div className={styles.resultBlock}>
                          <h3 className={styles.resultTitle}>Final Prompt</h3>
                          <pre className={styles.pre}>{debugResult.finalPrompt}</pre>
                        </div>

                        <div className={styles.resultBlock}>
                          <h3 className={styles.resultTitle}>Raw Output</h3>
                          <pre className={styles.pre}>{debugResult.rawText ?? '(empty)'}</pre>
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <h2 className={styles.panelTitle}>回放与 A/B</h2>
                    <p className={styles.panelHint}>最近调试历史、详情回放，以及同上下文 A/B 对比。</p>
                  </div>
                  <Link href="/internal/planner-debug/runs" className={styles.buttonGhost}>
                    全部历史
                  </Link>
                </div>
                <div className={styles.panelBody}>
                  <div className={styles.stack}>
                    <div className={styles.fieldGroup}>
                      <label className={styles.fieldLabel}>A/B 对比对象</label>
                      <select className={styles.select} value={compareSubAgentId} onChange={(event) => setCompareSubAgentId(event.target.value)}>
                        {subAgents
                          .filter((item) => item.subAgent.id !== selectedSubAgentEntry?.subAgent.id)
                          .map(({ subAgent }) => (
                            <option key={subAgent.id} value={subAgent.id}>
                              {subAgent.displayName} / {subAgent.subtype}
                            </option>
                          ))}
                      </select>
                      <button type="button" className={styles.button} onClick={handleCompare} disabled={compareRunning || !selectedSubAgentEntry || !compareSubAgentId}>
                        {compareRunning ? '对比中…' : '运行 A/B 对比'}
                      </button>
                    </div>

                    {compareResult ? (
                      <div className={styles.resultBlock}>
                        <h3 className={styles.resultTitle}>A/B 对比结果</h3>
                        <pre className={styles.pre}>{JSON.stringify({
                          compareGroupKey: compareResult.compareGroupKey,
                          left: {
                            debugRunId: compareResult.left.debugRunId,
                            subAgent: compareResult.left.subAgentProfile.displayName,
                            executionMode: compareResult.left.executionMode,
                          },
                          right: {
                            debugRunId: compareResult.right.debugRunId,
                            subAgent: compareResult.right.subAgentProfile.displayName,
                            executionMode: compareResult.right.executionMode,
                          },
                        }, null, 2)}</pre>
                        <div className={styles.linkRow}>
                          <Link href={`/internal/planner-debug/runs/${encodeURIComponent(compareResult.left.debugRunId)}`}>查看 A 结果</Link>
                          <Link href={`/internal/planner-debug/runs/${encodeURIComponent(compareResult.right.debugRunId)}`}>查看 B 结果</Link>
                        </div>
                      </div>
                    ) : null}

                    <div className={styles.historyList}>
                      {recentRuns.map((run) => (
                        <button key={run.id} type="button" className={styles.historyRunItem} onClick={() => handleSelectRun(run.id)}>
                          <div className={styles.catalogTitle}>
                            <span>{run.compareLabel ? `${run.compareLabel} · ` : ''}{run.subAgentProfile?.displayName ?? 'Unknown'}</span>
                            <span className={statusClass(run.executionMode)}>{run.executionMode}</span>
                          </div>
                          <div className={styles.catalogMeta}>
                            <div>{new Date(run.createdAt).toLocaleString('zh-CN')}</div>
                            <div>{run.id}</div>
                          </div>
                        </button>
                      ))}
                      {!recentRuns.length ? <div className={styles.fieldHint}>当前子 Agent 还没有调试历史。</div> : null}
                    </div>

                    {loadingRun ? <div className={styles.fieldHint}>正在加载回放详情…</div> : null}
                    {selectedRun ? (
                      <div className={styles.resultBlock}>
                        <h3 className={styles.resultTitle}>当前回放</h3>
                        <pre className={styles.pre}>{JSON.stringify(selectedRun, null, 2)}</pre>
                        <div className={styles.linkRow}>
                          <Link href={`/internal/planner-debug/runs/${encodeURIComponent(selectedRun.id)}`}>打开独立回放页</Link>
                          {selectedRun.subAgentProfile?.slug ? (
                            <Link href={`/internal/planner-debug/${encodeURIComponent(selectedRun.subAgentProfile.slug)}?replayRunId=${encodeURIComponent(selectedRun.id)}`}>
                              用该回放结果回填调试表单
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
