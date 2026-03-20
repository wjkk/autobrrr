'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import type {
  PlannerAgentProfileDebugItem,
  PlannerDebugCompareResponse,
  PlannerDebugRunDetail,
  PlannerDebugRunListItem,
  PlannerDebugRunResponse,
  PlannerSubAgentCatalogEntry,
  PlannerSubAgentReleaseItem,
} from './planner-agent-debug-types';
import { buildInitialDebugForm, buildPlannerDebugSearch, type DebugFormState } from './planner-debug-runtime';
import {
  buildEditableState,
  buildReleaseDiffItems,
  summarizeEditableState,
  type EditableSubAgentState,
} from './planner-agent-debug-page-helpers';
import { createPlannerAgentDebugPageActions } from './planner-agent-debug-page-actions';
import type { PlannerAgentDebugPageOptions } from './planner-agent-debug-page-types';
import { usePlannerAgentDebugPageBootstrap } from './use-planner-agent-debug-page-bootstrap';

export function usePlannerAgentDebugPageState({
  initialSubAgentSlug,
  mode = 'debug',
  initialReplayRunId,
  initialAutoRun = false,
  initialProjectId,
  initialEpisodeId,
  initialProjectTitle,
  initialEpisodeTitle,
  chrome = 'default',
}: PlannerAgentDebugPageOptions) {
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
  const [selectedReleaseId, setSelectedReleaseId] = useState('');
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

  usePlannerAgentDebugPageBootstrap({
    initialSubAgentSlug,
    mode,
    initialReplayRunId,
    initialProjectId,
    initialEpisodeId,
    initialProjectTitle,
    initialEpisodeTitle,
    selectedSubAgentId,
    filteredSubAgents,
    selectedSubAgentEntry,
    subAgents,
    setProfiles,
    setLoading,
    setSelectedSubAgentId,
    setEditorState,
    setDebugForm,
    setDebugResult,
    setSelectedRun,
    setCompareResult,
    setCompareSubAgentId,
    setReleases,
    setSelectedReleaseId,
    setRecentRuns,
    setMessage,
  });

  const {
    handleSave,
    handlePublish,
    handleApplyRelease,
    handleRun,
    handleApplyCurrentDebugRun,
    handleSelectRun,
    handleCompare,
  } = createPlannerAgentDebugPageActions({
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
  });

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

  return {
    chrome,
    mode,
    debugBasePath,
    debugRouteSearch,
    loading,
    publishing,
    selectedSubAgentEntry,
    releases,
    filteredSubAgents,
    selectedSubAgentId: selectedSubAgentEntry?.subAgent.id ?? null,
    searchTerm,
    contentTypeFilter,
    statusFilter,
    availableContentTypes,
    selectedRelease,
    selectedReleaseId,
    currentConfigSummary,
    selectedReleaseSummary,
    releaseCompare,
    editorState,
    saving,
    running,
    applying,
    compareSubAgentId,
    compareRunning,
    compareResult,
    recentRuns,
    loadingRun,
    selectedRun,
    debugForm,
    debugResult,
    message,
    onPublish: handlePublish,
    onSelectSubAgentId: setSelectedSubAgentId,
    onSearchTermChange: setSearchTerm,
    onContentTypeFilterChange: setContentTypeFilter,
    onStatusFilterChange: setStatusFilter,
    onSelectedReleaseIdChange: setSelectedReleaseId,
    onApplyRelease: handleApplyRelease,
    onSaveDraft: () => void handleSave(),
    onSaveAndRun: () => void handleSave({ openDebugAfterSave: true, autoRunAfterOpen: true }),
    onEditorStateChange: setEditorState,
    onApplyCurrentDebugRun: handleApplyCurrentDebugRun,
    onRun: handleRun,
    onDebugFormChange: setDebugForm,
    onCompareSubAgentIdChange: setCompareSubAgentId,
    onCompare: handleCompare,
    onSelectRun: handleSelectRun,
  };
}
