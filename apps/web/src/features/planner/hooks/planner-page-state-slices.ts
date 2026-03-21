import type { CSSProperties, Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { PlannerStepStatus } from '@aiv/domain';

import type {
  ApiPlannerDebugApplySource,
  ApiPlannerEntityRecommendation,
  ApiPlannerShotPromptPreview,
  ApiPlannerWorkspace,
} from '../lib/planner-api';
import type { PlannerPageData } from '../lib/planner-page-data';
import type {
  PlannerAssetRatio,
  PlannerAssetThumbCandidate,
  PlannerEpisodeDraft,
  PlannerHistoryVersionView,
} from '../lib/planner-page-helpers';
import type { PlannerNotice } from '../lib/planner-notice';
import type { PlannerSaveState } from './use-planner-document-persistence';
import type { PlannerMode } from '../lib/planner-page-helpers';
import type { PlannerRefinementVersion } from './use-planner-refinement';
import type { PlannerShotDraftState, PlannerShotPointer } from '../lib/planner-shot-editor';
import type { PlannerThreadMessage } from '../lib/planner-thread';
import type { SekoActDraft, SekoImageCard, SekoPlanData } from '@aiv/mock-data';

type PlannerRefinementDetailStep = {
  title: string;
  status: PlannerStepStatus;
  tags: string[];
};

export interface PlannerShellState {
  plannerMode: PlannerMode;
  displayTitle: string;
  brief: string;
  runtimeEnabled: boolean;
  openAgentDebug: () => void;
  backToExplore: () => void;
  activeEpisodeId: string;
  setActiveEpisodeId: Dispatch<SetStateAction<string>>;
  plannerEpisodes: PlannerEpisodeDraft[];
  activeEpisodeNumber: number;
  activeEpisodeTitle: string;
  fallbackEpisodeTitle: string;
  saveState: PlannerSaveState;
  latestExecutionMode: 'live' | 'fallback' | null;
  activeDebugApplySource: ApiPlannerDebugApplySource | null;
  historyMenuOpen: boolean;
  historyVersions: PlannerHistoryVersionView[];
  historyActiveVersionId: string | null;
  openDebugRun: (debugRunId: string) => void;
  toggleHistoryMenu: () => void;
  handleSelectHistoryVersion: (versionId: string) => Promise<void>;
}

export interface PlannerThreadState {
  studio: PlannerPageData;
  usingRuntimePlanner: boolean;
  messages: PlannerThreadMessage[];
  requirement: string;
  setRequirement: Dispatch<SetStateAction<string>>;
  outlineConfirmed: boolean;
  runtimeActiveOutline: ApiPlannerWorkspace['activeOutline'];
  runtimeActiveRefinement: ApiPlannerWorkspace['activeRefinement'];
  plannerSubmitting: boolean;
  serverPlannerText: string;
  refinementDetailSteps: PlannerRefinementDetailStep[];
  activeVersion: PlannerRefinementVersion | null;
  activeDebugApplySource: ApiPlannerDebugApplySource | null;
  notice: PlannerNotice | null;
  openDebugRun: (debugRunId: string) => void;
  handleComposerSubmit: () => void;
  handleConfirmOutline: () => void;
}

export interface PlannerDocumentState {
  hasDisplayVersion: boolean;
  runtimeActiveOutline: ApiPlannerWorkspace['activeOutline'];
  runtimeActiveRefinement: ApiPlannerWorkspace['activeRefinement'];
  displayVersionStatus: string | null;
  displayVersionProgress: number | null;
  displaySections: Record<string, boolean>;
  plannerDoc: SekoPlanData;
  activeStyle: { name: string; tone: string };
  mediaCardStyle: CSSProperties;
  displaySubjectCards: SekoImageCard[];
  openSubjectAdjustDialog: (subjectId: string) => void;
  displaySceneCards: SekoImageCard[];
  openSceneAdjustDialog: (sceneId: string) => void;
  displayScriptActs: SekoActDraft[];
  plannerSubmitting: boolean;
  runtimeEnabled: boolean;
  editingShot: PlannerShotPointer | null;
  shotDraft: PlannerShotDraftState | null;
  openShotInlineEditor: (actId: string, shotId: string) => void;
  openShotDeleteDialog: (actId: string, shotId: string) => void;
  rerunActAdjust: (actId: string) => Promise<void>;
  setShotDraft: Dispatch<SetStateAction<PlannerShotDraftState | null>>;
  rerunShotAdjust: () => Promise<void>;
  generateShotImage: () => Promise<void>;
  cancelShotInlineEditor: () => void;
  applyShotInlineEditor: () => Promise<void>;
  shotPromptPreview: ApiPlannerShotPromptPreview | null;
  shotPromptPreviewLoading: boolean;
  shotPromptPreviewError: string | null;
  selectedStoryboardModel: { name: string; hint?: string | null } | null;
  storyboardModelId: string;
  setStoryboardModelId: Dispatch<SetStateAction<string>>;
  aspectRatio: PlannerAssetRatio;
  setAspectRatio: Dispatch<SetStateAction<PlannerAssetRatio>>;
  startCreation: () => Promise<void>;
  creationActionLabel: string;
  creationActionDisabled: boolean;
  shotTitleById: Record<string, string>;
}

export interface PlannerDialogState {
  plannerSubmitting: boolean;
  runtimeEnabled: boolean;
  assetUploadPending: 'subject' | 'scene' | null;
  booting: boolean;
  bootProgress: number;
  remainingPoints: number;
  subjectDialogCardId: string | null;
  activeSubjectCard: SekoImageCard | null;
  subjectImageDraft: string;
  subjectNameDraft: string;
  subjectPromptDraft: string;
  subjectAdjustMode: 'upload' | 'ai';
  activeSubjectAssetLabel: string;
  subjectAssetThumbs: PlannerAssetThumbCandidate[];
  subjectAssetDraftId: string | null;
  subjectRecommendations: ApiPlannerEntityRecommendation[];
  subjectRecommendationsLoading: boolean;
  subjectUploadInputRef: MutableRefObject<HTMLInputElement | null>;
  closeSubjectAdjustDialog: () => void;
  setSubjectImageDraft: Dispatch<SetStateAction<string>>;
  setSubjectAssetDraftId: Dispatch<SetStateAction<string | null>>;
  setSubjectPromptDraft: Dispatch<SetStateAction<string>>;
  setSubjectAdjustMode: Dispatch<SetStateAction<'upload' | 'ai'>>;
  applySubjectRecommendation: (recommendation: ApiPlannerEntityRecommendation) => void;
  generateSubjectImage: () => Promise<void>;
  rerunSubjectAdjust: () => Promise<void>;
  applySubjectAdjust: () => Promise<void>;
  handleSubjectUpload: (file: File | null) => Promise<void>;
  sceneDialogCardId: string | null;
  activeSceneCard: SekoImageCard | null;
  sceneImageDraft: string;
  sceneNameDraft: string;
  scenePromptDraft: string;
  sceneAdjustMode: 'upload' | 'ai';
  activeSceneAssetLabel: string;
  sceneAssetThumbs: PlannerAssetThumbCandidate[];
  sceneAssetDraftId: string | null;
  sceneRecommendations: ApiPlannerEntityRecommendation[];
  sceneRecommendationsLoading: boolean;
  sceneUploadInputRef: MutableRefObject<HTMLInputElement | null>;
  closeSceneAdjustDialog: () => void;
  setSceneImageDraft: Dispatch<SetStateAction<string>>;
  setSceneAssetDraftId: Dispatch<SetStateAction<string | null>>;
  setScenePromptDraft: Dispatch<SetStateAction<string>>;
  setSceneAdjustMode: Dispatch<SetStateAction<'upload' | 'ai'>>;
  applySceneRecommendation: (recommendation: ApiPlannerEntityRecommendation) => void;
  generateSceneImage: () => Promise<void>;
  rerunSceneAdjust: () => Promise<void>;
  applySceneAdjust: () => Promise<void>;
  handleSceneUpload: (file: File | null) => Promise<void>;
  shotDeleteDialog: PlannerShotPointer | null;
  deletingShot: SekoActDraft['shots'][number] | null;
  closeShotDeleteDialog: () => void;
  confirmDeleteShot: () => Promise<void>;
}

export function buildPlannerShellState(args: PlannerShellState) {
  return args;
}

export function buildPlannerThreadState(args: PlannerThreadState) {
  return args;
}

export function buildPlannerDocumentState(args: PlannerDocumentState) {
  return args;
}

export function buildPlannerDialogState(args: PlannerDialogState) {
  return args;
}
