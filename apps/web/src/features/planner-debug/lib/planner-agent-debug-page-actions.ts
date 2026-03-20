import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type { Dispatch, SetStateAction } from 'react';

import type {
  PlannerAgentProfileDebugItem,
  PlannerDebugApplyResult,
  PlannerDebugCompareResponse,
  PlannerDebugRunDetail,
  PlannerDebugRunListItem,
  PlannerDebugRunResponse,
  PlannerSubAgentCatalogEntry,
  PlannerSubAgentReleaseItem,
} from './planner-agent-debug-types';
import { buildPlannerDebugSearch, parseDebugContext, type DebugFormState } from './planner-debug-runtime';
import {
  buildEditableStateFromRelease,
  getErrorMessage,
  requestJson,
  serializeStepDefinitions,
  type EditableSubAgentState,
} from './planner-agent-debug-page-helpers';
import {
  serializeGenerationConfig,
  serializeInputSchema,
  serializeOutputSchema,
  serializeToolPolicy,
} from './planner-agent-config-editor';

interface CreatePlannerAgentDebugPageActionsOptions {
  router: AppRouterInstance;
  debugBasePath: string;
  selectedSubAgentEntry: PlannerSubAgentCatalogEntry | null;
  selectedRelease: PlannerSubAgentReleaseItem | null;
  editorState: EditableSubAgentState;
  debugForm: DebugFormState;
  debugResult: PlannerDebugRunResponse | null;
  compareSubAgentId: string;
  setProfiles: Dispatch<SetStateAction<PlannerAgentProfileDebugItem[]>>;
  setReleases: Dispatch<SetStateAction<PlannerSubAgentReleaseItem[]>>;
  setEditorState: Dispatch<SetStateAction<EditableSubAgentState>>;
  setDebugResult: Dispatch<SetStateAction<PlannerDebugRunResponse | null>>;
  setRecentRuns: Dispatch<SetStateAction<PlannerDebugRunListItem[]>>;
  setSelectedRun: Dispatch<SetStateAction<PlannerDebugRunDetail | null>>;
  setCompareResult: Dispatch<SetStateAction<PlannerDebugCompareResponse | null>>;
  setSaving: Dispatch<SetStateAction<boolean>>;
  setPublishing: Dispatch<SetStateAction<boolean>>;
  setRunning: Dispatch<SetStateAction<boolean>>;
  setApplying: Dispatch<SetStateAction<boolean>>;
  setLoadingRun: Dispatch<SetStateAction<boolean>>;
  setCompareRunning: Dispatch<SetStateAction<boolean>>;
  setMessage: Dispatch<SetStateAction<{ kind: 'ok' | 'warn' | 'error'; text: string } | null>>;
}

export function createPlannerAgentDebugPageActions({
  router,
  debugBasePath,
  selectedSubAgentEntry,
  selectedRelease,
  editorState,
  debugForm,
  debugResult,
  compareSubAgentId,
  setProfiles,
  setReleases,
  setEditorState,
  setDebugResult,
  setRecentRuns,
  setSelectedRun,
  setCompareResult,
  setSaving,
  setPublishing,
  setRunning,
  setApplying,
  setLoadingRun,
  setCompareRunning,
  setMessage,
}: CreatePlannerAgentDebugPageActionsOptions) {
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

  return {
    handleSave,
    handlePublish,
    handleApplyRelease,
    handleRun,
    handleApplyCurrentDebugRun,
    handleSelectRun,
    handleCompare,
  };
}
