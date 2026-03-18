'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { AdminShell } from '@/features/admin/components/admin-shell';

import styles from './planner-agent-debug-page.module.css';
import { PlannerDebugHistoryPane } from './planner-debug-history-pane';
import { PlannerDebugRunPane } from './planner-debug-run-pane';
import { PlannerManageEditorPane } from './planner-manage-editor-pane';
import { PlannerManageSidebar } from './planner-manage-sidebar';
import { PlannerSubAgentBrowser } from './planner-sub-agent-browser';
import { PlannerPageHero } from './planner-page-hero';
import { PlannerPageToolbar } from './planner-page-toolbar';

import type {
  PlannerAgentProfileDebugItem,
  PlannerDebugCompareResponse,
  PlannerDebugApplyResult,
  PlannerDebugRunDetail,
  PlannerDebugRunListItem,
  PlannerDebugRunResponse,
  PlannerSubAgentCatalogEntry,
  PlannerSubAgentReleaseItem,
  PlannerSubAgentProfileDebugItem,
  PlannerStepDefinitionEditorItem,
} from '../lib/planner-agent-debug-types';
import { buildInitialDebugForm, buildPlannerDebugSearch, parseDebugContext, stringifyJsonInput } from '../lib/planner-debug-runtime';
import type { DebugFormState } from '../lib/planner-debug-runtime';
import {
  normalizeGenerationConfig,
  normalizeInputSchema,
  normalizeOutputSchema,
  normalizeToolPolicy,
  serializeGenerationConfig,
  serializeInputSchema,
  serializeOutputSchema,
  serializeToolPolicy,
} from '../lib/planner-agent-config-editor';
import type {
  PlannerGenerationConfigEditorState,
  PlannerInputSchemaEditorState,
  PlannerOutputSchemaEditorState,
  PlannerToolPolicyEditorState,
} from '../lib/planner-agent-config-editor';

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
  inputSchema: PlannerInputSchemaEditorState;
  outputSchema: PlannerOutputSchemaEditorState;
  toolPolicy: PlannerToolPolicyEditorState;
  generationConfig: PlannerGenerationConfigEditorState;
  status: 'draft' | 'active' | 'deprecated' | 'archived';
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
    inputSchema: normalizeInputSchema(subAgent?.inputSchemaJson),
    outputSchema: normalizeOutputSchema(subAgent?.outputSchemaJson),
    toolPolicy: normalizeToolPolicy(subAgent?.toolPolicyJson),
    generationConfig: normalizeGenerationConfig(subAgent?.defaultGenerationConfigJson),
    status: ((subAgent?.status ?? 'active').toLowerCase() as EditableSubAgentState['status']),
  };
}

function buildEditableStateFromRelease(release: PlannerSubAgentReleaseItem, status: EditableSubAgentState['status']): EditableSubAgentState {
  return {
    displayName: release.displayName,
    description: release.description ?? '',
    systemPromptOverride: release.systemPromptOverride ?? '',
    developerPromptOverride: release.developerPromptOverride ?? '',
    stepDefinitions: normalizeStepDefinitions(release.stepDefinitionsJson),
    inputSchema: normalizeInputSchema(release.inputSchemaJson),
    outputSchema: normalizeOutputSchema(release.outputSchemaJson),
    toolPolicy: normalizeToolPolicy(release.toolPolicyJson),
    generationConfig: normalizeGenerationConfig(release.defaultGenerationConfigJson),
    status,
  };
}

