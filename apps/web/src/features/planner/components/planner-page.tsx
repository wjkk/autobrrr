'use client';

import type { PlannerStepStatus, StudioFixture } from '@aiv/domain';
import { cx } from '@aiv/ui';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';

import { Dialog } from '@/features/shared/components/dialog';
import { plannerCopy } from '@/lib/copy';

import type { ApiPlannerWorkspace, PlannerRuntimeApiContext } from '../lib/planner-api';
import type { PlannerStructuredDoc } from '../lib/planner-structured-doc';
import {
  outlineToPreviewStructuredPlannerDoc,
  runtimeScenesToImageCards,
  runtimeShotScriptsToActs,
  runtimeSubjectsToImageCards,
} from '../lib/planner-structured-doc';
import { usePlannerRefinement } from '../hooks/use-planner-refinement';
import { sekoPlanData, type SekoActDraft, type SekoImageCard } from '../lib/seko-plan-data';
import { toPlannerSeedData, toStructuredPlannerDoc } from '../lib/planner-structured-doc';
import { sekoPlanThreadData } from '../lib/seko-plan-thread-data';
import { PlannerHistoryMenu } from './internal/planner-history-menu';
import { PlannerOutlineView } from './planner-outline-view';
import styles from './planner-page.module.css';

interface PlannerPageProps {
  studio: StudioFixture;
  runtimeApi?: PlannerRuntimeApiContext;
  initialGeneratedText?: string | null;
  initialStructuredDoc?: PlannerStructuredDoc | null;
  initialPlannerReady?: boolean;
  initialWorkspace?: ApiPlannerWorkspace | null;
}

type PlannerMode = 'single' | 'series';
type PlannerAssetRatio = '16:9' | '9:16' | '4:3' | '3:4';

interface ShotPointer {
  actId: string;
  shotId: string;
}

interface ShotDraftState {
  visual: string;
  composition: string;
  motion: string;
  voice: string;
  line: string;
}

interface PlannerEpisodeDraft {
  id: string;
  label: string;
  title: string;
  summary: string;
  styleId: number;
  shotCount: number;
}

type PlannerSaveState =
  | { status: 'idle'; message: '' }
  | { status: 'saving'; message: string }
  | { status: 'saved'; message: string }
  | { status: 'error'; message: string };

type PlannerThreadMessage = {
  id: string;
  role: 'user' | 'assistant';
  messageType: string;
  content: string;
  rawContent?: Record<string, unknown> | null;
  createdAt?: string;
};

interface PlannerHistoryVersionView {
  id: string;
  versionNumber: number;
  trigger: string;
  status: 'running' | 'ready' | 'failed';
  createdAt: number;
}

interface PlannerRuntimeAssetOption {
  id: string;
  sourceUrl: string | null;
  fileName: string;
  mediaKind: string;
  sourceKind: string;
  createdAt: string;
}

interface PlannerAssetThumbCandidate {
  key: string;
  image: string;
  assetId: string | null;
  label: string;
  sourceKind: string | null;
  createdAt?: string;
}

function plannerAssetSourceLabel(sourceKind: string | undefined) {
  switch ((sourceKind ?? '').toLowerCase()) {
    case 'generated':
      return 'AI生成';
    case 'reference':
      return '参考图';
    case 'imported':
      return '导入素材';
    case 'upload':
      return '本地上传';
    default:
      return '项目素材';
  }
}

function plannerAssetSortWeight(sourceKind: string | null) {
  switch ((sourceKind ?? '').toLowerCase()) {
    case 'generated':
      return 0;
    case 'upload':
      return 1;
    case 'reference':
      return 2;
    case 'imported':
      return 3;
    default:
      return 4;
  }
}

const BOOT_PROGRESS_STEPS = [28, 49, 67, 85, 100];

const STYLE_LIBRARY = [
  { id: 54, name: '韩漫二次元', tone: '高对比、硬描边、动势夸张' },
  { id: 56, name: '3D古风', tone: '三维体积光、玉石材质、大场景' },
  { id: 60, name: '岩井俊二电影', tone: '柔焦逆光、青春颗粒、空镜节奏' },
  { id: 61, name: '复古DV质感', tone: '手持晃动、磁带噪点、冷暖漂移' },
  { id: 76, name: '未来主义', tone: '冷色金属、霓虹反射、高速运镜' },
];

const STORYBOARD_MODEL_OPTIONS = [
  { id: 'consistency-drama', name: '一致性短剧模型' },
  { id: 'consistency-story', name: '一致性叙事模型' },
  { id: 'film-realism', name: '影视写实模型' },
  { id: 'anime-storyboard', name: '动漫分镜模型' },
];

const DOC_TOC = [
  { id: 'doc-summary', title: '故事梗概' },
  { id: 'doc-style', title: '美术风格' },
  { id: 'doc-subjects', title: '主体列表' },
  { id: 'doc-scenes', title: '场景列表' },
  { id: 'doc-script', title: '分镜剧本' },
];

const ASPECT_RATIO_OPTIONS: PlannerAssetRatio[] = ['16:9', '9:16', '4:3', '3:4'];

const SUBJECT_IMAGE_POOL = sekoPlanData.subjects.map((item) => item.image);
const SCENE_IMAGE_POOL = sekoPlanData.scenes.map((item) => item.image);
const SEKO_ASSISTANT_NAME = 'Seko';
const SUBJECT_TONE_LABEL = '不羁青年';
const SUBJECT_TONE_META = '男性/青年/普通话';

interface ApiEnvelopeSuccess<T> {
  ok: true;
  data: T;
}

interface ApiEnvelopeFailure {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

type ApiEnvelope<T> = ApiEnvelopeSuccess<T> | ApiEnvelopeFailure;

async function requestPlannerApi<T>(path: string, init?: RequestInit) {
  const response = await fetch(path, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
  });

  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || !payload.ok) {
    const errorPayload = payload as ApiEnvelopeFailure;
    throw new Error(errorPayload.error?.message ?? `Request failed: ${path}`);
  }

  return payload.data;
}

async function postPlannerVersionAction<T>(path: string, episodeId: string) {
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      episodeId,
    }),
  });

  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || !payload.ok) {
    const errorPayload = payload as ApiEnvelopeFailure;
    throw new Error(errorPayload.error?.message ?? `Request failed: ${path}`);
  }

  return payload.data;
}

async function patchPlannerEntity<T>(path: string, body: Record<string, unknown>) {
  const response = await fetch(path, {
    method: 'PATCH',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || !payload.ok) {
    const errorPayload = payload as ApiEnvelopeFailure;
    throw new Error(errorPayload.error?.message ?? `Request failed: ${path}`);
  }

  return payload.data;
}

async function deletePlannerEntity<T>(path: string) {
  const response = await fetch(path, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
    },
  });

  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || !payload.ok) {
    const errorPayload = payload as ApiEnvelopeFailure;
    throw new Error(errorPayload.error?.message ?? `Request failed: ${path}`);
  }

  return payload.data;
}

async function uploadPlannerImageAsset(args: {
  projectId: string;
  episodeId: string;
  file: File;
}) {
  const formData = new FormData();
  formData.set('episodeId', args.episodeId);
  formData.set('file', args.file);

  const response = await fetch(`/api/planner/projects/${encodeURIComponent(args.projectId)}/assets/upload`, {
    method: 'POST',
    body: formData,
  });

  const payload = (await response.json()) as ApiEnvelope<PlannerRuntimeAssetOption>;
  if (!response.ok || !payload.ok) {
    const errorPayload = payload as ApiEnvelopeFailure;
    throw new Error(errorPayload.error?.message ?? 'Upload failed.');
  }

  return payload.data;
}

