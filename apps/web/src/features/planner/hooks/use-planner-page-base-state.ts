'use client';

import { useCallback, useRef, useState } from 'react';

import type { ApiPlannerWorkspace } from '../lib/planner-api';
import { mapWorkspaceMessagesToThread, readPreferredStoryboardModelId, type PlannerAssetRatio, type PlannerRuntimeAssetOption } from '../lib/planner-page-helpers';
import { toPlannerNotice, type PlannerNotice, type PlannerNoticeInput } from '../lib/planner-notice';
import type { PlannerPageData } from '../lib/planner-page-data';
import type { PlannerStructuredDoc } from '../lib/planner-structured-doc';
import type { PlannerThreadMessage } from '../lib/planner-thread';
import { sekoPlanThreadData } from '@aiv/mock-data';

export interface UsePlannerPageBaseStateOptions {
  studio: PlannerPageData;
  initialGeneratedText?: string | null;
  initialStructuredDoc?: PlannerStructuredDoc | null;
  initialWorkspace?: ApiPlannerWorkspace | null;
}

export function usePlannerPageBaseState(options: UsePlannerPageBaseStateOptions) {
  const {
    studio,
    initialGeneratedText,
    initialStructuredDoc,
    initialWorkspace,
  } = options;

  const subjectUploadInputRef = useRef<HTMLInputElement | null>(null);
  const sceneUploadInputRef = useRef<HTMLInputElement | null>(null);

  const [activeEpisodeId, setActiveEpisodeId] = useState('episode-1');
  const [displayTitle, setDisplayTitle] = useState(studio.project.title);
  const [aspectRatio, setAspectRatio] = useState<PlannerAssetRatio>('16:9');
  const [storyboardModelId, setStoryboardModelId] = useState(() => readPreferredStoryboardModelId(initialWorkspace ?? null));
  const [remainingPoints, setRemainingPoints] = useState(studio.creation.points);
  const [requirement, setRequirement] = useState(studio.planner.submittedRequirement || sekoPlanThreadData.userPrompt);
  const [notice, setNoticeState] = useState<PlannerNotice | null>(null);
  const [outlineConfirmed, setOutlineConfirmed] = useState(false);
  const [historyMenuOpen, setHistoryMenuOpen] = useState(false);
  const [runtimeWorkspace, setRuntimeWorkspace] = useState<ApiPlannerWorkspace | null>(initialWorkspace ?? null);
  const [messages, setMessages] = useState<PlannerThreadMessage[]>(() => mapWorkspaceMessagesToThread(initialWorkspace?.messages));
  const [plannerImageAssets, setPlannerImageAssets] = useState<PlannerRuntimeAssetOption[]>([]);
  const [assetUploadPending, setAssetUploadPending] = useState<'subject' | 'scene' | null>(null);
  const [serverPlannerText, setServerPlannerText] = useState(initialGeneratedText ?? '');
  const [structuredPlannerDoc, setStructuredPlannerDoc] = useState<PlannerStructuredDoc | null>(initialStructuredDoc ?? null);
  const [plannerSubmitting, setPlannerSubmitting] = useState(false);

  const setNotice = useCallback((value: PlannerNoticeInput) => {
    setNoticeState(toPlannerNotice(value));
  }, []);

  return {
    subjectUploadInputRef,
    sceneUploadInputRef,
    activeEpisodeId,
    setActiveEpisodeId,
    displayTitle,
    setDisplayTitle,
    aspectRatio,
    setAspectRatio,
    storyboardModelId,
    setStoryboardModelId,
    remainingPoints,
    setRemainingPoints,
    requirement,
    setRequirement,
    notice,
    setNotice,
    outlineConfirmed,
    setOutlineConfirmed,
    historyMenuOpen,
    setHistoryMenuOpen,
    runtimeWorkspace,
    setRuntimeWorkspace,
    messages,
    setMessages,
    plannerImageAssets,
    setPlannerImageAssets,
    assetUploadPending,
    setAssetUploadPending,
    serverPlannerText,
    setServerPlannerText,
    structuredPlannerDoc,
    setStructuredPlannerDoc,
    plannerSubmitting,
    setPlannerSubmitting,
  };
}
