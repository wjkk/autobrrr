'use client';

import { useCallback } from 'react';

import {
  activatePlannerVersion,
  createPlannerRefinementDraft,
  fetchPlannerImageAssets,
  fetchPlannerWorkspace,
  type ApiPlannerAssetOption,
  type ApiPlannerWorkspace,
  type PlannerRuntimeApiContext,
} from '../lib/planner-api';
import type { PlannerOutlineDoc } from '../lib/planner-outline-doc';
import type { PlannerStructuredDoc } from '../lib/planner-structured-doc';
import type { PlannerThreadMessage } from '../lib/planner-thread';

interface UsePlannerRuntimeWorkspaceOptions {
  runtimeApi?: PlannerRuntimeApiContext;
  runtimeWorkspace: ApiPlannerWorkspace | null;
  runtimeActiveRefinement: ApiPlannerWorkspace['activeRefinement'];
  setRuntimeWorkspace: (workspace: ApiPlannerWorkspace | null) => void;
  setPlannerImageAssets: (assets: ApiPlannerAssetOption[]) => void;
  setDisplayTitle: (title: string) => void;
  setMessages: (messages: PlannerThreadMessage[]) => void;
  setServerPlannerText: (text: string) => void;
  setStructuredPlannerDoc: (doc: PlannerStructuredDoc | null) => void;
  setOutlineConfirmed: (value: boolean) => void;
  setNotice: (message: string | null) => void;
  mapWorkspaceMessagesToThread: (messages: ApiPlannerWorkspace['messages']) => PlannerThreadMessage[];
  outlineToPreviewStructuredPlannerDoc: (outline: PlannerOutlineDoc) => PlannerStructuredDoc | null;
}

export function usePlannerRuntimeWorkspace(options: UsePlannerRuntimeWorkspaceOptions) {
  const refreshPlannerWorkspace = useCallback(async () => {
    if (!options.runtimeApi) {
      return null;
    }

    const [workspace, assets] = await Promise.all([
      fetchPlannerWorkspace({
        projectId: options.runtimeApi.projectId,
        episodeId: options.runtimeApi.episodeId,
      }),
      fetchPlannerImageAssets({
        projectId: options.runtimeApi.projectId,
        episodeId: options.runtimeApi.episodeId,
      }),
    ]);

    options.setRuntimeWorkspace(workspace);
    options.setPlannerImageAssets(assets);
    options.setDisplayTitle(workspace.project.title);
    options.setMessages(options.mapWorkspaceMessagesToThread(workspace.messages));
    options.setServerPlannerText(workspace.latestPlannerRun?.generatedText ?? '');
    const derivedStructuredDoc = workspace.activeRefinement?.structuredDoc
      ?? workspace.latestPlannerRun?.structuredDoc
      ?? (workspace.activeOutline?.outlineDoc ? options.outlineToPreviewStructuredPlannerDoc(workspace.activeOutline.outlineDoc) : null)
      ?? null;
    options.setStructuredPlannerDoc(derivedStructuredDoc);
    options.setOutlineConfirmed(Boolean(workspace.plannerSession?.outlineConfirmedAt));

    return workspace;
  }, [options]);

  const ensureEditableRuntimeRefinement = useCallback(async () => {
    if (!options.runtimeApi || !options.runtimeActiveRefinement) {
      return options.runtimeWorkspace;
    }

    if (!options.runtimeActiveRefinement.isConfirmed) {
      return options.runtimeWorkspace;
    }

    await createPlannerRefinementDraft({
      projectId: options.runtimeApi.projectId,
      episodeId: options.runtimeApi.episodeId,
      refinementVersionId: options.runtimeActiveRefinement.id,
    });

    const workspace = await refreshPlannerWorkspace();
    options.setNotice('已基于确认版本创建新草稿副本，后续修改将写入新版本。');
    return workspace;
  }, [options, refreshPlannerWorkspace]);

  const activateHistoryVersion = useCallback(async (versionId: string) => {
    if (!options.runtimeApi) {
      return null;
    }

    await activatePlannerVersion({
      projectId: options.runtimeApi.projectId,
      episodeId: options.runtimeApi.episodeId,
      versionId,
      stage: options.runtimeActiveRefinement ? 'refinement' : 'outline',
    });

    return refreshPlannerWorkspace();
  }, [options.runtimeActiveRefinement, options.runtimeApi, refreshPlannerWorkspace]);

  return {
    refreshPlannerWorkspace,
    ensureEditableRuntimeRefinement,
    activateHistoryVersion,
  };
}
