'use client';

import type { RefObject } from 'react';

import { SUBJECT_TONE_LABEL, SUBJECT_TONE_META } from '../lib/planner-page-helpers';
import { PlannerAssetDialog } from './planner-asset-dialog';
import { PlannerCreationBootDialog } from './planner-creation-boot-dialog';
import { PlannerDeleteShotDialog } from './planner-delete-shot-dialog';
import styles from './planner-page.module.css';

interface DialogThumb {
  key: string;
  image: string;
  assetId: string | null;
  label: string;
}

interface PlannerPageDialogsProps {
  runtimeEnabled: boolean;
  plannerSubmitting: boolean;
  assetUploadPending: 'subject' | 'scene' | null;
  booting: boolean;
  bootProgress: number;
  remainingPoints: number;
  subjectOpen: boolean;
  subjectTitle: string | null;
  subjectImage: string;
  subjectNameDraft: string;
  subjectPromptDraft: string;
  subjectAdjustMode: 'upload' | 'ai';
  subjectAssetLabel: string;
  subjectThumbs: DialogThumb[];
  subjectAssetDraftId: string | null;
  subjectUploadInputRef: RefObject<HTMLInputElement | null>;
  onSubjectClose: () => void;
  onSubjectSelectThumb: (thumb: DialogThumb) => void;
  onSubjectPromptChange: (value: string) => void;
  onSubjectPromptModeChange: (value: 'upload' | 'ai') => void;
  onSubjectGenerate: () => void;
  onSubjectRerun: () => void;
  onSubjectApply: () => void;
  onSubjectUpload: (file: File | null) => void;
  sceneOpen: boolean;
  sceneTitle: string | null;
  sceneImage: string;
  sceneNameDraft: string;
  scenePromptDraft: string;
  sceneAdjustMode: 'upload' | 'ai';
  sceneAssetLabel: string;
  sceneThumbs: DialogThumb[];
  sceneAssetDraftId: string | null;
  sceneUploadInputRef: RefObject<HTMLInputElement | null>;
  onSceneClose: () => void;
  onSceneSelectThumb: (thumb: DialogThumb) => void;
  onScenePromptChange: (value: string) => void;
  onScenePromptModeChange: (value: 'upload' | 'ai') => void;
  onSceneGenerate: () => void;
  onSceneRerun: () => void;
  onSceneApply: () => void;
  onSceneUpload: (file: File | null) => void;
  shotDeleteOpen: boolean;
  shotDeleteTitle: string | null;
  onShotDeleteClose: () => void;
  onShotDeleteConfirm: () => void;
}

export function PlannerPageDialogs(props: PlannerPageDialogsProps) {
  return (
    <>
      <PlannerAssetDialog
        open={props.subjectOpen}
        dialogTitle="编辑主体"
        previewAlt={props.subjectTitle ?? '主体'}
        previewImage={props.subjectImage}
        cardName={props.subjectNameDraft}
        categoryLabel="角色"
        categoryMode="subject"
        promptLabel="形象"
        promptPlaceholder="输入你的主体描述，点击发送即可生成图片"
        promptValue={props.subjectPromptDraft}
        promptMode={props.subjectAdjustMode}
        promptSendAriaLabel="根据描述生成图片"
        plannerSubmitting={props.plannerSubmitting}
        runtimeEnabled={props.runtimeEnabled}
        selectedAssetLabel={props.subjectAssetLabel}
        thumbs={props.subjectThumbs}
        selectedAssetId={props.subjectAssetDraftId}
        selectedImage={props.subjectImage}
        extraField={(
          <div className={styles.assetField}>
            <span>音色</span>
            <div className={styles.assetToneCard}>
              <strong>{SUBJECT_TONE_LABEL}</strong>
              <small>{SUBJECT_TONE_META}</small>
            </div>
          </div>
        )}
        uploadSlot={(
          <div className={styles.assetUploadBox}>
            <input
              ref={props.subjectUploadInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className={styles.assetUploadInput}
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                props.onSubjectUpload(file);
              }}
            />
            <button
              type="button"
              className={styles.assetUploadButton}
              onClick={() => props.subjectUploadInputRef.current?.click()}
              disabled={!props.runtimeEnabled || props.assetUploadPending === 'subject'}
            >
              {props.assetUploadPending === 'subject' ? '上传中...' : '选择本地图片'}
            </button>
            <p className={styles.assetUploadHint}>支持 png / jpeg / webp，上传后会进入项目素材并自动绑定到当前主体。</p>
          </div>
        )}
        onClose={props.onSubjectClose}
        onSelectThumb={props.onSubjectSelectThumb}
        onPromptChange={props.onSubjectPromptChange}
        onPromptModeChange={props.onSubjectPromptModeChange}
        onGenerate={props.onSubjectGenerate}
        onRerun={props.onSubjectRerun}
        onApply={props.onSubjectApply}
      />

      <PlannerAssetDialog
        open={props.sceneOpen}
        dialogTitle="编辑场景"
        previewAlt={props.sceneTitle ?? '场景'}
        previewImage={props.sceneImage}
        cardName={props.sceneNameDraft}
        categoryLabel="场景"
        categoryMode="scene"
        promptLabel="场景"
        promptPlaceholder="输入你的场景描述，点击发送即可生成图片"
        promptValue={props.scenePromptDraft}
        promptMode={props.sceneAdjustMode}
        promptSendAriaLabel="根据描述生成图片"
        plannerSubmitting={props.plannerSubmitting}
        runtimeEnabled={props.runtimeEnabled}
        selectedAssetLabel={props.sceneAssetLabel}
        thumbs={props.sceneThumbs}
        selectedAssetId={props.sceneAssetDraftId}
        selectedImage={props.sceneImage}
        uploadSlot={(
          <div className={styles.assetUploadBox}>
            <input
              ref={props.sceneUploadInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className={styles.assetUploadInput}
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                props.onSceneUpload(file);
              }}
            />
            <button
              type="button"
              className={styles.assetUploadButton}
              onClick={() => props.sceneUploadInputRef.current?.click()}
              disabled={!props.runtimeEnabled || props.assetUploadPending === 'scene'}
            >
              {props.assetUploadPending === 'scene' ? '上传中...' : '选择本地图片'}
            </button>
            <p className={styles.assetUploadHint}>支持 png / jpeg / webp，上传后会进入项目素材并自动绑定到当前场景。</p>
          </div>
        )}
        onClose={props.onSceneClose}
        onSelectThumb={props.onSceneSelectThumb}
        onPromptChange={props.onScenePromptChange}
        onPromptModeChange={props.onScenePromptModeChange}
        onGenerate={props.onSceneGenerate}
        onRerun={props.onSceneRerun}
        onApply={props.onSceneApply}
      />

      <PlannerDeleteShotDialog
        open={props.shotDeleteOpen}
        shotTitle={props.shotDeleteTitle}
        onClose={props.onShotDeleteClose}
        onConfirm={props.onShotDeleteConfirm}
      />

      <PlannerCreationBootDialog
        open={props.booting}
        progress={props.bootProgress}
        remainingPoints={props.remainingPoints}
      />
    </>
  );
}
