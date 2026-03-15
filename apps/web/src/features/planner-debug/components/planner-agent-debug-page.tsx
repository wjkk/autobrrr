'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { AdminShell } from '@/features/admin/components/admin-shell';

import styles from './planner-agent-debug-page.module.css';
import {
  PlannerGenerationConfigEditor,
  PlannerInputSchemaEditor,
  PlannerOutputSchemaEditor,
  PlannerToolPolicyEditor,
} from './planner-agent-config-editors';
import { PlannerDebugCompareView } from './planner-debug-compare-view';
import { PlannerDebugResultView } from './planner-debug-result-view';
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
import { buildInitialDebugForm, parseDebugContext, stringifyJsonInput } from '../lib/planner-debug-runtime';
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
  chrome?: 'default' | 'admin';
}

export function PlannerAgentDebugPage({ initialSubAgentSlug, mode = 'debug', initialReplayRunId, initialAutoRun = false, chrome = 'default' }: PlannerAgentDebugPageProps) {
  const router = useRouter();
  const debugBasePath = chrome === 'admin' ? '/admin/planner-debug' : '/internal/planner-debug';
  const [profiles, setProfiles] = useState<PlannerAgentProfileDebugItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubAgentId, setSelectedSubAgentId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [contentTypeFilter, setContentTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editorState, setEditorState] = useState<EditableSubAgentState>(buildEditableState(null));
  const [debugForm, setDebugForm] = useState<DebugFormState>(buildInitialDebugForm(initialSubAgentSlug));
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
  const [selectedReleaseId, setSelectedReleaseId] = useState<string>('');
  const [message, setMessage] = useState<{ kind: 'ok' | 'warn' | 'error'; text: string } | null>(null);
  const [debugResult, setDebugResult] = useState<PlannerDebugRunResponse | null>(null);
  const [autoRunPending, setAutoRunPending] = useState(initialAutoRun);

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
      ...buildInitialDebugForm(selectedSubAgentEntry?.subAgent.slug ?? initialSubAgentSlug),
      configSource: current.configSource,
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
        const search = options.autoRunAfterOpen ? '?autoRun=1' : '';
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
      <section className={styles.hero}>
        <div>
          <div className={styles.eyebrow}>{mode === 'manage' ? '策划 Agent 管理台' : '策划 Agent 调试台'}</div>
          <h1 className={styles.title}>{mode === 'manage' ? '策划 Agent 管理台' : '策划 Agent 调试台'}</h1>
          <p className={styles.subtitle}>
            {mode === 'manage'
              ? '集中维护策划 Agent 的草稿配置、发布版本和调试入口。左侧选对象，右侧完成编辑，发布前后都能快速核对差异。'
              : '围绕单个子 Agent 做独立试跑、回放与 A/B 对比。这里专注验证 prompt、输出结构和主图结果，不影响主流程页面。'}
          </p>
        </div>
        <div className={styles.heroMeta}>
          <div className={styles.metaPill}>{mode === 'manage' ? '编辑草稿、对照发布、再决定是否上线' : '先跑单次结果，再看并排 A/B 差异'}</div>
          <div className={styles.metaPill}>{mode === 'manage' ? '适合配置收口与版本回填' : '适合 prompt 与输出诊断'}</div>
        </div>
      </section>

      {message ? (
        <div className={`${styles.message} ${message.kind === 'ok' ? styles.messageOk : message.kind === 'warn' ? styles.messageWarn : styles.messageError}`}>
          {message.text}
        </div>
      ) : null}

      {mode === 'manage' ? (
        <section className={styles.topActionBar}>
          <div className={styles.topActionMeta}>
            <div>
              <h2 className={styles.topActionTitle}>当前子 Agent 的发布动作</h2>
              <p className={styles.topActionHint}>先保存草稿，再决定是否直接运行调试或发布为当前生效版本。</p>
            </div>
            {selectedSubAgentEntry ? (
              <>
                <div className={styles.topActionInfoRow}>
                  <span className={styles.topInfoPill}>内容类型：{selectedSubAgentEntry.profile.contentType}</span>
                  <span className={styles.topInfoPill}>子类型：{selectedSubAgentEntry.subAgent.subtype}</span>
                  <span className={styles.topInfoPill}>状态：{statusLabel(selectedSubAgentEntry.subAgent.status)}</span>
                  <span className={styles.topInfoPill}>标识：{selectedSubAgentEntry.subAgent.slug}</span>
                  <span className={styles.topInfoPill}>
                    发布快照：{releases.length ? `v${releases[0]?.releaseVersion}` : '暂无'}
                  </span>
                </div>
                <div className={styles.topActionLinks}>
                  <Link href={`${debugBasePath}/${encodeURIComponent(selectedSubAgentEntry.subAgent.slug)}`}>打开单项调试页</Link>
                  <Link href={`${debugBasePath}/compare`}>打开 A/B 对比页</Link>
                  <Link href={`${debugBasePath}/runs`}>查看调试历史</Link>
                </div>
              </>
            ) : (
              <div className={styles.fieldHint}>当前没有可操作的子 Agent。</div>
            )}
          </div>
          <div className={styles.topActionControls}>
            <button type="button" className={styles.button} onClick={handlePublish} disabled={!selectedSubAgentEntry || publishing}>
              {publishing ? '发布中…' : '发布当前草稿'}
            </button>
          </div>
        </section>
      ) : null}

      <section className={`${styles.grid} ${mode === 'manage' ? styles.manageGrid : mode === 'debug' ? styles.debugGrid : ''}`}>
        {mode === 'manage' ? (
          <div className={styles.sidebarStack}>
            <PlannerSubAgentBrowser
              mode={mode}
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
            />

            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2 className={styles.panelTitle}>草稿 vs 发布快照</h2>
                  <p className={styles.panelHint}>直接对照当前编辑器与已发布版本，也可以把某个发布快照回填成新的草稿起点。</p>
                </div>
              </div>
              <div className={`${styles.panelBody} ${styles.compactPanelBody}`}>
                {selectedRelease ? (
                  <div className={styles.compactStack}>
                    <div className={styles.fieldGroup}>
                      <label className={styles.fieldLabel}>对比版本</label>
                      <select className={styles.select} value={selectedRelease.id} onChange={(event) => setSelectedReleaseId(event.target.value)}>
                        {releases.map((release) => (
                          <option key={release.id} value={release.id}>
                            v{release.releaseVersion} · {new Date(release.publishedAt).toLocaleString('zh-CN')}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.compareBoard}>
                      <div className={styles.compareColumn}>
                        <div className={styles.compareColumnHeader}>
                          <div>
                            <div className={styles.compareLabel}>草稿</div>
                            <h4 className={styles.compareTitle}>{currentConfigSummary.displayName}</h4>
                          </div>
                          <span className={styles.inlineMutedPill}>{statusLabel(editorState.status)}</span>
                        </div>
                        <div className={styles.summaryGrid}>
                          <div className={styles.summaryCard}><span>步骤</span><strong>{currentConfigSummary.stepCount}</strong></div>
                          <div className={styles.summaryCard}><span>系统提示词</span><strong>{currentConfigSummary.systemPromptLength} 字</strong></div>
                          <div className={styles.summaryCard}><span>输入约束</span><strong>{currentConfigSummary.inputRequiredCount} 项</strong></div>
                          <div className={styles.summaryCard}><span>策略开关</span><strong>{currentConfigSummary.enabledPolicyFlags}</strong></div>
                        </div>
                      </div>

                      <div className={styles.compareColumn}>
                        <div className={styles.compareColumnHeader}>
                          <div>
                            <div className={styles.compareLabel}>发布快照</div>
                            <h4 className={styles.compareTitle}>v{selectedRelease.releaseVersion}</h4>
                            <p className={styles.compareHint}>{new Date(selectedRelease.publishedAt).toLocaleString('zh-CN')}</p>
                          </div>
                          <button type="button" className={styles.buttonGhost} onClick={handleApplyRelease}>
                            回填到编辑器
                          </button>
                        </div>
                        {selectedReleaseSummary ? (
                          <div className={styles.summaryGrid}>
                            <div className={styles.summaryCard}><span>步骤</span><strong>{selectedReleaseSummary.stepCount}</strong></div>
                            <div className={styles.summaryCard}><span>系统提示词</span><strong>{selectedReleaseSummary.systemPromptLength} 字</strong></div>
                            <div className={styles.summaryCard}><span>输入约束</span><strong>{selectedReleaseSummary.inputRequiredCount} 项</strong></div>
                            <div className={styles.summaryCard}><span>策略开关</span><strong>{selectedReleaseSummary.enabledPolicyFlags}</strong></div>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {releaseCompare ? (
                      <div className={styles.resultBlock}>
                        <h3 className={styles.resultTitle}>差异摘要</h3>
                        <ul className={styles.diffList}>
                          {releaseCompare.sections.map((item) => (
                            <li key={item.label}>
                              {item.label}：{item.changed ? '有变化' : '一致'}，{item.detail}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className={styles.fieldHint}>当前还没有已发布快照，先发布一次后再做并排对照。</div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <PlannerSubAgentBrowser
            mode={mode}
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
          />
        )}

        {mode === 'manage' ? (
          <>
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2 className={styles.panelTitle}>配置编辑</h2>
                  <p className={styles.panelHint}>直接修改表内子 Agent 配置。调试页读取这里刚保存的配置；主流程读取已发布生效配置。</p>
                </div>
                <div className={styles.toolbar}>
                  <button type="button" className={styles.buttonGhost} onClick={() => handleSave()} disabled={!selectedSubAgentEntry || saving}>
                    {saving ? '保存中…' : '保存配置'}
                  </button>
                  <button
                    type="button"
                    className={styles.button}
                    onClick={() => handleSave({ openDebugAfterSave: true, autoRunAfterOpen: true })}
                    disabled={!selectedSubAgentEntry || saving}
                  >
                    {saving ? '保存中…' : '保存并运行调试'}
                  </button>
                </div>
              </div>
              <div className={styles.panelBody}>
                {selectedSubAgentEntry ? (
                  <div className={styles.stack}>
                    <div className={styles.twoCol}>
                      <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>显示名称</label>
                        <input className={styles.input} value={editorState.displayName} onChange={(event) => setEditorState((current) => ({ ...current, displayName: event.target.value }))} />
                      </div>
                      <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>状态</label>
                        <select className={styles.select} value={editorState.status} onChange={(event) => setEditorState((current) => ({ ...current, status: event.target.value as EditableSubAgentState['status'] }))}>
                          <option value="draft">草稿</option>
                          <option value="active">已生效</option>
                          <option value="deprecated">已弃用</option>
                          <option value="archived">已归档</option>
                        </select>
                      </div>
                    </div>
                    <div className={styles.fieldGroup}>
                      <label className={styles.fieldLabel}>说明</label>
                      <textarea className={styles.textarea} value={editorState.description} onChange={(event) => setEditorState((current) => ({ ...current, description: event.target.value }))} />
                    </div>
                    <div className={styles.fieldGroup}>
                      <label className={styles.fieldLabel}>系统提示词覆盖</label>
                      <textarea className={styles.textarea} value={editorState.systemPromptOverride} onChange={(event) => setEditorState((current) => ({ ...current, systemPromptOverride: event.target.value }))} />
                    </div>
                    <div className={styles.fieldGroup}>
                      <label className={styles.fieldLabel}>开发提示词覆盖</label>
                      <textarea className={styles.textarea} value={editorState.developerPromptOverride} onChange={(event) => setEditorState((current) => ({ ...current, developerPromptOverride: event.target.value }))} />
                    </div>
                    <div className={styles.fieldGroup}>
                      <div className={styles.fieldLabelRow}>
                        <label className={styles.fieldLabel}>步骤定义</label>
                        <span className={styles.fieldHint}>结构化编辑，保存时自动序列化为 JSON</span>
                      </div>
                      <PlannerStepDefinitionEditor value={editorState.stepDefinitions} onChange={(stepDefinitions) => setEditorState((current) => ({ ...current, stepDefinitions }))} />
                      <details className={styles.jsonPreview}>
                        <summary className={styles.jsonPreviewSummary}>查看保存后的 JSON</summary>
                        <pre className={styles.pre}>{JSON.stringify(serializeStepDefinitions(editorState.stepDefinitions), null, 2)}</pre>
                      </details>
                    </div>
                    <div className={styles.fieldGroup}>
                      <div className={styles.fieldLabelRow}>
                        <label className={styles.fieldLabel}>输入约束</label>
                        <span className={styles.fieldHint}>运行时输入约束，按字段和限制拆开编辑</span>
                      </div>
                      <PlannerInputSchemaEditor value={editorState.inputSchema} onChange={(inputSchema) => setEditorState((current) => ({ ...current, inputSchema }))} />
                      <details className={styles.jsonPreview}>
                        <summary className={styles.jsonPreviewSummary}>查看保存后的 JSON</summary>
                        <pre className={styles.pre}>{JSON.stringify(serializeInputSchema(editorState.inputSchema), null, 2)}</pre>
                      </details>
                    </div>
                    <div className={styles.fieldGroup}>
                      <div className={styles.fieldLabelRow}>
                        <label className={styles.fieldLabel}>输出约束</label>
                        <span className={styles.fieldHint}>区分 outline/refinement 阶段和 structured doc 字段</span>
                      </div>
                      <PlannerOutputSchemaEditor value={editorState.outputSchema} onChange={(outputSchema) => setEditorState((current) => ({ ...current, outputSchema }))} />
                      <details className={styles.jsonPreview}>
                        <summary className={styles.jsonPreviewSummary}>查看保存后的 JSON</summary>
                        <pre className={styles.pre}>{JSON.stringify(serializeOutputSchema(editorState.outputSchema), null, 2)}</pre>
                      </details>
                    </div>
                    <div className={styles.fieldGroup}>
                      <div className={styles.fieldLabelRow}>
                        <label className={styles.fieldLabel}>工具策略</label>
                        <span className={styles.fieldHint}>控制阶段、局部重跑、资产上下文和约束策略</span>
                      </div>
                      <PlannerToolPolicyEditor value={editorState.toolPolicy} onChange={(toolPolicy) => setEditorState((current) => ({ ...current, toolPolicy }))} />
                      <details className={styles.jsonPreview}>
                        <summary className={styles.jsonPreviewSummary}>查看保存后的 JSON</summary>
                        <pre className={styles.pre}>{JSON.stringify(serializeToolPolicy(editorState.toolPolicy), null, 2)}</pre>
                      </details>
                    </div>
                    <div className={styles.fieldGroup}>
                      <div className={styles.fieldLabelRow}>
                        <label className={styles.fieldLabel}>生成参数</label>
                        <span className={styles.fieldHint}>分阶段温度、输出长度、重试和质量闸门</span>
                      </div>
                      <PlannerGenerationConfigEditor value={editorState.generationConfig} onChange={(generationConfig) => setEditorState((current) => ({ ...current, generationConfig }))} />
                      <details className={styles.jsonPreview}>
                        <summary className={styles.jsonPreviewSummary}>查看保存后的 JSON</summary>
                        <pre className={styles.pre}>{JSON.stringify(serializeGenerationConfig(editorState.generationConfig), null, 2)}</pre>
                      </details>
                    </div>
                  </div>
                ) : (
                  <div className={styles.fieldHint}>当前没有可编辑的子 Agent。</div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className={styles.sidebarStack}>
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2 className={styles.panelTitle}>调试运行</h2>
                  <p className={styles.panelHint}>运行一次独立 debug，不回写主流程 planner workspace。</p>
                </div>
                <button type="button" className={styles.button} onClick={handleRun} disabled={running || !selectedSubAgentEntry}>
                  {running ? '运行中…' : '运行调试'}
                </button>
              </div>
              <div className={styles.panelBody}>
                <div className={styles.stack}>
                  <div className={styles.twoCol}>
                    <div className={styles.fieldGroup}>
                      <label className={styles.fieldLabel}>项目标题</label>
                      <input className={styles.input} value={debugForm.projectTitle} onChange={(event) => setDebugForm((current) => ({ ...current, projectTitle: event.target.value }))} />
                    </div>
                    <div className={styles.fieldGroup}>
                      <label className={styles.fieldLabel}>集标题</label>
                      <input className={styles.input} value={debugForm.episodeTitle} onChange={(event) => setDebugForm((current) => ({ ...current, episodeTitle: event.target.value }))} />
                    </div>
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>用户需求</label>
                    <textarea className={styles.textarea} value={debugForm.userPrompt} onChange={(event) => setDebugForm((current) => ({ ...current, userPrompt: event.target.value }))} />
                  </div>
                  <div className={styles.threeCol}>
                    <div className={styles.fieldGroup}>
                      <label className={styles.fieldLabel}>配置来源</label>
                      <select className={styles.select} value={debugForm.configSource} onChange={(event) => setDebugForm((current) => ({ ...current, configSource: event.target.value === 'published' ? 'published' : 'draft' }))}>
                        <option value="draft">未发布草稿试跑</option>
                        <option value="published">已发布配置试跑</option>
                      </select>
                    </div>
                    <div className={styles.fieldGroup}>
                      <label className={styles.fieldLabel}>目标阶段</label>
                      <select className={styles.select} value={debugForm.targetStage} onChange={(event) => setDebugForm((current) => ({ ...current, targetStage: event.target.value === 'outline' ? 'outline' : 'refinement', partialRerunScope: event.target.value === 'outline' ? 'none' : current.partialRerunScope }))}>
                        <option value="outline">大纲阶段</option>
                        <option value="refinement">细化阶段</option>
                      </select>
                    </div>
                    <div className={styles.fieldGroup}>
                      <label className={styles.fieldLabel}>局部重跑范围</label>
                      <select className={styles.select} value={debugForm.partialRerunScope} disabled={debugForm.targetStage !== 'refinement'} onChange={(event) => setDebugForm((current) => ({ ...current, partialRerunScope: event.target.value as DebugFormState['partialRerunScope'] }))}>
                        <option value="none">整体验证</option>
                        <option value="subject_only">仅主体</option>
                        <option value="scene_only">仅场景</option>
                        <option value="shots_only">仅分镜</option>
                      </select>
                    </div>
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>剧本原文</label>
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
                      <label className={styles.fieldLabel}>主体图模型</label>
                      <input className={styles.input} value={debugForm.selectedImageModelLabel} onChange={(event) => setDebugForm((current) => ({ ...current, selectedImageModelLabel: event.target.value }))} />
                    </div>
                    <div className={styles.fieldGroup}>
                      <label className={styles.fieldLabel}>文本模型族</label>
                      <input className={styles.input} value={debugForm.modelFamily} onChange={(event) => setDebugForm((current) => ({ ...current, modelFamily: event.target.value }))} />
                    </div>
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>文本模型端点 Slug</label>
                    <input className={styles.input} placeholder="可留空，走模型族默认解析" value={debugForm.modelEndpoint} onChange={(event) => setDebugForm((current) => ({ ...current, modelEndpoint: event.target.value }))} />
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>历史消息 JSON</label>
                    <textarea className={styles.textarea} placeholder='[{\"role\":\"user\",\"text\":\"上一轮需求\"}]' value={debugForm.priorMessagesJson} onChange={(event) => setDebugForm((current) => ({ ...current, priorMessagesJson: event.target.value }))} />
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>当前大纲 JSON</label>
                    <textarea className={styles.textarea} placeholder='{\"projectTitle\":\"...\",\"storyArc\":[...]}' value={debugForm.currentOutlineDocJson} onChange={(event) => setDebugForm((current) => ({ ...current, currentOutlineDocJson: event.target.value }))} />
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>当前细化文档 JSON</label>
                    <textarea className={styles.textarea} placeholder='{\"subjects\":[...],\"scenes\":[...],\"acts\":[...]}' value={debugForm.currentStructuredDocJson} onChange={(event) => setDebugForm((current) => ({ ...current, currentStructuredDocJson: event.target.value }))} />
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>目标实体 JSON</label>
                    <textarea className={styles.textarea} placeholder='{\"id\":\"...\",\"name\":\"目标主体\"}' value={debugForm.targetEntityJson} onChange={(event) => setDebugForm((current) => ({ ...current, targetEntityJson: event.target.value }))} />
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>策划素材 JSON</label>
                    <textarea className={styles.textarea} placeholder='[{\"id\":\"asset-1\",\"sourceUrl\":\"https://...\"}]' value={debugForm.plannerAssetsJson} onChange={(event) => setDebugForm((current) => ({ ...current, plannerAssetsJson: event.target.value }))} />
                  </div>
                  {debugResult ? (
                    <PlannerDebugResultView
                      debugResult={debugResult}
                      chrome={chrome}
                      replayHref={`${debugBasePath}/runs/${encodeURIComponent(debugResult.debugRunId)}`}
                      refillHref={selectedSubAgentEntry ? `${debugBasePath}/${encodeURIComponent(selectedSubAgentEntry.subAgent.slug)}?replayRunId=${encodeURIComponent(debugResult.debugRunId)}` : null}
                    />
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
                <Link href={`${debugBasePath}/runs`} className={styles.buttonGhost}>
                  全部历史
                </Link>
              </div>
              <div className={styles.panelBody}>
                <div className={styles.stack}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>A/B 对比对象</label>
                    <select className={styles.select} value={compareSubAgentId} onChange={(event) => setCompareSubAgentId(event.target.value)}>
                      {subAgents.filter((item) => item.subAgent.id !== selectedSubAgentEntry?.subAgent.id).map(({ subAgent }) => (
                        <option key={subAgent.id} value={subAgent.id}>
                          {subAgent.displayName} / {subAgent.subtype}
                        </option>
                      ))}
                    </select>
                    <button type="button" className={styles.button} onClick={handleCompare} disabled={compareRunning || !selectedSubAgentEntry || !compareSubAgentId}>
                      {compareRunning ? '对比中…' : '运行 A/B 对比'}
                    </button>
                  </div>
                  {compareResult ? <PlannerDebugCompareView compareResult={compareResult} chrome={chrome} /> : null}
                  <div className={styles.historyList}>
                    {recentRuns.map((run) => (
                      <button key={run.id} type="button" className={styles.historyRunItem} onClick={() => handleSelectRun(run.id)}>
                        <div className={styles.catalogTitle}>
                          <span>{run.compareLabel ? `${run.compareLabel} · ` : ''}{run.subAgentProfile?.displayName ?? '未知子 Agent'}</span>
                          <span className={statusClass(run.executionMode)}>{run.executionMode === 'live' ? '真实模型' : '回退生成'}</span>
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
                      <div className={styles.summaryGrid}>
                        <div className={styles.summaryCard}><span>子 Agent</span><strong>{selectedRun.subAgentProfile?.displayName ?? '未知子 Agent'}</strong></div>
                        <div className={styles.summaryCard}><span>运行方式</span><strong>{selectedRun.executionMode === 'live' ? '真实模型' : '回退生成'}</strong></div>
                        <div className={styles.summaryCard}><span>创建时间</span><strong>{new Date(selectedRun.createdAt).toLocaleString('zh-CN')}</strong></div>
                        <div className={styles.summaryCard}><span>Compare</span><strong>{selectedRun.compareLabel ?? '-'}</strong></div>
                      </div>
                      {selectedRun.diffSummary?.length ? (
                        <ul className={styles.diffList}>
                          {selectedRun.diffSummary.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      ) : null}
                      <div className={styles.linkRow}>
                        <Link href={`${debugBasePath}/runs/${encodeURIComponent(selectedRun.id)}`}>打开独立回放页</Link>
                        {selectedRun.subAgentProfile?.slug ? (
                          <Link href={`${debugBasePath}/${encodeURIComponent(selectedRun.subAgentProfile.slug)}?replayRunId=${encodeURIComponent(selectedRun.id)}`}>
                            用该回放结果回填调试表单
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
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