function summarizeEditableState(state: EditableSubAgentState) {
  return {
    displayName: state.displayName.trim() || '-',
    descriptionLength: state.description.trim().length,
    systemPromptLength: state.systemPromptOverride.trim().length,
    developerPromptLength: state.developerPromptOverride.trim().length,
    stepCount: serializeStepDefinitions(state.stepDefinitions).length,
    inputRequiredCount: state.inputSchema.required.filter(Boolean).length,
    outputRequiredCount:
      state.outputSchema.outlineRequired.filter(Boolean).length + state.outputSchema.refinementRequired.filter(Boolean).length,
    toolPolicyMode: state.toolPolicy.mode.trim() || '-',
    enabledPolicyFlags: [
      state.toolPolicy.allowSubjectAssetPlanning,
      state.toolPolicy.allowSceneAssetPlanning,
      state.toolPolicy.allowDocumentRewrite,
      state.toolPolicy.allowStoryboardGeneration,
      state.toolPolicy.requireStructuredDoc,
      state.toolPolicy.allowPlannerAssetContext,
      state.toolPolicy.preferGeneratedAssetAsPrimary,
      state.toolPolicy.allowReferenceAssetBinding,
      state.toolPolicy.allowImageDraftGeneration,
      state.toolPolicy.preserveUnrelatedEntitiesDuringPartialRerun,
      state.toolPolicy.requireStructuredJsonOutput,
      state.toolPolicy.requireStepAnalysisOnRefinement,
    ].filter(Boolean).length,
    generationProfile: `${state.generationConfig.outlineTemperature || '-'} / ${state.generationConfig.refinementTemperature || '-'}`,
  };
}

