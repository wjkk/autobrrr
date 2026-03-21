'use client';

import type { ApiPlannerAssetOption, PlannerRuntimeApiContext } from '../lib/planner-api';
import type { PlannerNoticeInput } from '../lib/planner-notice';
import type { PlannerStructuredDoc } from '../lib/planner-structured-doc';
import type { SekoImageCard, SekoPlanData } from '@aiv/mock-data';

export type EntityKind = 'subject' | 'scene';
export type EntityImageScope = 'subject_image' | 'scene_image';
export type EntityAdjustMode = 'upload' | 'ai';

export interface PlannerEntityDraftConfig {
  dialogCardId: string | null;
  nameDraft: string;
  promptDraft: string;
  imageDraft: string;
  assetDraftId: string | null;
  setPromptDraft: (value: string) => void;
  setImageDraft: (value: string) => void;
  setAssetDraftId: (value: string | null) => void;
  setAdjustMode: (value: EntityAdjustMode) => void;
  closeDialog: () => void;
}

export interface PlannerEntityRuntimeConfig {
  activeRuntimeEntity: {
    generatedAssets?: Array<{ id: string }>;
    referenceAssets?: Array<{ id: string }>;
  } | null;
  displayCards: SekoImageCard[];
  updateEntity: (entityId: string, updater: (item: SekoImageCard) => SekoImageCard) => void;
}

export interface PlannerEntityCommonConfig {
  runtimeApi?: PlannerRuntimeApiContext;
  runtimeActiveRefinementId: string | null;
  plannerDoc: SekoPlanData;
  structuredPlannerDoc: PlannerStructuredDoc | null;
  ensureEditableRuntimeRefinement: () => Promise<unknown>;
  refreshPlannerWorkspace: () => Promise<unknown>;
  submitPartialRerunViaApi: (rerunScope: { type: 'subject'; subjectId: string } | { type: 'scene'; sceneId: string }, instruction: string) => Promise<boolean>;
  submitPlannerImageGenerationViaApi: (
    scope: EntityImageScope,
    targetPath: string,
    prompt: string,
    referenceAssetIds?: string[],
  ) => Promise<boolean>;
  persistPlannerDoc: (nextDoc: PlannerStructuredDoc, successMessage: string) => Promise<void>;
  setPlannerImageAssets: (updater: (current: ApiPlannerAssetOption[]) => ApiPlannerAssetOption[]) => void;
  setAssetUploadPending: (value: 'subject' | 'scene' | null) => void;
  setPlannerSubmitting: (value: boolean) => void;
  setNotice: (message: PlannerNoticeInput) => void;
}

export interface PlannerEntityBehaviorConfig {
  kind: EntityKind;
  imageScope: EntityImageScope;
  entityPath: 'subjects' | 'scenes';
  uploadPendingKey: 'subject' | 'scene';
  recommendationFailureMessage: string;
  uploadSuccessMessage: string;
  uploadFailureMessage: string;
  updateSuccessMessage: string;
  updateFailureMessage: string;
  persistSuccessMessage: string;
  rerunSuccessMessage: string;
  rerunFailureMessage: string;
  imageSuccessMessage: string;
  imageFailureMessage: string;
  buildPatchBody: (args: { name: string; prompt: string }) => Record<string, unknown>;
  buildRerunScope: (entityId: string) => { type: 'subject'; subjectId: string } | { type: 'scene'; sceneId: string };
  updateDoc: (doc: SekoPlanData, cards: SekoImageCard[]) => SekoPlanData;
}
