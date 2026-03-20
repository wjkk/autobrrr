'use client';

import { useEffect, type Dispatch, type SetStateAction } from 'react';

import type {
  PlannerAgentProfileDebugItem,
  PlannerDebugCompareResponse,
  PlannerDebugRunDetail,
  PlannerDebugRunListItem,
  PlannerDebugRunResponse,
  PlannerSubAgentCatalogEntry,
  PlannerSubAgentReleaseItem,
} from './planner-agent-debug-types';
import { buildInitialDebugForm, stringifyJsonInput, type DebugFormState } from './planner-debug-runtime';
import { buildEditableState, getErrorMessage, requestJson, type EditableSubAgentState } from './planner-agent-debug-page-helpers';

interface UsePlannerAgentDebugPageBootstrapOptions {
  initialSubAgentSlug?: string;
  mode: 'debug' | 'manage';
  initialReplayRunId?: string;
  initialProjectId?: string | null;
  initialEpisodeId?: string | null;
  initialProjectTitle?: string | null;
  initialEpisodeTitle?: string | null;
  selectedSubAgentId: string | null;
  filteredSubAgents: PlannerSubAgentCatalogEntry[];
  selectedSubAgentEntry: PlannerSubAgentCatalogEntry | null;
  subAgents: PlannerSubAgentCatalogEntry[];
  setProfiles: Dispatch<SetStateAction<PlannerAgentProfileDebugItem[]>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setSelectedSubAgentId: Dispatch<SetStateAction<string | null>>;
  setEditorState: Dispatch<SetStateAction<EditableSubAgentState>>;
  setDebugForm: Dispatch<SetStateAction<DebugFormState>>;
  setDebugResult: Dispatch<SetStateAction<PlannerDebugRunResponse | null>>;
  setSelectedRun: Dispatch<SetStateAction<PlannerDebugRunDetail | null>>;
  setCompareResult: Dispatch<SetStateAction<PlannerDebugCompareResponse | null>>;
  setCompareSubAgentId: Dispatch<SetStateAction<string>>;
  setReleases: Dispatch<SetStateAction<PlannerSubAgentReleaseItem[]>>;
  setSelectedReleaseId: Dispatch<SetStateAction<string>>;
  setRecentRuns: Dispatch<SetStateAction<PlannerDebugRunListItem[]>>;
  setMessage: Dispatch<SetStateAction<{ kind: 'ok' | 'warn' | 'error'; text: string } | null>>;
}

export function usePlannerAgentDebugPageBootstrap({
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
}: UsePlannerAgentDebugPageBootstrapOptions) {
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
  }, [initialSubAgentSlug, selectedSubAgentId, setLoading, setMessage, setProfiles, setSelectedSubAgentId]);

  useEffect(() => {
    if (!filteredSubAgents.length || !selectedSubAgentId) {
      return;
    }

    if (!filteredSubAgents.some((item) => item.subAgent.id === selectedSubAgentId)) {
      setSelectedSubAgentId(filteredSubAgents[0]?.subAgent.id ?? null);
    }
  }, [filteredSubAgents, selectedSubAgentId, setSelectedSubAgentId]);

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
      return subAgents.find((item) => item.subAgent.id !== selectedSubAgentEntry?.subAgent.id)?.subAgent.id ?? '';
    });
  }, [
    initialEpisodeId,
    initialEpisodeTitle,
    initialProjectId,
    initialProjectTitle,
    initialReplayRunId,
    initialSubAgentSlug,
    selectedSubAgentEntry,
    setCompareResult,
    setCompareSubAgentId,
    setDebugForm,
    setDebugResult,
    setEditorState,
    setSelectedRun,
    subAgents,
  ]);

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
  }, [selectedSubAgentEntry, setMessage, setReleases, setSelectedReleaseId]);

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
  }, [mode, selectedSubAgentEntry, setMessage, setRecentRuns]);

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
            input.partialRerunScope === 'subject' || input.partialRerunScope === 'subject_only'
              ? 'subject'
              : input.partialRerunScope === 'scene' || input.partialRerunScope === 'scene_only'
                ? 'scene'
                : input.partialRerunScope === 'shot' || input.partialRerunScope === 'shots_only'
                  ? 'shot'
                  : input.partialRerunScope === 'act'
                    ? 'act'
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
  }, [initialReplayRunId, mode, setDebugForm, setMessage, setSelectedRun]);
}