function buildReleaseDiffItems(current: EditableSubAgentState, release: PlannerSubAgentReleaseItem) {
  const releaseState = buildEditableStateFromRelease(release, current.status);
  const sections = [
    {
      label: '基础信息',
      changed: current.displayName !== releaseState.displayName || current.description !== releaseState.description,
      detail: `名称 ${current.displayName === releaseState.displayName ? '一致' : '不同'}，说明长度 ${current.description.length} / ${releaseState.description.length}`,
    },
    {
      label: '系统提示词',
      changed: current.systemPromptOverride !== releaseState.systemPromptOverride,
      detail: `长度 ${current.systemPromptOverride.length} / ${releaseState.systemPromptOverride.length}`,
    },
    {
      label: '开发提示词',
      changed: current.developerPromptOverride !== releaseState.developerPromptOverride,
      detail: `长度 ${current.developerPromptOverride.length} / ${releaseState.developerPromptOverride.length}`,
    },
    {
      label: '步骤定义',
      changed: JSON.stringify(serializeStepDefinitions(current.stepDefinitions)) !== JSON.stringify(serializeStepDefinitions(releaseState.stepDefinitions)),
      detail: `步骤数 ${serializeStepDefinitions(current.stepDefinitions).length} / ${serializeStepDefinitions(releaseState.stepDefinitions).length}`,
    },
    {
      label: '输入约束',
      changed: JSON.stringify(serializeInputSchema(current.inputSchema)) !== JSON.stringify(serializeInputSchema(releaseState.inputSchema)),
      detail: `必填字段 ${current.inputSchema.required.filter(Boolean).length} / ${releaseState.inputSchema.required.filter(Boolean).length}`,
    },
    {
      label: '输出约束',
      changed: JSON.stringify(serializeOutputSchema(current.outputSchema)) !== JSON.stringify(serializeOutputSchema(releaseState.outputSchema)),
      detail: `字段数 ${current.outputSchema.structuredDocRequired.filter(Boolean).length} / ${releaseState.outputSchema.structuredDocRequired.filter(Boolean).length}`,
    },
    {
      label: '工具策略',
      changed: JSON.stringify(serializeToolPolicy(current.toolPolicy)) !== JSON.stringify(serializeToolPolicy(releaseState.toolPolicy)),
      detail: `启用开关 ${summarizeEditableState(current).enabledPolicyFlags} / ${summarizeEditableState(releaseState).enabledPolicyFlags}`,
    },
    {
      label: '生成参数',
      changed: JSON.stringify(serializeGenerationConfig(current.generationConfig)) !== JSON.stringify(serializeGenerationConfig(releaseState.generationConfig)),
      detail: `温度 outline/refinement ${current.generationConfig.outlineTemperature || '-'} / ${releaseState.generationConfig.outlineTemperature || '-'} · ${current.generationConfig.refinementTemperature || '-'} / ${releaseState.generationConfig.refinementTemperature || '-'}`,
    },
  ];

  return {
    releaseState,
    sections,
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

function statusLabel(status: string) {
  switch (status) {
    case 'active':
      return '已生效';
    case 'draft':
      return '草稿';
    case 'deprecated':
      return '已弃用';
    case 'archived':
      return '已归档';
    default:
      return status;
  }
}

interface PlannerAgentDebugPageProps {
  initialSubAgentSlug?: string;
  mode?: 'manage' | 'debug';
  initialReplayRunId?: string;
  initialAutoRun?: boolean;
  initialProjectId?: string;
  initialEpisodeId?: string;
  initialProjectTitle?: string;
  initialEpisodeTitle?: string;
  chrome?: 'default' | 'admin';
}

export function PlannerAgentDebugPage({
  initialSubAgentSlug,
  mode = 'debug',
  initialReplayRunId,
  initialAutoRun = false,
  initialProjectId,
  initialEpisodeId,
  initialProjectTitle,
  initialEpisodeTitle,
  chrome = 'default',
}: PlannerAgentDebugPageProps) {
  const router = useRouter();
  const debugBasePath = chrome === 'admin' ? '/admin/planner-debug' : '/internal/planner-debug';
  const [profiles, setProfiles] = useState<PlannerAgentProfileDebugItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubAgentId, setSelectedSubAgentId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [contentTypeFilter, setContentTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editorState, setEditorState] = useState<EditableSubAgentState>(buildEditableState(null));
  const [debugForm, setDebugForm] = useState<DebugFormState>(
    buildInitialDebugForm(initialSubAgentSlug, {
      projectId: initialProjectId,
      episodeId: initialEpisodeId,
      projectTitle: initialProjectTitle,
      episodeTitle: initialEpisodeTitle,
    }),
  );
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [applying, setApplying] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [recentRuns, setRecentRuns] = useState<PlannerDebugRunListItem[]>([]);
  const [selectedRun, setSelectedRun] = useState<PlannerDebugRunDetail | null>(null);
  const [loadingRun, setLoadingRun] = useState(false);
  const [compareSubAgentId, setCompareSubAgentId] = useState<string>('');
  const [compareRunning, setCompareRunning] = useState(false);
  const [compareResult, setCompareResult] = useState<PlannerDebugCompareResponse | null>(null);
  const [releases, setReleases] = useState<PlannerSubAgentReleaseItem[]>([]);
  const [selectedReleaseId, setSelectedReleaseId] = useState<string>('');
  const [message, setMessage] = useState<{ kind: 'ok' | 'warn' | 'error'; text: string } | null>(null);
  const [debugResult, setDebugResult] = useState<PlannerDebugRunResponse | null>(null);
  const [autoRunPending, setAutoRunPending] = useState(initialAutoRun);
  const debugRouteSearch = buildPlannerDebugSearch({
    projectId: debugForm.projectId,
    episodeId: debugForm.episodeId,
    projectTitle: debugForm.projectTitle,
    episodeTitle: debugForm.episodeTitle,
  });

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


  const selectedRelease = useMemo(
    () => releases.find((release) => release.id === selectedReleaseId) ?? releases[0] ?? null,
    [releases, selectedReleaseId],
  );

  const releaseCompare = useMemo(
    () => (selectedRelease ? buildReleaseDiffItems(editorState, selectedRelease) : null),
    [editorState, selectedRelease],
  );

  const currentConfigSummary = useMemo(() => summarizeEditableState(editorState), [editorState]);
  const selectedReleaseSummary = useMemo(
    () => (releaseCompare ? summarizeEditableState(releaseCompare.releaseState) : null),
    [releaseCompare],
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
      ...buildInitialDebugForm(selectedSubAgentEntry?.subAgent.slug ?? initialSubAgentSlug, {
        projectId: current.projectId || initialProjectId,
        episodeId: current.episodeId || initialEpisodeId,
        projectTitle: current.projectTitle || initialProjectTitle,
        episodeTitle: current.episodeTitle || initialEpisodeTitle,
      }),
      configSource: current.configSource,
      projectId: current.projectId,
      episodeId: current.episodeId,
      modelFamily: current.modelFamily || 'doubao-text',
      modelEndpoint: current.modelEndpoint,
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
  }, [initialEpisodeId, initialEpisodeTitle, initialProjectId, initialProjectTitle, initialReplayRunId, selectedSubAgentEntry]);

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
          setSelectedReleaseId((current) => (current && nextReleases.some((release) => release.id === current) ? current : (nextReleases[0]?.id ?? '')));
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
          configSource: input.configSource === 'published' ? 'published' : 'draft',
          targetStage: input.targetStage === 'outline' ? 'outline' : 'refinement',
          partialRerunScope:
            input.partialRerunScope === 'subject_only' ||
            input.partialRerunScope === 'scene_only' ||
            input.partialRerunScope === 'shots_only'
              ? input.partialRerunScope
              : 'none',
          projectId: typeof input.projectId === 'string' ? input.projectId : '',
          episodeId: typeof input.episodeId === 'string' ? input.episodeId : '',
          projectTitle: typeof input.projectTitle === 'string' ? input.projectTitle : current.projectTitle,
          episodeTitle: typeof input.episodeTitle === 'string' ? input.episodeTitle : current.episodeTitle,
          userPrompt: typeof input.userPrompt === 'string' ? input.userPrompt : current.userPrompt,
          scriptContent: typeof input.scriptContent === 'string' ? input.scriptContent : '',
          selectedSubjectName: typeof input.selectedSubjectName === 'string' ? input.selectedSubjectName : '',
          selectedStyleName: typeof input.selectedStyleName === 'string' ? input.selectedStyleName : '',
          selectedImageModelLabel: typeof input.selectedImageModelLabel === 'string' ? input.selectedImageModelLabel : '',
          priorMessagesJson: stringifyJsonInput(input.priorMessages),
          currentOutlineDocJson: stringifyJsonInput(input.currentOutlineDoc),
          currentStructuredDocJson: stringifyJsonInput(input.currentStructuredDoc),
          targetEntityJson: stringifyJsonInput(input.targetEntity),
          plannerAssetsJson: stringifyJsonInput(input.plannerAssets),
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

  const handleSave = async (options?: { openDebugAfterSave?: boolean; autoRunAfterOpen?: boolean }) => {
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
          inputSchemaJson: serializeInputSchema(editorState.inputSchema),
          outputSchemaJson: serializeOutputSchema(editorState.outputSchema),
          toolPolicyJson: serializeToolPolicy(editorState.toolPolicy),
          defaultGenerationConfigJson: serializeGenerationConfig(editorState.generationConfig),
          status: editorState.status.toUpperCase(),
        }),
      });

      const nextProfiles = await requestJson<PlannerAgentProfileDebugItem[]>('/api/planner/agent-profiles');
      setProfiles(nextProfiles);
      setMessage({ kind: 'ok', text: options?.autoRunAfterOpen ? '子 agent 配置已保存，并准备进入调试运行。' : '子 agent 配置已保存到数据库。' });
      if (options?.openDebugAfterSave) {
        const search = buildPlannerDebugSearch({
          projectId: debugForm.projectId,
          episodeId: debugForm.episodeId,
          projectTitle: debugForm.projectTitle,
          episodeTitle: debugForm.episodeTitle,
          autoRun: options.autoRunAfterOpen,
        });
        router.push(`${debugBasePath}/${encodeURIComponent(selectedSubAgentEntry.subAgent.slug)}${search}`);
      }
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
      setMessage({ kind: 'ok', text: '子 Agent 已发布为已生效版本。' });
    } catch (error) {
      setMessage({ kind: 'error', text: getErrorMessage(error, '发布子 agent 失败。') });
    } finally {
      setPublishing(false);
    }
  };


  const handleApplyRelease = () => {
    if (!selectedRelease) {
      return;
    }

    setEditorState(buildEditableStateFromRelease(selectedRelease, editorState.status));
    setMessage({ kind: 'ok', text: `已将发布快照 v${selectedRelease.releaseVersion} 回填到当前编辑器，可继续调整后保存。` });
  };

  const handleRun = async () => {
    if (!selectedSubAgentEntry || !debugForm.userPrompt.trim()) {
      setMessage({ kind: 'warn', text: '先选择子 agent 并填写调试提示词。' });
      return;
    }

    const context = parseDebugContext(debugForm);
    if (!context.ok) {
      setMessage({ kind: 'error', text: context.error });
      return;
    }

    setRunning(true);
    setDebugResult(null);
    try {
      const result = await requestJson<PlannerDebugRunResponse>('/api/planner/debug/run', {
        method: 'POST',
        body: JSON.stringify({
          subAgentId: selectedSubAgentEntry.subAgent.id,
          contentType: selectedSubAgentEntry.profile.contentType,
          subtype: selectedSubAgentEntry.subAgent.subtype,
          configSource: debugForm.configSource,
          targetStage: debugForm.targetStage,
          partialRerunScope: debugForm.targetStage === 'refinement' ? debugForm.partialRerunScope : 'none',
          projectId: debugForm.projectId || undefined,
          episodeId: debugForm.episodeId || undefined,
          projectTitle: debugForm.projectTitle,
          episodeTitle: debugForm.episodeTitle,
          userPrompt: debugForm.userPrompt,
          scriptContent: debugForm.scriptContent || undefined,
          selectedSubjectName: debugForm.selectedSubjectName || undefined,
          selectedStyleName: debugForm.selectedStyleName || undefined,
          selectedImageModelLabel: debugForm.selectedImageModelLabel || undefined,
          priorMessages: context.value.priorMessages,
          currentOutlineDoc: context.value.currentOutlineDoc,
          currentStructuredDoc: context.value.currentStructuredDoc,
          targetEntity: context.value.targetEntity,
          plannerAssets: context.value.plannerAssets,
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

  const handleApplyCurrentDebugRun = async () => {
    if (!debugResult) {
      return;
    }

    setApplying(true);
    try {
      const applied = await requestJson<PlannerDebugApplyResult>(
        `/api/planner/debug/runs/${encodeURIComponent(debugResult.debugRunId)}/apply`,
        {
          method: 'POST',
        },
      );
      setMessage({ kind: 'ok', text: '调试结果已应用到主流程，正在跳转到策划页。' });
      router.push(`/projects/${encodeURIComponent(applied.projectId)}/planner`);
    } catch (error) {
      setMessage({ kind: 'error', text: getErrorMessage(error, '应用调试结果失败。') });
    } finally {
      setApplying(false);
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

    const context = parseDebugContext(debugForm);
    if (!context.ok) {
      setMessage({ kind: 'error', text: context.error });
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
          configSource: debugForm.configSource,
          targetStage: debugForm.targetStage,
          partialRerunScope: debugForm.targetStage === 'refinement' ? debugForm.partialRerunScope : 'none',
          projectTitle: debugForm.projectTitle,
          episodeTitle: debugForm.episodeTitle,
          userPrompt: debugForm.userPrompt,
          scriptContent: debugForm.scriptContent || undefined,
          selectedSubjectName: debugForm.selectedSubjectName || undefined,
          selectedStyleName: debugForm.selectedStyleName || undefined,
          selectedImageModelLabel: debugForm.selectedImageModelLabel || undefined,
          priorMessages: context.value.priorMessages,
          currentOutlineDoc: context.value.currentOutlineDoc,
          currentStructuredDoc: context.value.currentStructuredDoc,
          targetEntity: context.value.targetEntity,
          plannerAssets: context.value.plannerAssets,
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


  useEffect(() => {
    if (!autoRunPending || mode !== 'debug' || loading || running || debugResult || !selectedSubAgentEntry) {
      return;
    }

    if (!debugForm.userPrompt.trim()) {
      return;
    }

    setAutoRunPending(false);
    void handleRun();
  }, [autoRunPending, debugForm.userPrompt, debugResult, loading, mode, running, selectedSubAgentEntry]);

  const content = (
    <div className={chrome === 'admin' ? styles.adminShell : styles.shell}>
      <PlannerPageHero mode={mode} />

      {message ? (
        <div className={`${styles.message} ${message.kind === 'ok' ? styles.messageOk : message.kind === 'warn' ? styles.messageWarn : styles.messageError}`}>
          {message.text}
        </div>
      ) : null}

      <PlannerPageToolbar
        mode={mode}
        debugBasePath={debugBasePath}
        debugRouteSearch={debugRouteSearch}
        selectedEntry={
          selectedSubAgentEntry
            ? {
                contentType: selectedSubAgentEntry.profile.contentType,
                subtype: selectedSubAgentEntry.subAgent.subtype,
                status: statusLabel(selectedSubAgentEntry.subAgent.status),
                slug: selectedSubAgentEntry.subAgent.slug,
              }
            : null
        }
        releaseLabel={mode === 'manage' ? (releases.length ? `发布 v${releases[0]?.releaseVersion}` : '暂无快照') : null}
        publishing={publishing}
        onPublish={handlePublish}
      />

      <section className={`${styles.grid} ${mode === 'manage' ? styles.manageGrid : mode === 'debug' ? styles.debugGrid : ''}`}>
        {mode === 'manage' ? (
          <PlannerManageSidebar
            chrome={chrome}
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
            selectedRelease={selectedRelease}
            releases={releases}
            selectedReleaseId={selectedReleaseId}
            onSelectedReleaseIdChange={setSelectedReleaseId}
            currentConfigSummary={currentConfigSummary}
            selectedReleaseSummary={selectedReleaseSummary}
            releaseCompare={releaseCompare}
            editorStatusLabel={statusLabel(editorState.status)}
            onApplyRelease={handleApplyRelease}
          />
        ) : (
          <PlannerSubAgentBrowser
            mode={mode}
            chrome={chrome}
            debugRouteSearch={debugRouteSearch}
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
        )}
        {mode === 'manage' ? (
          <PlannerManageEditorPane
            selectedSubAgentEntry={Boolean(selectedSubAgentEntry)}
            saving={saving}
            editorState={editorState}
            onSaveDraft={() => void handleSave()}
            onSaveAndRun={() => void handleSave({ openDebugAfterSave: true, autoRunAfterOpen: true })}
            onEditorStateChange={setEditorState}
            serializeStepDefinitions={serializeStepDefinitions}
            serializeInputSchema={serializeInputSchema}
            serializeOutputSchema={serializeOutputSchema}
            serializeToolPolicy={serializeToolPolicy}
            serializeGenerationConfig={serializeGenerationConfig}
          />
        ) : (
          <div className={styles.sidebarStack}>
            <PlannerDebugRunPane
              chrome={chrome}
              debugBasePath={debugBasePath}
              debugRouteSearch={debugRouteSearch}
              selectedSubAgentEntry={selectedSubAgentEntry}
              running={running}
              debugForm={debugForm}
              debugResult={debugResult}
              onApply={handleApplyCurrentDebugRun}
              applying={applying}
              onRun={handleRun}
              onDebugFormChange={setDebugForm}
            />
            <PlannerDebugHistoryPane
              chrome={chrome}
              debugBasePath={debugBasePath}
              debugRouteSearch={debugRouteSearch}
              subAgents={subAgents}
              selectedSubAgentEntry={selectedSubAgentEntry}
              compareSubAgentId={compareSubAgentId}
              compareRunning={compareRunning}
              compareResult={compareResult}
              recentRuns={recentRuns}
              loadingRun={loadingRun}
              selectedRun={selectedRun}
              onCompareSubAgentIdChange={setCompareSubAgentId}
              onCompare={handleCompare}
              onSelectRun={handleSelectRun}
            />
          </div>
        )}
      </section>
    </div>
  );

  if (chrome === 'admin') {
    return (
      <AdminShell pageTitle={mode === 'manage' ? 'Agent 管理' : 'Agent 调试'} active="planner">
        {content}
      </AdminShell>
    );
  }

  return <div className={styles.page}>{content}</div>;
}
