import type { CSSProperties, Dispatch, MutableRefObject, SetStateAction } from 'react';

import type {
  ApiPlannerDebugApplySource,
  ApiPlannerEntityRecommendation,
  ApiPlannerShotPromptPreview,
} from '../lib/planner-api';
import type { PlannerPageData } from '../lib/planner-page-data';
import type { PlannerAssetRatio, PlannerEpisodeDraft, PlannerHistoryVersionView } from '../lib/planner-page-helpers';
import type { PlannerNotice } from '../lib/planner-notice';
import type { PlannerSaveState } from './use-planner-document-persistence';
import type { PlannerMode } from '../lib/planner-page-helpers';
import type { PlannerThreadMessage } from '../lib/planner-thread';

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
  runtimeActiveOutline: any;
  runtimeActiveRefinement: any;
  plannerSubmitting: boolean;
  serverPlannerText: string;
  refinementDetailSteps: any[];
  activeVersion: any;
  activeDebugApplySource: ApiPlannerDebugApplySource | null;
  notice: PlannerNotice | null;
  openDebugRun: (debugRunId: string) => void;
  handleComposerSubmit: () => void;
  handleConfirmOutline: () => void;
}

export interface PlannerDocumentState {
  hasDisplayVersion: boolean;
  runtimeActiveOutline: any;
  runtimeActiveRefinement: any;
  displayVersionStatus: string | null;
  displayVersionProgress: number | null;
  displaySections: Record<string, boolean>;
  plannerDoc: any;
  activeStyle: { name: string; tone: string };
  mediaCardStyle: CSSProperties;
  displaySubjectCards: any[];
  openSubjectAdjustDialog: (subjectId: string) => void;
  displaySceneCards: any[];
  openSceneAdjustDialog: (sceneId: string) => void;
  displayScriptActs: any[];
  plannerSubmitting: boolean;
  runtimeEnabled: boolean;
  editingShot: any;
  shotDraft: any;
  openShotInlineEditor: (...args: any[]) => void;
  openShotDeleteDialog: (...args: any[]) => void;
  rerunActAdjust: (actId: string) => Promise<void>;
  setShotDraft: Dispatch<SetStateAction<any>>;
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
  activeSubjectCard: any;
  subjectImageDraft: string;
  subjectNameDraft: string;
  subjectPromptDraft: string;
  subjectAdjustMode: 'upload' | 'ai';
  activeSubjectAssetLabel: string;
  subjectAssetThumbs: any[];
  subjectAssetDraftId: string | null;
  subjectRecommendations: ApiPlannerEntityRecommendation[];
  subjectRecommendationsLoading: boolean;
  subjectUploadInputRef: MutableRefObject<HTMLInputElement | null>;
  closeSubjectAdjustDialog: () => void;
  setSubjectImageDraft: Dispatch<SetStateAction<string>>;
  setSubjectAssetDraftId: Dispatch<SetStateAction<string | null>>;
  setSubjectPromptDraft: Dispatch<SetStateAction<string>>;
  setSubjectAdjustMode: Dispatch<SetStateAction<any>>;
  applySubjectRecommendation: (recommendation: ApiPlannerEntityRecommendation) => void;
  generateSubjectImage: () => Promise<void>;
  rerunSubjectAdjust: () => Promise<void>;
  applySubjectAdjust: () => Promise<void>;
  handleSubjectUpload: (file: File | null) => Promise<void>;
  sceneDialogCardId: string | null;
  activeSceneCard: any;
  sceneImageDraft: string;
  sceneNameDraft: string;
  scenePromptDraft: string;
  sceneAdjustMode: 'upload' | 'ai';
  activeSceneAssetLabel: string;
  sceneAssetThumbs: any[];
  sceneAssetDraftId: string | null;
  sceneRecommendations: ApiPlannerEntityRecommendation[];
  sceneRecommendationsLoading: boolean;
  sceneUploadInputRef: MutableRefObject<HTMLInputElement | null>;
  closeSceneAdjustDialog: () => void;
  setSceneImageDraft: Dispatch<SetStateAction<string>>;
  setSceneAssetDraftId: Dispatch<SetStateAction<string | null>>;
  setScenePromptDraft: Dispatch<SetStateAction<string>>;
  setSceneAdjustMode: Dispatch<SetStateAction<any>>;
  applySceneRecommendation: (recommendation: ApiPlannerEntityRecommendation) => void;
  generateSceneImage: () => Promise<void>;
  rerunSceneAdjust: () => Promise<void>;
  applySceneAdjust: () => Promise<void>;
  handleSceneUpload: (file: File | null) => Promise<void>;
  shotDeleteDialog: any;
  deletingShot: any;
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
