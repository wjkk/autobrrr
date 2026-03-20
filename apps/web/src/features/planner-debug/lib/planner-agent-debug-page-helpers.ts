import {
  normalizeGenerationConfig,
  normalizeInputSchema,
  normalizeOutputSchema,
  normalizeToolPolicy,
  serializeGenerationConfig,
  serializeInputSchema,
  serializeOutputSchema,
  serializeToolPolicy,
  type PlannerGenerationConfigEditorState,
  type PlannerInputSchemaEditorState,
  type PlannerOutputSchemaEditorState,
  type PlannerToolPolicyEditorState,
} from './planner-agent-config-editor';
import type {
  PlannerSubAgentProfileDebugItem,
  PlannerSubAgentReleaseItem,
  PlannerStepDefinitionEditorItem,
} from './planner-agent-debug-types';

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

export type Envelope<T> = EnvelopeSuccess<T> | EnvelopeFailure;

export interface EditableSubAgentState {
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

export function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export async function requestJson<T>(path: string, init?: RequestInit) {
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

export function buildEditableState(subAgent: PlannerSubAgentProfileDebugItem | null): EditableSubAgentState {
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

export function buildEditableStateFromRelease(release: PlannerSubAgentReleaseItem, status: EditableSubAgentState['status']): EditableSubAgentState {
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

export function summarizeEditableState(state: EditableSubAgentState) {
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

export function buildReleaseDiffItems(current: EditableSubAgentState, release: PlannerSubAgentReleaseItem) {
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

export function normalizeStepDefinitions(value: unknown): PlannerStepDefinitionEditorItem[] {
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

export function serializeStepDefinitions(value: PlannerStepDefinitionEditorItem[]) {
  return value
    .map((step, index) => ({
      id: step.id.trim() || `step-${index + 1}`,
      title: step.title.trim(),
      status: step.status,
      details: step.details.map((detail) => detail.trim()).filter(Boolean),
    }))
    .filter((step) => step.title.length > 0);
}

export function statusClass(status: string) {
  switch (status) {
    case 'running':
      return 'running';
    case 'failed':
      return 'failed';
    case 'pending':
      return 'pending';
    default:
      return 'done';
  }
}

export function statusLabel(status: string) {
  switch (status) {
    case 'running':
      return '进行中';
    case 'failed':
      return '失败';
    case 'pending':
      return '待处理';
    default:
      return '完成';
  }
}