async function putPlannerEntity<T>(path: string, body: Record<string, unknown>) {
  const response = await fetch(path, {
    method: 'PUT',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || !payload.ok) {
    const errorPayload = payload as ApiEnvelopeFailure;
    throw new Error(errorPayload.error?.message ?? `Request failed: ${path}`);
  }

  return payload.data;
}

function buildPlannerAssetThumbCandidates(args: {
  linkedAssets?: Array<{ id: string; sourceUrl: string | null; fileName: string; sourceKind?: string; createdAt?: string }>;
  availableAssets: PlannerRuntimeAssetOption[];
  fallbackImages: string[];
  activeImage: string | null;
  fallbackPrefix: string;
}) {
  const seenAssetIds = new Set<string>();
  const seenImages = new Set<string>();
  const items: PlannerAssetThumbCandidate[] = [];

  const pushCandidate = (candidate: PlannerAssetThumbCandidate) => {
    if (!candidate.image) {
      return;
    }
    if (candidate.assetId) {
      if (seenAssetIds.has(candidate.assetId)) {
        return;
      }
      seenAssetIds.add(candidate.assetId);
    }
    if (seenImages.has(candidate.image)) {
      return;
    }
    seenImages.add(candidate.image);
    items.push(candidate);
  };

  for (const asset of args.linkedAssets ?? []) {
    pushCandidate({
      key: `linked-${asset.id}`,
      image: asset.sourceUrl ?? '',
      assetId: asset.id,
      label: `${plannerAssetSourceLabel(asset.sourceKind)} · ${asset.fileName || '关联素材'}`,
      sourceKind: asset.sourceKind ?? null,
      createdAt: asset.createdAt,
    });
  }

  for (const asset of args.availableAssets) {
    pushCandidate({
      key: `asset-${asset.id}`,
      image: asset.sourceUrl ?? '',
      assetId: asset.id,
      label: `${plannerAssetSourceLabel(asset.sourceKind)} · ${asset.fileName || '项目素材'}`,
      sourceKind: asset.sourceKind,
      createdAt: asset.createdAt,
    });
  }

  for (const [index, image] of args.fallbackImages.entries()) {
    pushCandidate({
      key: `${args.fallbackPrefix}-${index}`,
      image,
      assetId: null,
      label: '本地占位图',
      sourceKind: null,
    });
  }

  if (args.activeImage && !seenImages.has(args.activeImage)) {
    items.unshift({
      key: `${args.fallbackPrefix}-active`,
      image: args.activeImage,
      assetId: null,
      label: '当前预览',
      sourceKind: null,
    });
  }

  return items
    .slice()
    .sort((left, right) => {
      const weightDiff = plannerAssetSortWeight(left.sourceKind) - plannerAssetSortWeight(right.sourceKind);
      if (weightDiff !== 0) {
        return weightDiff;
      }

      const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
      const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
      return rightTime - leftTime;
    })
    .slice(0, 10);
}

function readMessageText(content: Record<string, unknown> | null | undefined) {
  return content && typeof content.text === 'string' ? content.text : '';
}

function readMessageNotice(content: Record<string, unknown> | null | undefined) {
  if (!content) {
    return '';
  }

  if (typeof content.message === 'string') {
    return content.message;
  }

  if (typeof content.text === 'string') {
    return content.text;
  }

  return '';
}

function readStepSummary(content: Record<string, unknown> | null | undefined) {
  if (!content) {
    return '';
  }

  const steps = Array.isArray(content.steps) ? content.steps : [];
  const firstStep = steps[0];
  if (firstStep && typeof firstStep === 'object' && !Array.isArray(firstStep)) {
    const stepTitle = (firstStep as Record<string, unknown>).title;
    if (typeof stepTitle === 'string') {
      return stepTitle;
    }
  }

  return '';
}

function readOutlineSummary(content: Record<string, unknown> | null | undefined) {
  if (!content) {
    return '';
  }

  if (typeof content.text === 'string' && content.text.trim()) {
    return content.text;
  }

  const documentTitle = typeof content.documentTitle === 'string' ? content.documentTitle : '';
  if (documentTitle) {
    return `已生成剧本大纲：${documentTitle}`;
  }

  const outlineDoc =
    content.outlineDoc && typeof content.outlineDoc === 'object' && !Array.isArray(content.outlineDoc)
      ? (content.outlineDoc as Record<string, unknown>)
      : null;
  if (outlineDoc && typeof outlineDoc.projectTitle === 'string') {
    return `已生成剧本大纲：${outlineDoc.projectTitle}`;
  }

  return '已生成剧本大纲';
}

function normaliseHistoryTrigger(triggerType: string) {
  return triggerType.toLowerCase();
}

function normaliseHistoryStatus(status: string): 'running' | 'ready' | 'failed' {
  if (status === 'running' || status === 'ready' || status === 'failed') {
    return status;
  }

  return 'ready';
}

function mapWorkspaceMessagesToThread(
  messages: NonNullable<ApiPlannerWorkspace['messages']> | undefined,
): PlannerThreadMessage[] {
  if (!messages?.length) {
    return [];
  }

  return messages
    .map((message) => ({
      id: message.id,
      role: (message.role === 'user' ? 'user' : 'assistant') as PlannerThreadMessage['role'],
      messageType: message.messageType,
      content:
        message.messageType === 'assistant_outline_card'
          ? readOutlineSummary(message.content)
          : message.messageType === 'assistant_steps'
            ? readStepSummary(message.content)
            : message.messageType === 'assistant_document_receipt'
              ? readMessageNotice(message.content)
              : readMessageText(message.content),
      rawContent: message.content,
      createdAt: message.createdAt,
    }))
    .filter((message) => message.messageType === 'assistant_steps' || message.content.trim().length > 0);
}

function nextLocalId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function styleById(styleId: number) {
  return STYLE_LIBRARY.find((item) => item.id === styleId) ?? STYLE_LIBRARY[0];
}

function nextImageFromPool(current: string, pool: string[]) {
  if (!pool.length) {
    return current;
  }

  const index = pool.indexOf(current);
  const nextIndex = index === -1 ? 0 : (index + 1) % pool.length;
  return pool[nextIndex];
}

function buildPlannerEpisodes(title: string, mode: PlannerMode, brief: string, episodeCount: number, shotTotal: number): PlannerEpisodeDraft[] {
  const baseTitle = title.slice(0, 18) || '霓虹代码：神秘U盘';

  if (mode === 'single') {
    return [
      {
        id: 'episode-1',
        label: 'EP 01',
        title: baseTitle,
        summary: brief || '单片模式，全部分镜围绕一条主线推进。',
        styleId: 61,
        shotCount: shotTotal,
      },
    ];
  }

  return Array.from({ length: episodeCount }, (_item, index) => ({
    id: `episode-${index + 1}`,
    label: `EP ${String(index + 1).padStart(2, '0')}`,
    title: index === 0 ? baseTitle : `${baseTitle}·待策划`,
    summary: index === 0 ? brief || '负责开场设定与情绪入场。' : '待补充当前集剧情摘要。',
    styleId: index === 0 ? 61 : 56,
    shotCount: index === 0 ? shotTotal : 0,
  }));
}

function plannerModeLabel(mode: PlannerMode) {
  return mode === 'series' ? '多剧集模式' : '单片模式';
}

function ratioToCssValue(ratio: PlannerAssetRatio) {
  if (ratio === '16:9') {
    return '16 / 9';
  }

  if (ratio === '9:16') {
    return '9 / 16';
  }

  if (ratio === '4:3') {
    return '4 / 3';
  }

  return '3 / 4';
}

function ratioCardWidth(ratio: PlannerAssetRatio) {
  if (ratio === '16:9') {
    return 196;
  }

  if (ratio === '9:16') {
    return 132;
  }

  if (ratio === '4:3') {
    return 182;
  }

  return 150;
}

export function PlannerPage({ studio, runtimeApi, initialGeneratedText, initialStructuredDoc, initialPlannerReady, initialWorkspace }: PlannerPageProps) {
  const router = useRouter();
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const subjectUploadInputRef = useRef<HTMLInputElement | null>(null);
  const sceneUploadInputRef = useRef<HTMLInputElement | null>(null);

  const plannerMode: PlannerMode = studio.project.contentMode === 'series' ? 'series' : 'single';

  const [activeEpisodeId, setActiveEpisodeId] = useState('episode-1');
  const [displayTitle, setDisplayTitle] = useState(studio.project.title);

  const [aspectRatio, setAspectRatio] = useState<PlannerAssetRatio>('16:9');
  const [storyboardModelId, setStoryboardModelId] = useState(STORYBOARD_MODEL_OPTIONS[0]?.id ?? 'consistency-drama');
  const [remainingPoints, setRemainingPoints] = useState(studio.creation.points);

  const [requirement, setRequirement] = useState(studio.planner.submittedRequirement || sekoPlanThreadData.userPrompt);
  const [notice, setNotice] = useState<string | null>(null);
  const [outlineConfirmed, setOutlineConfirmed] = useState(false);
  const [historyMenuOpen, setHistoryMenuOpen] = useState(false);
  const [runtimeWorkspace, setRuntimeWorkspace] = useState<ApiPlannerWorkspace | null>(initialWorkspace ?? null);
  const [messages, setMessages] = useState<PlannerThreadMessage[]>(() => mapWorkspaceMessagesToThread(initialWorkspace?.messages));
  const [plannerImageAssets, setPlannerImageAssets] = useState<PlannerRuntimeAssetOption[]>([]);

  const [subjectDialogCardId, setSubjectDialogCardId] = useState<string | null>(null);
  const [subjectNameDraft, setSubjectNameDraft] = useState('');
  const [subjectPromptDraft, setSubjectPromptDraft] = useState('');
  const [subjectImageDraft, setSubjectImageDraft] = useState('');
  const [subjectAdjustMode, setSubjectAdjustMode] = useState<'upload' | 'ai'>('ai');
  const [subjectAssetDraftId, setSubjectAssetDraftId] = useState<string | null>(null);
  const [assetUploadPending, setAssetUploadPending] = useState<'subject' | 'scene' | null>(null);

  const [sceneDialogCardId, setSceneDialogCardId] = useState<string | null>(null);
  const [sceneNameDraft, setSceneNameDraft] = useState('');
  const [scenePromptDraft, setScenePromptDraft] = useState('');
  const [sceneImageDraft, setSceneImageDraft] = useState('');
  const [sceneAdjustMode, setSceneAdjustMode] = useState<'upload' | 'ai'>('ai');
  const [sceneAssetDraftId, setSceneAssetDraftId] = useState<string | null>(null);

  const [editingShot, setEditingShot] = useState<ShotPointer | null>(null);
  const [shotDraft, setShotDraft] = useState<ShotDraftState | null>(null);
  const [shotDeleteDialog, setShotDeleteDialog] = useState<ShotPointer | null>(null);

  const [booting, setBooting] = useState(false);
  const [bootProgress, setBootProgress] = useState(0);
  const [serverPlannerText, setServerPlannerText] = useState(initialGeneratedText ?? '');
  const [structuredPlannerDoc, setStructuredPlannerDoc] = useState<PlannerStructuredDoc | null>(initialStructuredDoc ?? null);
  const [plannerSubmitting, setPlannerSubmitting] = useState(false);
  const [saveState, setSaveState] = useState<PlannerSaveState>({ status: 'idle', message: '' });

  const plannerDoc = useMemo(() => (structuredPlannerDoc ? toPlannerSeedData(structuredPlannerDoc, sekoPlanData) : sekoPlanData), [structuredPlannerDoc]);
  const workspaceStepAnalysis = runtimeWorkspace?.activeRefinement?.stepAnalysis ?? [];
  const workspaceHistoryVersions = runtimeWorkspace?.refinementVersions ?? [];
  const runtimeActiveOutline = runtimeWorkspace?.activeOutline ?? null;
  const runtimeActiveRefinement = runtimeWorkspace?.activeRefinement ?? null;

  const persistPlannerDoc = async (nextDoc: PlannerStructuredDoc, successMessage: string) => {
    setStructuredPlannerDoc(nextDoc);
    setSaveState({ status: 'saving', message: '正在保存更改...' });

    if (!runtimeApi) {
      setNotice(successMessage);
      setSaveState({ status: 'saved', message: '已保存到本地状态。' });
      return;
    }

    try {
      const response = await fetch(`/api/planner/projects/${encodeURIComponent(runtimeApi.projectId)}/document`, {
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          episodeId: runtimeApi.episodeId,
          structuredDoc: nextDoc,
        }),
      });
      const payload = (await response.json()) as { ok: boolean; error?: { message?: string } };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error?.message ?? '保存策划文档失败。');
      }
      setNotice(successMessage);
      setSaveState({ status: 'saved', message: '已同步到后端。' });
    } catch (error) {
      const message = error instanceof Error ? error.message : '保存策划文档失败。';
      setNotice(message);
      setSaveState({ status: 'error', message });
    }
  };

  const plannerEpisodes = useMemo(() => buildPlannerEpisodes(studio.project.title, plannerMode, studio.project.brief, plannerDoc.episodeCount, plannerDoc.acts.reduce((sum, item) => sum + item.shots.length, 0)), [plannerDoc.acts, plannerDoc.episodeCount, plannerMode, studio.project.title, studio.project.brief]);

  const {
    versions,
    activeVersionId,
    activeVersion,
    startRefinement,
    hydrateReadyVersion,
    selectVersion,
    updateSubject,
    updateScene,
    updateShot,
    deleteShot,
  } = usePlannerRefinement({
    stepCount: sekoPlanThreadData.refinementSteps.length,
    seedSubjects: plannerDoc.subjects,
    seedScenes: plannerDoc.scenes,
    seedActs: plannerDoc.acts,
  });

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    if (saveState.status !== 'saved') {
      return;
    }

    const timer = window.setTimeout(() => {
      setSaveState({ status: 'idle', message: '' });
    }, 2200);

    return () => window.clearTimeout(timer);
  }, [saveState]);

  useEffect(() => {
    if (!initialPlannerReady || !initialGeneratedText || versions.length > 0) {
      return;
    }

    if (runtimeWorkspace?.activeRefinement) {
      setOutlineConfirmed(true);
      return;
    }

    if (runtimeWorkspace?.activeOutline) {
      setOutlineConfirmed(false);
      return;
    }

    setOutlineConfirmed(true);
    hydrateReadyVersion({
      trigger: 'confirm_outline',
      instruction: studio.planner.submittedRequirement || studio.project.brief,
    });
  }, [hydrateReadyVersion, initialGeneratedText, initialPlannerReady, runtimeWorkspace?.activeOutline, runtimeWorkspace?.activeRefinement, studio.planner.submittedRequirement, studio.project.brief, versions.length]);

  const pollPlannerRunUntilTerminal = async (
    runId: string,
    trigger:
      | 'generate_outline'
      | 'update_outline'
      | 'confirm_outline'
      | 'rerun'
      | 'subject_only'
      | 'scene_only'
      | 'shots_only'
      | 'subject_image'
      | 'scene_image'
      | 'shot_image',
    instruction: string,
  ) => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const run = await requestPlannerApi<{ status: string; output: { generatedText?: string; structuredDoc?: PlannerStructuredDoc | null } | null; errorMessage: string | null }>(
        `/api/planner/runs/${encodeURIComponent(runId)}`,
      );

      if (run.status === 'completed' && run.output?.generatedText) {
        const generatedText = run.output?.generatedText ?? '';
        const workspace = await refreshPlannerWorkspace();
        if (!workspace) {
          setServerPlannerText(generatedText);
          setStructuredPlannerDoc(run.output?.structuredDoc ?? null);
          if (trigger === 'confirm_outline' || trigger === 'rerun') {
            setOutlineConfirmed(true);
            const nextId = hydrateReadyVersion({ trigger: trigger === 'confirm_outline' ? 'confirm_outline' : 'rerun', instruction });
            selectVersion(nextId);
          } else {
            setOutlineConfirmed(false);
          }
          setMessages((current) => [
            ...current,
            { id: nextLocalId('msg'), role: 'user', messageType: 'user_input', content: instruction || (trigger === 'rerun' ? '请重新细化剧情内容。' : sekoPlanThreadData.confirmPrompt) },
            { id: nextLocalId('msg'), role: 'assistant', messageType: 'assistant_text', content: generatedText },
          ]);
        }
        setNotice(
          workspace?.activeRefinement
            ? trigger === 'confirm_outline'
              ? '已完成细化并更新策划文档。'
              : trigger === 'subject_only'
                ? '已按要求局部重写主体并更新策划文档。'
                : trigger === 'scene_only'
                  ? '已按要求局部重写场景并更新策划文档。'
                  : trigger === 'shots_only'
                    ? '已按要求局部重写分镜并更新策划文档。'
                    : trigger === 'subject_image'
                      ? '已生成主体图片并回写到策划文档。'
                      : trigger === 'scene_image'
                        ? '已生成场景图片并回写到策划文档。'
                        : trigger === 'shot_image'
                          ? '已生成分镜草图并回写到策划文档。'
              : '已生成新的策划版本。'
            : trigger === 'generate_outline' || trigger === 'update_outline'
              ? '已生成新的剧本大纲版本。'
              : '已生成剧本大纲，请确认后继续细化。',
        );
        setPlannerSubmitting(false);
        return;
      }

      if (run.status === 'failed' || run.status === 'canceled' || run.status === 'timed_out') {
        setNotice(run.errorMessage ?? '策划生成失败，请稍后重试。');
        setPlannerSubmitting(false);
        return;
      }
    }

    setNotice('策划任务已提交，仍在后台处理中。');
    setPlannerSubmitting(false);
  };

  const submitPlannerRunViaApi = async (
    trigger: 'generate_outline' | 'update_outline' | 'confirm_outline' | 'rerun',
    instruction: string,
  ) => {
    if (!runtimeApi) {
      return false;
    }

    setPlannerSubmitting(true);
    const result = await requestPlannerApi<{ run: { id: string; status: string } }>(
      `/api/planner/projects/${encodeURIComponent(runtimeApi.projectId)}/generate-doc`,
      {
        method: 'POST',
        body: JSON.stringify({
          episodeId: runtimeApi.episodeId,
          prompt: instruction,
          modelFamily: 'doubao-text',
          modelEndpoint: 'ark-doubao-seed-1-8-251228',
        }),
      },
    );

    await pollPlannerRunUntilTerminal(result.run.id, trigger, instruction);
    return true;
  };

  const submitPartialRerunViaApi = async (
    scope: 'subject_only' | 'scene_only' | 'shots_only',
    targetId: string,
    instruction: string,
  ) => {
    if (!runtimeApi) {
      return false;
    }

    setPlannerSubmitting(true);
    const result = await requestPlannerApi<{ run: { id: string; status: string } }>(
      `/api/planner/projects/${encodeURIComponent(runtimeApi.projectId)}/partial-rerun`,
      {
        method: 'POST',
        body: JSON.stringify({
          episodeId: runtimeApi.episodeId,
          scope,
          targetId,
          prompt: instruction,
        }),
      },
    );

    await pollPlannerRunUntilTerminal(result.run.id, scope, instruction);
    return true;
  };

  const submitPlannerImageGenerationViaApi = async (
    scope: 'subject_image' | 'scene_image' | 'shot_image',
    targetPath: string,
    prompt: string,
    referenceAssetIds: string[] = [],
  ) => {
    if (!runtimeApi) {
      return false;
    }

    setPlannerSubmitting(true);
    const result = await requestPlannerApi<{ run: { id: string; status: string } }>(targetPath, {
      method: 'POST',
      body: JSON.stringify({
        episodeId: runtimeApi.episodeId,
        prompt,
        referenceAssetIds,
      }),
    });

    await pollPlannerRunUntilTerminal(result.run.id, scope, prompt);
    return true;
  };

  useEffect(() => {
    if (!plannerEpisodes.some((item) => item.id === activeEpisodeId)) {
      setActiveEpisodeId(plannerEpisodes[0]?.id ?? 'episode-1');
    }
  }, [activeEpisodeId, plannerEpisodes]);

  const refreshPlannerWorkspace = async () => {
    if (!runtimeApi) {
      return null;
    }

    const workspace = await requestPlannerApi<ApiPlannerWorkspace>(
      `/api/planner/projects/${encodeURIComponent(runtimeApi.projectId)}/workspace?episodeId=${encodeURIComponent(runtimeApi.episodeId)}`,
    );
    const assets = await requestPlannerApi<PlannerRuntimeAssetOption[]>(
      `/api/planner/projects/${encodeURIComponent(runtimeApi.projectId)}/assets?episodeId=${encodeURIComponent(runtimeApi.episodeId)}&mediaKind=image`,
    );

    setRuntimeWorkspace(workspace);
    setPlannerImageAssets(assets);
    setDisplayTitle(workspace.project.title);
    setMessages(mapWorkspaceMessagesToThread(workspace.messages));
    setServerPlannerText(workspace.latestPlannerRun?.generatedText ?? '');
    const derivedStructuredDoc = workspace.activeRefinement?.structuredDoc
      ?? workspace.latestPlannerRun?.structuredDoc
      ?? (workspace.activeOutline?.outlineDoc ? outlineToPreviewStructuredPlannerDoc(workspace.activeOutline.outlineDoc) : null)
      ?? null;
    setStructuredPlannerDoc(derivedStructuredDoc);
    setOutlineConfirmed(Boolean(workspace.plannerSession?.outlineConfirmedAt));

    return workspace;
  };

  const activeEpisode = useMemo(() => plannerEpisodes.find((item) => item.id === activeEpisodeId) ?? plannerEpisodes[0] ?? null, [plannerEpisodes, activeEpisodeId]);
  const activeStyle = styleById(activeEpisode?.styleId ?? 61);
  const activeEpisodeNumber = Number.parseInt(activeEpisode?.label.replace('EP ', '') ?? '1', 10);

  const pointCost = studio.planner.pointCost > 0 ? studio.planner.pointCost : plannerDoc.pointCost;
  const mediaCardStyle = useMemo(
    () =>
      ({
        '--planner-media-aspect-ratio': ratioToCssValue(aspectRatio),
        '--planner-media-card-width': `${ratioCardWidth(aspectRatio)}px`,
      }) as CSSProperties,
    [aspectRatio],
  );

  const usingRuntimePlanner = Boolean(runtimeApi && runtimeWorkspace);
  const usingRuntimeDoc = Boolean(runtimeActiveRefinement || runtimeWorkspace?.activeOutline);
  const runtimeSubjectCards = useMemo(
    () => runtimeSubjectsToImageCards(runtimeWorkspace?.subjects ?? [], SUBJECT_IMAGE_POOL),
    [runtimeWorkspace?.subjects],
  );
  const runtimeSceneCards = useMemo(
    () => runtimeScenesToImageCards(runtimeWorkspace?.scenes ?? [], SCENE_IMAGE_POOL),
    [runtimeWorkspace?.scenes],
  );
  const runtimeScriptActs = useMemo(
    () => runtimeShotScriptsToActs(runtimeWorkspace?.shotScripts ?? [], runtimeWorkspace?.scenes ?? []),
    [runtimeWorkspace?.scenes, runtimeWorkspace?.shotScripts],
  );
  const displaySubjectCards =
    runtimeActiveRefinement && runtimeSubjectCards.length > 0
      ? runtimeSubjectCards
      : usingRuntimeDoc
        ? plannerDoc.subjects
        : activeVersion?.subjectCards ?? [];
  const displaySceneCards =
    runtimeActiveRefinement && runtimeSceneCards.length > 0
      ? runtimeSceneCards
      : usingRuntimeDoc
        ? plannerDoc.scenes
        : activeVersion?.sceneCards ?? [];
  const displayScriptActs =
    runtimeActiveRefinement && runtimeScriptActs.length > 0
      ? runtimeScriptActs
      : usingRuntimeDoc
        ? plannerDoc.acts
        : activeVersion?.scriptActs ?? [];
  const displaySections = usingRuntimeDoc
    ? {
        summary: plannerDoc.summaryBullets.length > 0,
        style: plannerDoc.styleBullets.length > 0,
        subjects: (runtimeActiveRefinement ? runtimeSubjectCards.length : plannerDoc.subjects.length) > 0,
        scenes: (runtimeActiveRefinement ? runtimeSceneCards.length : plannerDoc.scenes.length) > 0,
        script: (runtimeActiveRefinement ? runtimeScriptActs.length : plannerDoc.acts.length) > 0,
      }
    : activeVersion?.sections ?? {
        summary: false,
        style: false,
        subjects: false,
        scenes: false,
        script: false,
      };
  const displayVersionStatus = runtimeActiveRefinement?.status ?? runtimeWorkspace?.activeOutline?.status ?? activeVersion?.status ?? null;
  const displayVersionProgress = runtimeActiveRefinement ? null : activeVersion?.progressPercent ?? null;
  const historyVersions: PlannerHistoryVersionView[] = runtimeActiveRefinement
    ? workspaceHistoryVersions
        .slice()
        .sort(
          (
            left: NonNullable<ApiPlannerWorkspace['refinementVersions']>[number],
            right: NonNullable<ApiPlannerWorkspace['refinementVersions']>[number],
          ) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
        )
        .map((version: NonNullable<ApiPlannerWorkspace['refinementVersions']>[number]) => ({
          id: version.id,
          versionNumber: version.versionNumber,
          trigger: normaliseHistoryTrigger(version.triggerType),
          status: normaliseHistoryStatus(version.status),
          createdAt: new Date(version.createdAt).getTime(),
        }))
    : runtimeActiveOutline
      ? (runtimeWorkspace?.outlineVersions ?? [])
          .slice()
          .sort(
            (
              left: NonNullable<ApiPlannerWorkspace['outlineVersions']>[number],
              right: NonNullable<ApiPlannerWorkspace['outlineVersions']>[number],
            ) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
          )
          .map((version: NonNullable<ApiPlannerWorkspace['outlineVersions']>[number]) => ({
            id: version.id,
            versionNumber: version.versionNumber,
            trigger: normaliseHistoryTrigger(version.triggerType),
            status: normaliseHistoryStatus(version.status),
            createdAt: new Date(version.createdAt).getTime(),
          }))
      : versions;
  const historyActiveVersionId = runtimeActiveRefinement?.id ?? activeVersionId;
  const hasDisplayVersion = Boolean(runtimeActiveRefinement || runtimeWorkspace?.activeOutline || activeVersion);

  const activeSubjectCard = useMemo(() => {
    if (!subjectDialogCardId) {
      return null;
    }

    return displaySubjectCards.find((item) => item.id === subjectDialogCardId) ?? null;
  }, [displaySubjectCards, subjectDialogCardId]);

  const activeRuntimeSubject = useMemo(() => {
    if (!subjectDialogCardId) {
      return null;
    }
    return runtimeWorkspace?.subjects?.find((item) => item.id === subjectDialogCardId) ?? null;
  }, [runtimeWorkspace?.subjects, subjectDialogCardId]);

  const activeSceneCard = useMemo(() => {
    if (!sceneDialogCardId) {
      return null;
    }

    return displaySceneCards.find((item) => item.id === sceneDialogCardId) ?? null;
  }, [displaySceneCards, sceneDialogCardId]);

  const activeRuntimeScene = useMemo(() => {
    if (!sceneDialogCardId) {
      return null;
    }
    return runtimeWorkspace?.scenes?.find((item) => item.id === sceneDialogCardId) ?? null;
  }, [runtimeWorkspace?.scenes, sceneDialogCardId]);

  const subjectAssetThumbs = useMemo(
    () =>
      buildPlannerAssetThumbCandidates({
        linkedAssets: [
          ...(activeRuntimeSubject?.generatedAssets ?? []),
          ...(activeRuntimeSubject?.referenceAssets ?? []),
        ],
        availableAssets: plannerImageAssets,
        fallbackImages: SUBJECT_IMAGE_POOL,
        activeImage: subjectImageDraft || activeSubjectCard?.image || null,
        fallbackPrefix: 'subject-thumb',
      }),
    [activeRuntimeSubject?.generatedAssets, activeRuntimeSubject?.referenceAssets, activeSubjectCard?.image, plannerImageAssets, subjectImageDraft],
  );

  const sceneAssetThumbs = useMemo(
    () =>
      buildPlannerAssetThumbCandidates({
        linkedAssets: [
          ...(activeRuntimeScene?.generatedAssets ?? []),
          ...(activeRuntimeScene?.referenceAssets ?? []),
        ],
        availableAssets: plannerImageAssets,
        fallbackImages: SCENE_IMAGE_POOL,
        activeImage: sceneImageDraft || activeSceneCard?.image || null,
        fallbackPrefix: 'scene-thumb',
      }),
    [activeRuntimeScene?.generatedAssets, activeRuntimeScene?.referenceAssets, activeSceneCard?.image, plannerImageAssets, sceneImageDraft],
  );

  const activeSubjectAssetLabel = useMemo(() => {
    const selectedThumb = subjectAssetThumbs.find((image) =>
      image.assetId ? image.assetId === subjectAssetDraftId : !subjectAssetDraftId && (subjectImageDraft || activeSubjectCard?.image) === image.image,
    );
    return selectedThumb?.label ?? '可选择项目图片素材或占位图';
  }, [activeSubjectCard?.image, subjectAssetDraftId, subjectAssetThumbs, subjectImageDraft]);

  const activeSceneAssetLabel = useMemo(() => {
    const selectedThumb = sceneAssetThumbs.find((image) =>
      image.assetId ? image.assetId === sceneAssetDraftId : !sceneAssetDraftId && (sceneImageDraft || activeSceneCard?.image) === image.image,
    );
    return selectedThumb?.label ?? '可选择项目图片素材或占位图';
  }, [activeSceneCard?.image, sceneAssetDraftId, sceneAssetThumbs, sceneImageDraft]);

  const deletingShot = useMemo(() => {
    if (!shotDeleteDialog) {
      return null;
    }

    const act = displayScriptActs.find((item) => item.id === shotDeleteDialog.actId);
    const shot = act?.shots.find((item) => item.id === shotDeleteDialog.shotId);

    return shot ?? null;
  }, [displayScriptActs, shotDeleteDialog]);

  const refinementDetailSteps = useMemo(
    () =>
      runtimeActiveRefinement
        ? workspaceStepAnalysis.map((step) => ({
            title: step.title,
            status: (step.status === 'done' || step.status === 'running' || step.status === 'waiting' || step.status === 'failed'
              ? step.status
              : 'waiting') as PlannerStepStatus,
            tags:
              step.detail && Array.isArray(step.detail.details)
                ? step.detail.details.filter((detail): detail is string => typeof detail === 'string')
                : [],
          }))
        : sekoPlanThreadData.refinementSteps.map((title, index) => ({
            title,
            status: activeVersion?.steps[index] ?? ('waiting' as PlannerStepStatus),
            tags: index === 2 ? ['设计角色特征'] : index === 3 ? ['设计短片主要场景细节'] : [],
          })),
    [activeVersion, runtimeActiveRefinement, workspaceStepAnalysis],
  );

  const handleConfirmOutline = () => {
    if (outlineConfirmed || plannerSubmitting) {
      return;
    }

    setHistoryMenuOpen(false);

    if (runtimeApi) {
      if (!runtimeActiveOutline) {
        setNotice('当前没有可确认的大纲版本。');
        return;
      }

      setPlannerSubmitting(true);
      postPlannerVersionAction(
        `/api/planner/projects/${encodeURIComponent(runtimeApi.projectId)}/outline-versions/${encodeURIComponent(runtimeActiveOutline.id)}/confirm`,
        runtimeApi.episodeId,
      )
        .then(async () => {
          await refreshPlannerWorkspace();
          setNotice('已确认当前大纲，下一步可开始细化剧情内容。');
        })
        .catch((error: unknown) => {
          setNotice(error instanceof Error ? error.message : '确认大纲失败。');
        })
        .finally(() => {
          setPlannerSubmitting(false);
        });
      return;
    }

    setOutlineConfirmed(true);
    const nextId = startRefinement({ trigger: 'confirm_outline' });
    selectVersion(nextId);

    setMessages((current) => [
      ...current,
      { id: nextLocalId('msg'), role: 'user', messageType: 'user_input', content: sekoPlanThreadData.confirmPrompt },
      { id: nextLocalId('msg'), role: 'assistant', messageType: 'assistant_text', content: sekoPlanThreadData.refinementReply },
    ]);

    setNotice('已确认大纲，开始细化剧情内容。');
  };

  const rerunRefinement = () => {
    if (!outlineConfirmed) {
      setNotice('请先确认大纲后再重新细化。');
      return;
    }

    const instruction = requirement.trim();
    if (runtimeApi) {
      submitPlannerRunViaApi('rerun', instruction || '请重新细化剧情内容。').catch((error: unknown) => {
        setPlannerSubmitting(false);
        setNotice(error instanceof Error ? error.message : '策划生成失败，请稍后重试。');
      });
      setHistoryMenuOpen(false);
      setNotice('已提交新的策划生成任务。');
      return;
    }

    const nextId = startRefinement({
      trigger: 'rerun',
      instruction,
    });

    selectVersion(nextId);
    setHistoryMenuOpen(false);
    setMessages((current) => [
      ...current,
      { id: nextLocalId('msg'), role: 'user', messageType: 'user_input', content: instruction || '请重新细化剧情内容。' },
      { id: nextLocalId('msg'), role: 'assistant', messageType: 'assistant_text', content: plannerCopy.assistantWorking },
    ]);
    setNotice('已创建新的细化版本。');
  };

  const handleComposerSubmit = () => {
    const instruction = requirement.trim();
    if (!instruction) {
      setNotice('请输入内容后提交。');
      return;
    }

    if (!outlineConfirmed && runtimeApi) {
      const trigger = runtimeActiveOutline ? 'update_outline' : 'generate_outline';
      submitPlannerRunViaApi(trigger, instruction).catch((error: unknown) => {
        setPlannerSubmitting(false);
        setNotice(error instanceof Error ? error.message : '策划生成失败，请稍后重试。');
      });
      setNotice(runtimeActiveOutline ? '已提交大纲修改任务。' : '已提交剧本大纲生成任务。');
      return;
    }

    if (!outlineConfirmed) {
      handleConfirmOutline();
      return;
    }

    rerunRefinement();
  };

  const openSubjectAdjustDialog = (cardId: string) => {
    const target = displaySubjectCards.find((item) => item.id === cardId);
    const runtimeTarget = runtimeWorkspace?.subjects?.find((item) => item.id === cardId) ?? null;
    if (!target) {
      return;
    }

    setSubjectDialogCardId(cardId);
    setSubjectNameDraft(target.title);
    setSubjectPromptDraft(target.prompt);
    setSubjectImageDraft(target.image);
    setSubjectAssetDraftId(
      runtimeTarget?.generatedAssets?.[0]?.id
      ?? runtimeTarget?.referenceAssets?.[0]?.id
      ?? null,
    );
    setSubjectAdjustMode('ai');
  };

  const closeSubjectAdjustDialog = () => {
    setSubjectDialogCardId(null);
    setSubjectNameDraft('');
    setSubjectPromptDraft('');
    setSubjectImageDraft('');
    setSubjectAssetDraftId(null);
    setSubjectAdjustMode('ai');
  };

  const handleSubjectUpload = async (file: File | null) => {
    if (!file || !runtimeApi) {
      return;
    }

    setAssetUploadPending('subject');
    try {
      const uploadedAsset = await uploadPlannerImageAsset({
        projectId: runtimeApi.projectId,
        episodeId: runtimeApi.episodeId,
        file,
      });
      setPlannerImageAssets((current) => [uploadedAsset, ...current.filter((asset) => asset.id !== uploadedAsset.id)]);
      setSubjectImageDraft(uploadedAsset.sourceUrl ?? '');
      setSubjectAssetDraftId(uploadedAsset.id);
      setSubjectAdjustMode('upload');
      setNotice('主体参考图已上传。');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '主体参考图上传失败。');
    } finally {
      setAssetUploadPending(null);
      if (subjectUploadInputRef.current) {
        subjectUploadInputRef.current.value = '';
      }
    }
  };

  const applySubjectAdjust = () => {
    if (!subjectDialogCardId) {
      return;
    }

    if (runtimeApi && runtimeActiveRefinement) {
      patchPlannerEntity(
        `/api/planner/projects/${encodeURIComponent(runtimeApi.projectId)}/subjects/${encodeURIComponent(subjectDialogCardId)}`,
        {
          episodeId: runtimeApi.episodeId,
          name: subjectNameDraft.trim() || undefined,
          appearance: subjectPromptDraft.trim() || undefined,
          prompt: subjectPromptDraft.trim() || undefined,
        },
      )
        .then(async () => {
          const isExistingGeneratedAsset = Boolean(
            subjectAssetDraftId && activeRuntimeSubject?.generatedAssets?.some((asset) => asset.id === subjectAssetDraftId),
          );
          await putPlannerEntity(
            `/api/planner/projects/${encodeURIComponent(runtimeApi.projectId)}/subjects/${encodeURIComponent(subjectDialogCardId)}/assets`,
            {
              episodeId: runtimeApi.episodeId,
              referenceAssetIds: subjectAssetDraftId && !isExistingGeneratedAsset ? [subjectAssetDraftId] : [],
              generatedAssetIds: subjectAssetDraftId && isExistingGeneratedAsset ? [subjectAssetDraftId] : [],
            },
          );
          await refreshPlannerWorkspace();
          setNotice('主体设定已更新。');
        })
        .catch((error: unknown) => {
          setNotice(error instanceof Error ? error.message : '主体设定更新失败。');
        });
      closeSubjectAdjustDialog();
      return;
    }

    const nextSubjects = displaySubjectCards.map((item) =>
      item.id === subjectDialogCardId
        ? {
            ...item,
            title: subjectNameDraft.trim() || item.title,
            prompt: subjectPromptDraft.trim() || item.prompt,
            image: subjectImageDraft || item.image,
          }
        : item,
    );

    updateSubject(subjectDialogCardId, (item) => ({
      ...item,
      title: subjectNameDraft.trim() || item.title,
      prompt: subjectPromptDraft.trim() || item.prompt,
      image: subjectImageDraft || item.image,
    }));

    void persistPlannerDoc(
      toStructuredPlannerDoc({
        ...plannerDoc,
        subjects: nextSubjects,
      }),
      '主体图片已更新。',
    );
    closeSubjectAdjustDialog();
  };

  const openSceneAdjustDialog = (cardId: string) => {
    const target = displaySceneCards.find((item) => item.id === cardId);
    const runtimeTarget = runtimeWorkspace?.scenes?.find((item) => item.id === cardId) ?? null;
    if (!target) {
      return;
    }

    setSceneDialogCardId(cardId);
    setSceneNameDraft(target.title);
    setScenePromptDraft(target.prompt);
    setSceneImageDraft(target.image);
    setSceneAssetDraftId(
      runtimeTarget?.generatedAssets?.[0]?.id
      ?? runtimeTarget?.referenceAssets?.[0]?.id
      ?? null,
    );
    setSceneAdjustMode('ai');
  };

  const closeSceneAdjustDialog = () => {
    setSceneDialogCardId(null);
    setSceneNameDraft('');
    setScenePromptDraft('');
    setSceneImageDraft('');
    setSceneAssetDraftId(null);
    setSceneAdjustMode('ai');
  };

  const handleSceneUpload = async (file: File | null) => {
    if (!file || !runtimeApi) {
      return;
    }

    setAssetUploadPending('scene');
    try {
      const uploadedAsset = await uploadPlannerImageAsset({
        projectId: runtimeApi.projectId,
        episodeId: runtimeApi.episodeId,
        file,
      });
      setPlannerImageAssets((current) => [uploadedAsset, ...current.filter((asset) => asset.id !== uploadedAsset.id)]);
      setSceneImageDraft(uploadedAsset.sourceUrl ?? '');
      setSceneAssetDraftId(uploadedAsset.id);
      setSceneAdjustMode('upload');
      setNotice('场景参考图已上传。');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '场景参考图上传失败。');
    } finally {
      setAssetUploadPending(null);
      if (sceneUploadInputRef.current) {
        sceneUploadInputRef.current.value = '';
      }
    }
  };

  const applySceneAdjust = () => {
    if (!sceneDialogCardId) {
      return;
    }

    if (runtimeApi && runtimeActiveRefinement) {
      patchPlannerEntity(
        `/api/planner/projects/${encodeURIComponent(runtimeApi.projectId)}/scenes/${encodeURIComponent(sceneDialogCardId)}`,
        {
          episodeId: runtimeApi.episodeId,
          name: sceneNameDraft.trim() || undefined,
          description: scenePromptDraft.trim() || undefined,
          prompt: scenePromptDraft.trim() || undefined,
        },
      )
        .then(async () => {
          const isExistingGeneratedAsset = Boolean(
            sceneAssetDraftId && activeRuntimeScene?.generatedAssets?.some((asset) => asset.id === sceneAssetDraftId),
          );
          await putPlannerEntity(
            `/api/planner/projects/${encodeURIComponent(runtimeApi.projectId)}/scenes/${encodeURIComponent(sceneDialogCardId)}/assets`,
            {
              episodeId: runtimeApi.episodeId,
              referenceAssetIds: sceneAssetDraftId && !isExistingGeneratedAsset ? [sceneAssetDraftId] : [],
              generatedAssetIds: sceneAssetDraftId && isExistingGeneratedAsset ? [sceneAssetDraftId] : [],
            },
          );
          await refreshPlannerWorkspace();
          setNotice('场景设定已更新。');
        })
        .catch((error: unknown) => {
          setNotice(error instanceof Error ? error.message : '场景设定更新失败。');
        });
      closeSceneAdjustDialog();
      return;
    }

    const nextScenes = displaySceneCards.map((item) =>
      item.id === sceneDialogCardId
        ? {
            ...item,
            title: sceneNameDraft.trim() || item.title,
            prompt: scenePromptDraft.trim() || item.prompt,
            image: sceneImageDraft || item.image,
          }
        : item,
    );

    updateScene(sceneDialogCardId, (item) => ({
      ...item,
      title: sceneNameDraft.trim() || item.title,
      prompt: scenePromptDraft.trim() || item.prompt,
      image: sceneImageDraft || item.image,
    }));

    void persistPlannerDoc(
      toStructuredPlannerDoc({
        ...plannerDoc,
        scenes: nextScenes,
      }),
      '场景图片已更新。',
    );
    closeSceneAdjustDialog();
  };

  const openShotInlineEditor = (actId: string, shotId: string) => {
    const act = displayScriptActs.find((item) => item.id === actId);
    const shot = act?.shots.find((item) => item.id === shotId);
    if (!shot) {
      return;
    }

    setEditingShot({ actId, shotId });
    setShotDraft({
      visual: shot.visual,
      composition: shot.composition,
      motion: shot.motion,
      voice: shot.voice,
      line: shot.line,
    });
  };

  const cancelShotInlineEditor = () => {
    setEditingShot(null);
    setShotDraft(null);
  };

  const applyShotInlineEditor = () => {
    if (!editingShot || !shotDraft) {
      return;
    }

    if (runtimeApi && runtimeActiveRefinement) {
      patchPlannerEntity(
        `/api/planner/projects/${encodeURIComponent(runtimeApi.projectId)}/shot-scripts/${encodeURIComponent(editingShot.shotId)}`,
        {
          episodeId: runtimeApi.episodeId,
          visualDescription: shotDraft.visual,
          composition: shotDraft.composition,
          cameraMotion: shotDraft.motion,
          voiceRole: shotDraft.voice,
          dialogue: shotDraft.line,
        },
      )
        .then(async () => {
          await refreshPlannerWorkspace();
          setNotice('分镜内容已更新。');
        })
        .catch((error: unknown) => {
          setNotice(error instanceof Error ? error.message : '分镜更新失败。');
        });
      cancelShotInlineEditor();
      return;
    }

    const nextActs = displayScriptActs.map((act) =>
      act.id !== editingShot.actId
        ? act
        : {
            ...act,
            shots: act.shots.map((shot) =>
              shot.id === editingShot.shotId
                ? {
                    ...shot,
                    ...shotDraft,
                  }
                : shot,
            ),
          },
    );

    updateShot(editingShot.actId, editingShot.shotId, (shot) => ({
      ...shot,
      ...shotDraft,
    }));

    void persistPlannerDoc(
      toStructuredPlannerDoc({
        ...plannerDoc,
        acts: nextActs,
      }),
      '分镜内容已更新。',
    );
    cancelShotInlineEditor();
  };

  const rerunSubjectAdjust = () => {
    if (!runtimeApi || !subjectDialogCardId) {
      return;
    }

    submitPartialRerunViaApi('subject_only', subjectDialogCardId, subjectPromptDraft.trim() || subjectNameDraft.trim())
      .then(async () => {
        await refreshPlannerWorkspace();
        closeSubjectAdjustDialog();
      })
      .catch((error: unknown) => {
        setPlannerSubmitting(false);
        setNotice(error instanceof Error ? error.message : '主体局部重写失败。');
      });
    setNotice('已提交主体局部重写任务。');
  };

  const generateSubjectImage = () => {
    if (!runtimeApi || !subjectDialogCardId) {
      return;
    }

    submitPlannerImageGenerationViaApi(
      'subject_image',
      `/api/planner/projects/${encodeURIComponent(runtimeApi.projectId)}/subjects/${encodeURIComponent(subjectDialogCardId)}/generate-image`,
      subjectPromptDraft.trim() || subjectNameDraft.trim(),
      subjectAssetDraftId ? [subjectAssetDraftId] : [],
    )
      .then(async () => {
        await refreshPlannerWorkspace();
        setSubjectImageDraft('');
      })
      .catch((error: unknown) => {
        setPlannerSubmitting(false);
        setNotice(error instanceof Error ? error.message : '主体图片生成失败。');
      });
    setNotice('已提交主体图片生成任务。');
  };

  const rerunSceneAdjust = () => {
    if (!runtimeApi || !sceneDialogCardId) {
      return;
    }

    submitPartialRerunViaApi('scene_only', sceneDialogCardId, scenePromptDraft.trim() || sceneNameDraft.trim())
      .then(async () => {
        await refreshPlannerWorkspace();
        closeSceneAdjustDialog();
      })
      .catch((error: unknown) => {
        setPlannerSubmitting(false);
        setNotice(error instanceof Error ? error.message : '场景局部重写失败。');
      });
    setNotice('已提交场景局部重写任务。');
  };

  const generateSceneImage = () => {
    if (!runtimeApi || !sceneDialogCardId) {
      return;
    }

    submitPlannerImageGenerationViaApi(
      'scene_image',
      `/api/planner/projects/${encodeURIComponent(runtimeApi.projectId)}/scenes/${encodeURIComponent(sceneDialogCardId)}/generate-image`,
      scenePromptDraft.trim() || sceneNameDraft.trim(),
      sceneAssetDraftId ? [sceneAssetDraftId] : [],
    )
      .then(async () => {
        await refreshPlannerWorkspace();
        setSceneImageDraft('');
      })
      .catch((error: unknown) => {
        setPlannerSubmitting(false);
        setNotice(error instanceof Error ? error.message : '场景图片生成失败。');
      });
    setNotice('已提交场景图片生成任务。');
  };

  const rerunShotAdjust = () => {
    if (!runtimeApi || !editingShot || !shotDraft) {
      return;
    }

    const shotPrompt = [shotDraft.visual, shotDraft.composition, shotDraft.motion, shotDraft.line].filter(Boolean).join('\n');
    submitPartialRerunViaApi('shots_only', editingShot.shotId, shotPrompt)
      .then(async () => {
        await refreshPlannerWorkspace();
        cancelShotInlineEditor();
      })
      .catch((error: unknown) => {
        setPlannerSubmitting(false);
        setNotice(error instanceof Error ? error.message : '分镜局部重写失败。');
      });
    setNotice('已提交分镜局部重写任务。');
  };

  const generateShotImage = () => {
    if (!runtimeApi || !editingShot || !shotDraft) {
      return;
    }

    const shotPrompt = [shotDraft.visual, shotDraft.composition, shotDraft.motion].filter(Boolean).join('\n');
    submitPlannerImageGenerationViaApi(
      'shot_image',
      `/api/planner/projects/${encodeURIComponent(runtimeApi.projectId)}/shot-scripts/${encodeURIComponent(editingShot.shotId)}/generate-image`,
      shotPrompt,
    )
      .then(async () => {
        await refreshPlannerWorkspace();
      })
      .catch((error: unknown) => {
        setPlannerSubmitting(false);
        setNotice(error instanceof Error ? error.message : '分镜草图生成失败。');
      });
    setNotice('已提交分镜草图生成任务。');
  };

  const openShotDeleteDialog = (actId: string, shotId: string) => {
    setShotDeleteDialog({ actId, shotId });
  };

  const closeShotDeleteDialog = () => {
    setShotDeleteDialog(null);
  };

  const confirmDeleteShot = () => {
    if (!shotDeleteDialog) {
      return;
    }

    if (runtimeApi && runtimeActiveRefinement) {
      deletePlannerEntity(
        `/api/planner/projects/${encodeURIComponent(runtimeApi.projectId)}/shot-scripts/${encodeURIComponent(shotDeleteDialog.shotId)}?episodeId=${encodeURIComponent(runtimeApi.episodeId)}`,
      )
        .then(async () => {
          await refreshPlannerWorkspace();
          setNotice('分镜已删除。');
        })
        .catch((error: unknown) => {
          setNotice(error instanceof Error ? error.message : '删除分镜失败。');
        });
      closeShotDeleteDialog();
      return;
    }

    if (editingShot?.actId === shotDeleteDialog.actId && editingShot.shotId === shotDeleteDialog.shotId) {
      cancelShotInlineEditor();
    }

    const nextActs = displayScriptActs
      .map((act) =>
        act.id !== shotDeleteDialog.actId
          ? act
          : {
              ...act,
              shots: act.shots.filter((shot) => shot.id !== shotDeleteDialog.shotId),
            },
      )
      .filter((act) => act.shots.length > 0);

    deleteShot(shotDeleteDialog.actId, shotDeleteDialog.shotId);
    void persistPlannerDoc(
      toStructuredPlannerDoc({
        ...plannerDoc,
        acts: nextActs,
      }),
      '分镜已删除。',
    );
    closeShotDeleteDialog();
  };

  const startCreation = () => {
    if (displayVersionStatus !== 'ready') {
      setNotice('请先完成剧情细化后再生成分镜。');
      return;
    }

    if (!displayScriptActs.some((act) => act.shots.length > 0)) {
      setNotice('当前还没有可生成的分镜草稿。');
      return;
    }

    if (remainingPoints < pointCost) {
      setNotice('积分不足，无法生成分镜。');
      return;
    }

    setBooting(true);
    setBootProgress(0);
    setRemainingPoints((current) => current - pointCost);

    BOOT_PROGRESS_STEPS.forEach((value, index) => {
      const timer = setTimeout(() => setBootProgress(value), index * 180);
      timersRef.current.push(timer);
    });

    const navigationTimer = setTimeout(() => {
      router.push(`/projects/${studio.project.id}/creation`);
    }, BOOT_PROGRESS_STEPS.length * 180 + 160);

    timersRef.current.push(navigationTimer);
  };

  return (
    <>
      <div className={styles.page}>
        <header className={styles.topBar}>
          <div className={styles.projectIdentity}>
            <span className={styles.projectTag}>策划页</span>
            <h1>{displayTitle}</h1>
            <p>{studio.project.brief}</p>
          </div>

          <div className={styles.topActions}>
            <span className={styles.modePill}>{plannerModeLabel(plannerMode)}</span>
            <button type="button" className={styles.topGhostButton} onClick={() => router.push('/explore')}>
              返回广场
            </button>
          </div>
        </header>

        <div className={styles.workspace}>
          <section className={styles.leftPanel}>
            <div className={cx(styles.leftPanelInner, plannerMode === 'single' && styles.leftPanelSingle)}>
              {plannerMode === 'series' ? (
                <aside className={styles.episodeRail}>
                  <h2>剧集</h2>
                  <div className={styles.episodeList}>
                    {plannerEpisodes.map((episode, index) => {
                      const active = episode.id === activeEpisodeId;

                      return (
                        <button
                          key={episode.id}
                          type="button"
                          className={cx(styles.episodeButton, active && styles.episodeButtonActive)}
                          onClick={() => {
                            setActiveEpisodeId(episode.id);
                          }}
                          aria-label={`切换到 ${episode.label}`}
                          title={`${episode.title} · ${episode.shotCount} 镜头`}
                        >
                          {String(index + 1).padStart(2, '0')}
                        </button>
                      );
                    })}
                  </div>
                </aside>
              ) : null}

              <div className={styles.commandColumn}>
                <div className={styles.messageScroll}>
                  {usingRuntimePlanner && messages.length > 0 ? (
                    messages.map((item) => {
                      const isUser = item.role === 'user';
                      const stepItems =
                        item.messageType === 'assistant_steps' && Array.isArray(item.rawContent?.steps)
                          ? item.rawContent.steps
                              .map((step) => (step && typeof step === 'object' && !Array.isArray(step) ? (step as Record<string, unknown>) : null))
                              .filter((step): step is Record<string, unknown> => step !== null)
                          : [];
                      const receiptTitle =
                        item.messageType === 'assistant_document_receipt' && typeof item.rawContent?.documentTitle === 'string'
                          ? item.rawContent.documentTitle
                          : runtimeActiveRefinement?.documentTitle ?? runtimeWorkspace?.activeOutline?.documentTitle;
                      const outlineDoc =
                        item.messageType === 'assistant_outline_card'
                        && item.rawContent?.outlineDoc
                        && typeof item.rawContent.outlineDoc === 'object'
                        && !Array.isArray(item.rawContent.outlineDoc)
                          ? (item.rawContent.outlineDoc as Record<string, unknown>)
                          : null;

                      if (item.messageType === 'assistant_steps') {
                        return (
                          <article key={item.id} className={styles.assistantThread}>
                            <header className={styles.messageAgentHeader}>
                              <span className={styles.messageAgentMark}>S</span>
                              <span>{SEKO_ASSISTANT_NAME}</span>
                            </header>

                            <article className={styles.docStepsCard}>
                              {stepItems.map((step, index) => {
                                const title = typeof step.title === 'string' ? step.title : `步骤 ${index + 1}`;
                                const status = typeof step.status === 'string' ? step.status : 'done';
                                const tags =
                                  Array.isArray(step.details)
                                    ? step.details.filter((detail): detail is string => typeof detail === 'string')
                                    : [];

                                return (
                                  <div key={`${item.id}-${title}-${index}`} className={styles.docStepItem}>
                                    <span
                                      className={cx(
                                        styles.docStepDot,
                                        status === 'done' && styles.docStepDotDone,
                                        status === 'running' && styles.docStepDotRunning,
                                      )}
                                    />
                                    {index < stepItems.length - 1 ? <span className={styles.docStepConnector} /> : null}
                                    <div className={styles.docStepBody}>
                                      <strong>{title}</strong>
                                      {tags.length ? (
                                        <div className={styles.docStepTags}>
                                          {tags.map((tag) => (
                                            <span key={`${item.id}-${title}-${tag}`} className={styles.docStepTag}>
                                              {tag}
                                            </span>
                                          ))}
                                        </div>
                                      ) : null}
                                    </div>
                                  </div>
                                );
                              })}
                            </article>
                          </article>
                        );
                      }

                      if (item.messageType === 'assistant_outline_card') {
                        const storyArc =
                          outlineDoc && Array.isArray(outlineDoc.storyArc)
                            ? outlineDoc.storyArc
                                .map((arc) => (arc && typeof arc === 'object' && !Array.isArray(arc) ? (arc as Record<string, unknown>) : null))
                                .filter((arc): arc is Record<string, unknown> => arc !== null)
                            : [];

                        return (
                          <article key={item.id} className={styles.assistantThread}>
                            <header className={styles.messageAgentHeader}>
                              <span className={styles.messageAgentMark}>S</span>
                              <span>{SEKO_ASSISTANT_NAME}</span>
                            </header>

                            <article className={styles.outlineCard}>
                              <h4>{typeof outlineDoc?.projectTitle === 'string' ? outlineDoc.projectTitle : '剧本大纲'}</h4>
                              <section className={styles.outlineSection}>
                                <h5>基础信息</h5>
                                <ul>
                                  {typeof outlineDoc?.genre === 'string' ? <li>{`题材风格：${outlineDoc.genre}`}</li> : null}
                                  {typeof outlineDoc?.format === 'string' ? <li>{`内容形态：${outlineDoc.format === 'series' ? '多剧集' : '单片'}`}</li> : null}
                                  {typeof outlineDoc?.episodeCount === 'number' ? <li>{`剧集篇幅：${outlineDoc.episodeCount} 集`}</li> : null}
                                  {typeof outlineDoc?.premise === 'string' ? <li>{`剧情简介：${outlineDoc.premise}`}</li> : null}
                                </ul>
                              </section>
                              {storyArc.length > 0 ? (
                                <section className={styles.outlineSection}>
                                  <h5>情节概要</h5>
                                  <ul>
                                    {storyArc.map((arc, index) => {
                                      const episodeNo = typeof arc.episodeNo === 'number' ? `第${arc.episodeNo}集` : `第${index + 1}集`;
                                      const title = typeof arc.title === 'string' ? arc.title : '未命名';
                                      const summary = typeof arc.summary === 'string' ? arc.summary : '';
                                      return <li key={`${item.id}-arc-${index}`}>{`${episodeNo} ${title}：${summary}`}</li>;
                                    })}
                                  </ul>
                                </section>
                              ) : null}
                            </article>
                          </article>
                        );
                      }

                      if (item.messageType === 'assistant_document_receipt') {
                        const diffSummary =
                          Array.isArray(item.rawContent?.diffSummary)
                            ? item.rawContent.diffSummary.filter((detail): detail is string => typeof detail === 'string' && detail.trim().length > 0)
                            : [];
                        return (
                          <article key={item.id} className={styles.assistantThread}>
                            <header className={styles.messageAgentHeader}>
                              <span className={styles.messageAgentMark}>S</span>
                              <span>{SEKO_ASSISTANT_NAME}</span>
                            </header>

                            <article className={styles.threadNoticeCard}>
                              <strong>{receiptTitle ? `已更新：${receiptTitle}` : '已更新右侧策划文档'}</strong>
                              <p>{item.content || '策划文档已同步完成，可继续追问或切换版本。'}</p>
                              {diffSummary.length > 0 ? (
                                <ul className={styles.threadNoticeList}>
                                  {diffSummary.map((detail) => (
                                    <li key={`${item.id}-${detail}`}>{detail}</li>
                                  ))}
                                </ul>
                              ) : null}
                              {runtimeActiveRefinement ? (
                                <p>{`当前版本：V${runtimeActiveRefinement.versionNumber} · ${runtimeActiveRefinement.subAgentProfile?.displayName ?? '未命名子 Agent'}`}</p>
                              ) : null}
                            </article>
                          </article>
                        );
                      }

                      return (
                        <article key={item.id} className={cx(styles.messageRow, isUser && styles.messageRowUser)}>
                          {!isUser ? <span className={styles.messageAuthor}>{SEKO_ASSISTANT_NAME}</span> : null}
                          <p className={cx(styles.messageBubble, isUser && styles.messageBubbleUser)}>{item.content}</p>
                        </article>
                      );
                    })
                  ) : (
                    <>
                      <article className={cx(styles.messageRow, styles.messageRowUser)}>
                        <p className={cx(styles.messageBubble, styles.messageBubbleUser)}>{requirement || sekoPlanThreadData.userPrompt}</p>
                      </article>

                      <article className={styles.assistantThread}>
                        <header className={styles.messageAgentHeader}>
                          <span className={styles.messageAgentMark}>S</span>
                          <span>{SEKO_ASSISTANT_NAME}</span>
                        </header>

                        <article className={styles.llmStepCard}>
                          <div className={styles.threadStepItem}>
                            <span className={styles.threadStepDot}>✓</span>
                            <strong>策划剧本大纲</strong>
                          </div>
                        </article>

                        <article className={styles.outlineCard}>
                          <h4>{sekoPlanThreadData.outlineTitle}</h4>
                          {sekoPlanThreadData.sections.map((section) => (
                            <section key={section.title} className={styles.outlineSection}>
                              <h5>{section.title}</h5>
                              <ul>
                                {section.lines.map((line, index) => (
                                  <li key={`${section.title}-${index}`}>{line}</li>
                                ))}
                              </ul>
                            </section>
                          ))}
                        </article>

                        <p className={styles.messageBubble}>{sekoPlanThreadData.assistantSummary}</p>
                        <p className={styles.messageBubble}>{sekoPlanThreadData.assistantPrompt}</p>
                        {serverPlannerText ? <p className={styles.messageBubble}>{serverPlannerText}</p> : null}

                        {!outlineConfirmed ? (
                          <article className={styles.threadNoticeCard}>
                            <strong>确认后自动开始细化剧情内容</strong>
                            <p>右侧文档会按步骤逐步渲染，支持后续局部微调与历史版本切换。</p>
                            <button type="button" className={styles.confirmOutlineButton} onClick={handleConfirmOutline} disabled={plannerSubmitting}>
                              确认大纲
                            </button>
                          </article>
                        ) : null}
                      </article>

                      {outlineConfirmed ? (
                        <article className={styles.assistantThread}>
                          <header className={styles.messageAgentHeader}>
                            <span className={styles.messageAgentMark}>S</span>
                            <span>{SEKO_ASSISTANT_NAME}</span>
                          </header>

                          <article className={styles.llmStepCard}>
                            <div className={styles.threadStepItem}>
                              <span className={styles.threadStepDot}>✓</span>
                              <strong>细化剧情内容</strong>
                            </div>
                          </article>

                          <p className={styles.messageBubble}>{sekoPlanThreadData.refinementReply}</p>

                          <article className={styles.docStepsCard}>
                            {refinementDetailSteps.map((step, index) => (
                              <div key={step.title} className={styles.docStepItem}>
                                <span className={cx(styles.docStepDot, step.status === 'done' && styles.docStepDotDone, step.status === 'running' && styles.docStepDotRunning)} />
                                {index < refinementDetailSteps.length - 1 ? <span className={styles.docStepConnector} /> : null}
                                <div className={styles.docStepBody}>
                                  <strong>{step.title}</strong>
                                  {step.tags.length ? (
                                    <div className={styles.docStepTags}>
                                      {step.tags.map((tag) => (
                                        <span key={`${step.title}-${tag}`} className={styles.docStepTag}>
                                          {tag}
                                        </span>
                                      ))}
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            ))}
                          </article>

                          {activeVersion ? (
                            <article className={styles.threadNoticeCard}>
                              <strong>{`当前版本：V${activeVersion.versionNumber}`}</strong>
                              <p>
                                {activeVersion.status === 'running'
                                  ? `细化进行中，进度 ${activeVersion.progressPercent}%。`
                                  : '当前版本已完成，可在右侧微调内容。'}
                              </p>
                            </article>
                          ) : null}
                        </article>
                      ) : null}

                      {messages.map((item) => {
                        const isUser = item.role === 'user';

                        return (
                          <article key={item.id} className={cx(styles.messageRow, isUser && styles.messageRowUser)}>
                            {!isUser ? <span className={styles.messageAuthor}>{studio.assistantName}</span> : null}
                            <p className={cx(styles.messageBubble, isUser && styles.messageBubbleUser)}>{item.content}</p>
                          </article>
                        );
                      })}
                    </>
                  )}
                </div>

                <div className={styles.composerWrap}>
                  <form
                    className={styles.composer}
                    onSubmit={(event) => {
                      event.preventDefault();
                      handleComposerSubmit();
                    }}
                  >
                    <textarea
                      className={styles.composerTextarea}
                      value={requirement}
                      onChange={(event) => setRequirement(event.target.value)}
                      placeholder={outlineConfirmed ? '输入补充要求，提交后生成新版本' : '输入你的反馈，点击提交开始细化'}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                          event.preventDefault();
                          handleComposerSubmit();
                        }
                      }}
                    />

                    <div className={styles.composerBottom}>
                      <span>按 Enter 提交，Shift+Enter 换行</span>
                      <button
                        type="submit"
                        className={styles.composerSubmitButton}
                        disabled={!requirement.trim() || plannerSubmitting}
                        aria-label={outlineConfirmed ? '提交并生成新版本' : '提交并开始细化'}
                        title={outlineConfirmed ? '提交' : '确认并提交'}
                      >
                        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                          <path d="M4.75 9.917 10 4.667m0 0 5.25 5.25M10 4.667v10.666" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                  </form>

                  {notice ? <p className={styles.notice}>{notice}</p> : null}
                </div>
              </div>
            </div>
          </section>

          <section className={styles.rightPanel}>
            <header className={styles.resultHeader}>
              <div className={styles.resultTitleWrap}>
                <h2>
                  第{Number.isNaN(activeEpisodeNumber) ? 1 : activeEpisodeNumber}集：{activeEpisode?.title ?? plannerDoc.episodeTitle}
                </h2>
                <p>内容由 AI 生成</p>
              </div>
              <div className={styles.resultHeaderActions}>
                {saveState.status !== 'idle' ? (
                  <div
                    className={cx(
                      styles.saveStatusBadge,
                      saveState.status === 'saving' && styles.saveStatusBadgeSaving,
                      saveState.status === 'saved' && styles.saveStatusBadgeSaved,
                      saveState.status === 'error' && styles.saveStatusBadgeError,
                    )}
                  >
                    <span className={styles.saveStatusDot} />
                    <span>{saveState.message}</span>
                  </div>
                ) : null}
                <PlannerHistoryMenu
                  open={historyMenuOpen}
                  versions={historyVersions}
                  activeVersionId={historyActiveVersionId}
                  onToggle={() => setHistoryMenuOpen((current) => !current)}
                  onSelect={async (versionId) => {
                    if (usingRuntimePlanner) {
                      try {
                        const isRefinementStage = Boolean(runtimeActiveRefinement);
                        const actionPath = isRefinementStage
                          ? `/api/planner/projects/${encodeURIComponent(runtimeApi!.projectId)}/refinement-versions/${encodeURIComponent(versionId)}/activate`
                          : `/api/planner/projects/${encodeURIComponent(runtimeApi!.projectId)}/outline-versions/${encodeURIComponent(versionId)}/activate`;
                        await postPlannerVersionAction(actionPath, runtimeApi!.episodeId);
                        await refreshPlannerWorkspace();
                      } catch (error) {
                        setNotice(error instanceof Error ? error.message : '切换策划版本失败。');
                      } finally {
                        setHistoryMenuOpen(false);
                      }
                      return;
                    }

                    selectVersion(versionId);
                    setHistoryMenuOpen(false);
                  }}
                />
              </div>
            </header>

            <div className={styles.resultContent}>
              <div className={styles.documentContainer}>
                {!hasDisplayVersion ? (
                  <article className={styles.emptyDocCard}>
                    <strong>等待细化产出</strong>
                    <p>确认左侧大纲后，将自动开始细化并逐步渲染主体、场景和分镜剧本。</p>
                  </article>
                ) : null}

                {!runtimeActiveRefinement && runtimeActiveOutline?.outlineDoc ? (
                  <PlannerOutlineView outline={runtimeActiveOutline.outlineDoc} />
                ) : null}

                {displayVersionStatus === 'running' ? (
                  <p className={styles.inlineProgressNotice}>
                    {displayVersionProgress === null ? '剧情细化中' : `剧情细化中 · ${displayVersionProgress}%`}
                  </p>
                ) : null}

                {runtimeActiveRefinement && displaySections.summary ? (
                  <section id="doc-summary" className={styles.docSection}>
                    <h3 className={styles.sectionTitle}>故事梗概</h3>
                    <ul>
                      {plannerDoc.summaryBullets.map((line, index) => (
                        <li key={`summary-${index}`}>{line}</li>
                      ))}
                    </ul>
                    <div className={styles.highlightCard}>
                      <strong>剧本亮点</strong>
                      <ul>
                        {plannerDoc.highlights.map((item) => (
                          <li key={item.title}>
                            <span>{item.title}</span>
                            {item.description}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </section>
                ) : null}

                {runtimeActiveRefinement && displaySections.style ? (
                  <section id="doc-style" className={styles.docSection}>
                    <h3 className={styles.sectionTitle}>美术风格</h3>
                    <ul>
                      {plannerDoc.styleBullets.map((line, index) => (
                        <li key={`style-${index}`}>{line}</li>
                      ))}
                    </ul>
                    <p className={styles.styleHint}>当前执行风格：{activeStyle.name} · {activeStyle.tone}</p>
                  </section>
                ) : null}

                {runtimeActiveRefinement && displaySections.subjects ? (
                  <section id="doc-subjects" className={styles.docSection}>
                    <h3 className={styles.sectionTitle}>主体列表</h3>
                    <ul>
                      {plannerDoc.subjectBullets.map((line, index) => (
                        <li key={`subject-line-${index}`}>{line}</li>
                      ))}
                    </ul>

                    <div className={styles.subjectStrip} style={mediaCardStyle}>
                      {displaySubjectCards.map((item) => (
                        <article key={item.id} className={styles.subjectCard} onClick={() => openSubjectAdjustDialog(item.id)} role="button" tabIndex={0}>
                          <button
                            type="button"
                            className={styles.cardHoverIconButton}
                            onClick={(event) => {
                              event.stopPropagation();
                              openSubjectAdjustDialog(item.id);
                            }}
                            aria-label={`调整 ${item.title}`}
                          >
                            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                              <path stroke="currentColor" strokeWidth="1.25" d="M14.049 4.354a1.147 1.147 0 0 1 1.621 0l.811.81a1.147 1.147 0 0 1 0 1.622L6.075 17.192a.46.46 0 0 1-.325.135H3.967a.46.46 0 0 1-.459-.459v-1.784c0-.121.048-.238.134-.324z" />
                              <path fill="currentColor" d="M14.049 4.354a1.147 1.147 0 0 1 1.621 0l.811.81a1.147 1.147 0 0 1 0 1.622l-2.108 2.108c-.18.18-.47.18-.649 0l-1.783-1.783a.46.46 0 0 1 0-.65z" />
                            </svg>
                          </button>
                          <img src={item.image} alt={item.prompt || item.title} loading="lazy" />
                          <div className={styles.subjectCardMeta}>
                            <strong>{item.title}</strong>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                ) : null}

                {runtimeActiveRefinement && displaySections.scenes ? (
                  <section id="doc-scenes" className={styles.docSection}>
                    <h3 className={styles.sectionTitle}>场景列表</h3>
                    <ul>
                      {plannerDoc.sceneBullets.map((line, index) => (
                        <li key={`scene-line-${index}`}>{line}</li>
                      ))}
                    </ul>

                    <div className={styles.sceneStrip} style={mediaCardStyle}>
                      {displaySceneCards.map((item) => (
                        <article key={item.id} className={styles.sceneThumbCard} onClick={() => openSceneAdjustDialog(item.id)} role="button" tabIndex={0}>
                          <button
                            type="button"
                            className={styles.cardHoverIconButton}
                            onClick={(event) => {
                              event.stopPropagation();
                              openSceneAdjustDialog(item.id);
                            }}
                            aria-label={`调整 ${item.title}`}
                          >
                            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                              <path stroke="currentColor" strokeWidth="1.25" d="M14.049 4.354a1.147 1.147 0 0 1 1.621 0l.811.81a1.147 1.147 0 0 1 0 1.622L6.075 17.192a.46.46 0 0 1-.325.135H3.967a.46.46 0 0 1-.459-.459v-1.784c0-.121.048-.238.134-.324z" />
                              <path fill="currentColor" d="M14.049 4.354a1.147 1.147 0 0 1 1.621 0l.811.81a1.147 1.147 0 0 1 0 1.622l-2.108 2.108c-.18.18-.47.18-.649 0l-1.783-1.783a.46.46 0 0 1 0-.65z" />
                            </svg>
                          </button>
                          <img src={item.image} alt={item.prompt || item.title} loading="lazy" />
                          <div className={styles.sceneCardMeta}>
                            <strong>{item.title}</strong>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                ) : null}

                {runtimeActiveRefinement && displaySections.script ? (
                  <section id="doc-script" className={styles.docSection}>
                    <h3 className={styles.sectionTitle}>分镜剧本</h3>

                    <div className={styles.scriptSummaryCard}>
                      <strong>剧本摘要</strong>
                      <ul>
                        {plannerDoc.scriptSummary.map((line, index) => (
                          <li key={`script-summary-${index}`}>{line}</li>
                        ))}
                        <li>总分镜数：{displayScriptActs.reduce((sum, act) => sum + act.shots.length, 0)}</li>
                      </ul>
                    </div>

                    <div className={styles.actStack}>
                      {displayScriptActs.map((act, actIndex) => (
                        <section key={act.id} className={styles.actSection}>
                          <header className={styles.actHeader}>
                            <strong>
                              {act.title}：{displaySceneCards[actIndex]?.title ?? `场景 ${actIndex + 1}`}
                            </strong>
                            <span>
                              {act.time || '夜晚'} · {act.location || '室外'}
                            </span>
                          </header>

                          <div className={styles.scriptList}>
                            {act.shots.map((shot) => {
                              const isEditingShot = editingShot?.actId === act.id && editingShot?.shotId === shot.id;

                              return (
                                <article key={shot.id} className={cx(styles.scriptCard, styles.scriptShotCard, isEditingShot && styles.scriptShotCardEditing)}>
                                  {shot.image ? (
                                    <div className={styles.shotPreviewImageWrap}>
                                      <img src={shot.image} alt={`${shot.title} 草图`} className={styles.shotPreviewImage} />
                                    </div>
                                  ) : null}
                                  <p className={styles.shotTitleLine}>
                                    <span>{shot.title}</span>
                                  </p>
                                  <ul className={styles.shotPreviewList}>
                                    <li>
                                      <span>画面描述</span>
                                      {isEditingShot && shotDraft ? (
                                        <textarea
                                          className={styles.shotInlineTextarea}
                                          value={shotDraft.visual}
                                          onChange={(event) => setShotDraft((current) => (current ? { ...current, visual: event.target.value } : current))}
                                        />
                                      ) : (
                                        <p className={styles.shotValueText}>{shot.visual}</p>
                                      )}
                                    </li>
                                    <li>
                                      <span>构图设计</span>
                                      {isEditingShot && shotDraft ? (
                                        <textarea
                                          className={styles.shotInlineTextarea}
                                          value={shotDraft.composition}
                                          onChange={(event) => setShotDraft((current) => (current ? { ...current, composition: event.target.value } : current))}
                                        />
                                      ) : (
                                        <p className={styles.shotValueText}>{shot.composition}</p>
                                      )}
                                    </li>
                                    <li>
                                      <span>运镜调度</span>
                                      {isEditingShot && shotDraft ? (
                                        <textarea
                                          className={styles.shotInlineTextarea}
                                          value={shotDraft.motion}
                                          onChange={(event) => setShotDraft((current) => (current ? { ...current, motion: event.target.value } : current))}
                                        />
                                      ) : (
                                        <p className={styles.shotValueText}>{shot.motion}</p>
                                      )}
                                    </li>
                                    <li>
                                      <span>配音角色</span>
                                      <p className={styles.shotValueText}>{shot.voice}</p>
                                    </li>
                                    <li>
                                      <span>台词内容</span>
                                      {isEditingShot && shotDraft ? (
                                        <textarea
                                          className={styles.shotInlineTextarea}
                                          value={shotDraft.line}
                                          onChange={(event) => setShotDraft((current) => (current ? { ...current, line: event.target.value } : current))}
                                        />
                                      ) : (
                                        <p className={styles.shotValueText}>{shot.line}</p>
                                      )}
                                    </li>
                                  </ul>

                                  <div className={cx(styles.shotActionButtons, isEditingShot && styles.shotActionButtonsEditing)}>
                                    {isEditingShot ? (
                                      <>
                                        {runtimeApi ? (
                                          <button type="button" className={styles.shotRerunButton} onClick={rerunShotAdjust}>
                                            AI重写
                                          </button>
                                        ) : null}
                                        {runtimeApi ? (
                                          <button type="button" className={styles.shotSketchButton} onClick={generateShotImage}>
                                            生成草图
                                          </button>
                                        ) : null}
                                        <button type="button" className={styles.shotCancelButton} onClick={cancelShotInlineEditor}>
                                          取消
                                        </button>
                                        <button type="button" className={styles.shotSaveButton} onClick={applyShotInlineEditor}>
                                          保存
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button type="button" className={styles.shotIconButton} onClick={() => openShotDeleteDialog(act.id, shot.id)} aria-label={`删除 ${shot.title}`}>
                                          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                                            <path
                                              fill="currentColor"
                                              d="M3.196 3.73a.68.68 0 1 0 0 1.362V3.73M16.41 5.092a.68.68 0 1 0 0-1.362v1.362M9.216 6.667a.68.68 0 1 0-1.362 0h1.361M7.854 13.91a.68.68 0 1 0 1.362 0H7.855m4.473-7.244a.68.68 0 1 0-1.362 0h1.361m-1.362 7.244a.68.68 0 1 0 1.362 0h-1.361m-5.794-9.5h-.68l-.002 11.45h.68l.681.001.002-11.45zm.665 12.118v.68h8.319v-1.361H5.836zm8.985-.667h.68V4.412h-1.36v11.45zM7.294 3.195v.681h5.017V2.515H7.294zm1.241 3.472h-.68v7.244h1.36V6.667zm3.111 0h-.68v7.244h1.36V6.667zM3.196 4.41v.681H6.96V3.73H3.196zM6.96 3.53h-.68v.882H7.64V3.53zm0 .882v.681h5.685V3.73H6.96zm5.685 0v.681h3.764V3.73h-3.764zm0-.882h-.681v.882h1.361V3.53zm-.334-.334v.681a.347.347 0 0 1-.347-.347h1.361c0-.56-.454-1.014-1.014-1.014zm1.844 13.334v.68c.744 0 1.347-.603 1.347-1.347H14.14v-.002l.002-.004q0-.003.003-.004l.004-.003h.003l.002-.001zM7.294 3.195v-.68c-.56 0-1.015.454-1.015 1.014h1.362a.347.347 0 0 1-.347.347zM5.169 15.862h-.68c0 .744.603 1.347 1.347 1.347v-1.361h.002l.004.001.004.003.003.004.001.006z"
                                            />
                                          </svg>
                                        </button>
                                        <button type="button" className={styles.shotIconButton} onClick={() => openShotInlineEditor(act.id, shot.id)} aria-label={`编辑 ${shot.title}`}>
                                          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                                            <path stroke="currentColor" strokeWidth="1.25" d="M14.049 4.354a1.147 1.147 0 0 1 1.621 0l.811.81a1.147 1.147 0 0 1 0 1.622L6.075 17.192a.46.46 0 0 1-.325.135H3.967a.46.46 0 0 1-.459-.459v-1.784c0-.121.048-.238.134-.324z" />
                                            <path fill="currentColor" d="M14.049 4.354a1.147 1.147 0 0 1 1.621 0l.811.81a1.147 1.147 0 0 1 0 1.622l-2.108 2.108c-.18.18-.47.18-.649 0l-1.783-1.783a.46.46 0 0 1 0-.65z" />
                                          </svg>
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </article>
                              );
                            })}
                          </div>
                        </section>
                      ))}
                    </div>
                  </section>
                ) : null}
              </div>

              <aside className={styles.tocRail} aria-label="文档目录">
                <ul className={styles.tocMiniList}>
                  {DOC_TOC.map((item, index) => (
                    <li key={`mini-${item.id}`}>
                      <a href={`#${item.id}`} className={cx(styles.tocMiniItem, index === 0 && styles.tocMiniItemActive)} aria-label={item.title}>
                        <span className={styles.tocMiniLine} />
                      </a>
                    </li>
                  ))}
                </ul>

                <nav className={styles.tocPopover}>
                  {DOC_TOC.map((item, index) => (
                    <a key={item.id} href={`#${item.id}`} className={cx(styles.tocItem, index === 0 && styles.tocItemActive)}>
                      <span className={styles.tocLine} />
                      <span className={styles.tocText}>{item.title}</span>
                    </a>
                  ))}
                </nav>
              </aside>
            </div>

            <footer className={styles.resultFooter}>
              <div className={styles.footerSelectors}>
                <label>
                  <span>分镜图模型</span>
                  <select value={storyboardModelId} onChange={(event) => setStoryboardModelId(event.target.value)}>
                    {STORYBOARD_MODEL_OPTIONS.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>画面比例</span>
                  <select value={aspectRatio} onChange={(event) => setAspectRatio(event.target.value as PlannerAssetRatio)}>
                    {ASPECT_RATIO_OPTIONS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <button type="button" className={styles.generateButton} onClick={startCreation} disabled={!runtimeActiveRefinement}>
                {runtimeActiveRefinement ? `生成分镜 · ${pointCost}` : '确认大纲后可生成分镜'}
              </button>
            </footer>
          </section>
        </div>
      </div>

      {subjectDialogCardId && activeSubjectCard ? (
        <div className={styles.assetModalBackdrop} role="presentation" onClick={closeSubjectAdjustDialog}>
          <section className={styles.assetModal} role="dialog" aria-modal="true" aria-label="编辑主体" onClick={(event) => event.stopPropagation()}>
            <header className={styles.assetModalHeader}>
              <h3>编辑主体</h3>
              <button type="button" className={styles.assetModalClose} onClick={closeSubjectAdjustDialog} aria-label="关闭">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="m6 6 12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </header>

            <div className={styles.assetModalBody}>
              <div className={styles.assetPreviewPane}>
                <img src={subjectImageDraft || activeSubjectCard.image} alt={activeSubjectCard.title} />
                <div className={styles.assetThumbRow}>
                  {subjectAssetThumbs.map((image) => (
                    <button
                      key={image.key}
                      type="button"
                      className={cx(
                        styles.assetThumbButton,
                        image.assetId
                          ? subjectAssetDraftId === image.assetId && styles.assetThumbButtonActive
                          : !subjectAssetDraftId && (subjectImageDraft || activeSubjectCard.image) === image.image && styles.assetThumbButtonActive,
                      )}
                      onClick={() => {
                        setSubjectImageDraft(image.image);
                        setSubjectAssetDraftId(image.assetId);
                      }}
                      title={image.label}
                    >
                      <img src={image.image} alt={image.label} />
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.assetFormPane}>
                <label className={styles.assetField}>
                  <span>名称</span>
                  <input value={subjectNameDraft} onChange={(event) => setSubjectNameDraft(event.target.value)} disabled />
                </label>

                <div className={styles.assetField}>
                  <span>类别</span>
                  <div className={styles.assetSegmentDisabled}>
                    <span className={styles.assetSegmentActive}>角色</span>
                    <span>场景</span>
                  </div>
                </div>

                <div className={styles.assetField}>
                  <span>音色</span>
                  <div className={styles.assetToneCard}>
                    <strong>{SUBJECT_TONE_LABEL}</strong>
                    <small>{SUBJECT_TONE_META}</small>
                  </div>
                </div>

                <div className={styles.assetField}>
                  <span>形象</span>
                  <div className={styles.assetModeSwitch}>
                    <button type="button" className={cx(styles.assetModeButton, subjectAdjustMode === 'upload' && styles.assetModeButtonActive)} onClick={() => setSubjectAdjustMode('upload')}>
                      本地上传
                    </button>
                    <button type="button" className={cx(styles.assetModeButton, subjectAdjustMode === 'ai' && styles.assetModeButtonActive)} onClick={() => setSubjectAdjustMode('ai')}>
                      AI生成
                    </button>
                  </div>
                  <div className={styles.assetPromptBox}>
                    <textarea
                      value={subjectPromptDraft}
                      placeholder="输入你的主体描述，点击发送即可生成图片"
                      onChange={(event) => setSubjectPromptDraft(event.target.value)}
                    />
                    <button
                      type="button"
                      className={styles.assetPromptSend}
                      onClick={generateSubjectImage}
                      aria-label="根据描述生成图片"
                      disabled={!runtimeApi || !subjectPromptDraft.trim() || plannerSubmitting}
                    >
                      <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path d="M4.5 7.427 8 4.072m0 0 3.5 3.355M8 4.072v7.855" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                  {subjectAdjustMode === 'upload' ? (
                    <div className={styles.assetUploadBox}>
                      <input
                        ref={subjectUploadInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className={styles.assetUploadInput}
                        onChange={(event) => {
                          const file = event.target.files?.[0] ?? null;
                          void handleSubjectUpload(file);
                        }}
                      />
                      <button
                        type="button"
                        className={styles.assetUploadButton}
                        onClick={() => subjectUploadInputRef.current?.click()}
                        disabled={!runtimeApi || assetUploadPending === 'subject'}
                      >
                        {assetUploadPending === 'subject' ? '上传中...' : '选择本地图片'}
                      </button>
                      <p className={styles.assetUploadHint}>支持 png / jpeg / webp，上传后会进入项目素材并自动绑定到当前主体。</p>
                    </div>
                  ) : null}
                </div>

                <footer className={styles.assetModalFooter}>
                  <span>{activeSubjectAssetLabel}</span>
                  <div className={styles.assetModalActions}>
                    {runtimeApi ? (
                      <button type="button" className={styles.assetSecondaryButton} onClick={rerunSubjectAdjust}>
                        AI重写设定
                      </button>
                    ) : null}
                    <button type="button" className={styles.assetGhostButton} onClick={closeSubjectAdjustDialog}>
                      取消
                    </button>
                    <button type="button" className={styles.assetPrimaryButton} onClick={applySubjectAdjust}>
                      应用
                    </button>
                  </div>
                </footer>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {sceneDialogCardId && activeSceneCard ? (
        <div className={styles.assetModalBackdrop} role="presentation" onClick={closeSceneAdjustDialog}>
          <section className={styles.assetModal} role="dialog" aria-modal="true" aria-label="编辑场景" onClick={(event) => event.stopPropagation()}>
            <header className={styles.assetModalHeader}>
              <h3>编辑场景</h3>
              <button type="button" className={styles.assetModalClose} onClick={closeSceneAdjustDialog} aria-label="关闭">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="m6 6 12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </header>

            <div className={styles.assetModalBody}>
              <div className={styles.assetPreviewPane}>
                <img src={sceneImageDraft || activeSceneCard.image} alt={activeSceneCard.title} />
                <div className={styles.assetThumbRow}>
                  {sceneAssetThumbs.map((image) => (
                    <button
                      key={image.key}
                      type="button"
                      className={cx(
                        styles.assetThumbButton,
                        image.assetId
                          ? sceneAssetDraftId === image.assetId && styles.assetThumbButtonActive
                          : !sceneAssetDraftId && (sceneImageDraft || activeSceneCard.image) === image.image && styles.assetThumbButtonActive,
                      )}
                      onClick={() => {
                        setSceneImageDraft(image.image);
                        setSceneAssetDraftId(image.assetId);
                      }}
                      title={image.label}
                    >
                      <img src={image.image} alt={image.label} />
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.assetFormPane}>
                <label className={styles.assetField}>
                  <span>名称</span>
                  <input value={sceneNameDraft} onChange={(event) => setSceneNameDraft(event.target.value)} disabled />
                </label>

                <div className={styles.assetField}>
                  <span>类别</span>
                  <div className={styles.assetSegmentDisabled}>
                    <span>角色</span>
                    <span className={styles.assetSegmentActive}>场景</span>
                  </div>
                </div>

                <div className={styles.assetField}>
                  <span>场景</span>
                  <div className={styles.assetModeSwitch}>
                    <button type="button" className={cx(styles.assetModeButton, sceneAdjustMode === 'upload' && styles.assetModeButtonActive)} onClick={() => setSceneAdjustMode('upload')}>
                      本地上传
                    </button>
                    <button type="button" className={cx(styles.assetModeButton, sceneAdjustMode === 'ai' && styles.assetModeButtonActive)} onClick={() => setSceneAdjustMode('ai')}>
                      AI生成
                    </button>
                  </div>
                  <div className={styles.assetPromptBox}>
                    <textarea
                      value={scenePromptDraft}
                      placeholder="输入你的场景描述，点击发送即可生成图片"
                      onChange={(event) => setScenePromptDraft(event.target.value)}
                    />
                    <button
                      type="button"
                      className={styles.assetPromptSend}
                      onClick={generateSceneImage}
                      aria-label="根据描述生成图片"
                      disabled={!runtimeApi || !scenePromptDraft.trim() || plannerSubmitting}
                    >
                      <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path d="M4.5 7.427 8 4.072m0 0 3.5 3.355M8 4.072v7.855" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                  {sceneAdjustMode === 'upload' ? (
                    <div className={styles.assetUploadBox}>
                      <input
                        ref={sceneUploadInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className={styles.assetUploadInput}
                        onChange={(event) => {
                          const file = event.target.files?.[0] ?? null;
                          void handleSceneUpload(file);
                        }}
                      />
                      <button
                        type="button"
                        className={styles.assetUploadButton}
                        onClick={() => sceneUploadInputRef.current?.click()}
                        disabled={!runtimeApi || assetUploadPending === 'scene'}
                      >
                        {assetUploadPending === 'scene' ? '上传中...' : '选择本地图片'}
                      </button>
                      <p className={styles.assetUploadHint}>支持 png / jpeg / webp，上传后会进入项目素材并自动绑定到当前场景。</p>
                    </div>
                  ) : null}
                </div>

                <footer className={styles.assetModalFooter}>
                  <span>{activeSceneAssetLabel}</span>
                  <div className={styles.assetModalActions}>
                    {runtimeApi ? (
                      <button type="button" className={styles.assetSecondaryButton} onClick={rerunSceneAdjust}>
                        AI重写设定
                      </button>
                    ) : null}
                    <button type="button" className={styles.assetGhostButton} onClick={closeSceneAdjustDialog}>
                      取消
                    </button>
                    <button type="button" className={styles.assetPrimaryButton} onClick={applySceneAdjust}>
                      应用
                    </button>
                  </div>
                </footer>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      <Dialog
        open={Boolean(shotDeleteDialog && deletingShot)}
        title="确认删除分镜"
        description="删除此分镜后将无法恢复，确认要删除吗？"
        onClose={closeShotDeleteDialog}
        footer={
          <>
            <button type="button" className={styles.dialogGhostButton} onClick={closeShotDeleteDialog}>
              取消
            </button>
            <button type="button" className={styles.dialogPrimaryButton} onClick={confirmDeleteShot}>
              确定
            </button>
          </>
        }
      >
        <p className={styles.deleteShotHint}>分镜：{deletingShot?.title ?? '未命名分镜'}</p>
      </Dialog>

      <Dialog open={booting} title="正在进入分片生成" description="正在提交任务并切换到 Creation 工作区。" onClose={() => undefined}>
        <div className={styles.bootCard}>
          <div className={styles.bootValue}>{bootProgress}%</div>
          <div className={styles.progressTrack}>
            <span className={styles.progressFill} style={{ width: `${bootProgress}%` }} />
          </div>
          <p>提交分镜任务中，请稍候...</p>
          <p>剩余积分：{remainingPoints}</p>
        </div>
      </Dialog>
    </>
  );
}
