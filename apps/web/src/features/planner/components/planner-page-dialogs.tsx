'use client';

import type { UsePlannerPageStateResult } from '../hooks/use-planner-page-state';
import { SUBJECT_TONE_LABEL, SUBJECT_TONE_META } from '../lib/planner-page-helpers';
import { PlannerAssetDialog } from './planner-asset-dialog';
import { PlannerCreationBootDialog } from './planner-creation-boot-dialog';
import { PlannerDeleteShotDialog } from './planner-delete-shot-dialog';
import styles from './planner-page.module.css';

interface PlannerPageDialogsProps {
  dialogs: UsePlannerPageStateResult['dialogs'];
}

export function PlannerPageDialogs({ dialogs }: PlannerPageDialogsProps) {
  return (
    <>
      <PlannerAssetDialog
        open={Boolean(dialogs.subjectDialogCardId && dialogs.activeSubjectCard)}
        dialogTitle="编辑主体"
        previewAlt={dialogs.activeSubjectCard?.title ?? '主体'}
        previewImage={dialogs.subjectImageDraft || dialogs.activeSubjectCard?.image || ''}
        cardName={dialogs.subjectNameDraft}
        categoryLabel="角色"
        categoryMode="subject"
        promptLabel="形象"
        promptPlaceholder="输入你的主体描述，点击发送即可生成图片"
        promptValue={dialogs.subjectPromptDraft}
        promptMode={dialogs.subjectAdjustMode}
        promptSendAriaLabel="根据描述生成图片"
        plannerSubmitting={dialogs.plannerSubmitting}
        runtimeEnabled={dialogs.runtimeEnabled}
        selectedAssetLabel={dialogs.activeSubjectAssetLabel}
        thumbs={dialogs.subjectAssetThumbs}
        selectedAssetId={dialogs.subjectAssetDraftId}
        selectedImage={dialogs.subjectImageDraft || dialogs.activeSubjectCard?.image || ''}
        recommendations={dialogs.subjectRecommendations}
        recommendationsLoading={dialogs.subjectRecommendationsLoading}
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
              ref={dialogs.subjectUploadInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className={styles.assetUploadInput}
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                void dialogs.handleSubjectUpload(file);
              }}
            />
            <button
              type="button"
              className={styles.assetUploadButton}
              onClick={() => dialogs.subjectUploadInputRef.current?.click()}
              disabled={!dialogs.runtimeEnabled || dialogs.assetUploadPending === 'subject'}
            >
              {dialogs.assetUploadPending === 'subject' ? '上传中...' : '选择本地图片'}
            </button>
            <p className={styles.assetUploadHint}>支持 png / jpeg / webp，上传后会进入项目素材并自动绑定到当前主体。</p>
          </div>
        )}
        onClose={dialogs.closeSubjectAdjustDialog}
        onSelectThumb={(thumb) => {
          dialogs.setSubjectImageDraft(thumb.image);
          dialogs.setSubjectAssetDraftId(thumb.assetId);
        }}
        onPromptChange={dialogs.setSubjectPromptDraft}
        onPromptModeChange={dialogs.setSubjectAdjustMode}
        onApplyRecommendation={dialogs.applySubjectRecommendation}
        onGenerate={() => void dialogs.generateSubjectImage()}
        onRerun={() => void dialogs.rerunSubjectAdjust()}
        onApply={() => void dialogs.applySubjectAdjust()}
      />

      <PlannerAssetDialog
        open={Boolean(dialogs.sceneDialogCardId && dialogs.activeSceneCard)}
        dialogTitle="编辑场景"
        previewAlt={dialogs.activeSceneCard?.title ?? '场景'}
        previewImage={dialogs.sceneImageDraft || dialogs.activeSceneCard?.image || ''}
        cardName={dialogs.sceneNameDraft}
        categoryLabel="场景"
        categoryMode="scene"
        promptLabel="场景"
        promptPlaceholder="输入你的场景描述，点击发送即可生成图片"
        promptValue={dialogs.scenePromptDraft}
        promptMode={dialogs.sceneAdjustMode}
        promptSendAriaLabel="根据描述生成图片"
        plannerSubmitting={dialogs.plannerSubmitting}
        runtimeEnabled={dialogs.runtimeEnabled}
        selectedAssetLabel={dialogs.activeSceneAssetLabel}
        thumbs={dialogs.sceneAssetThumbs}
        selectedAssetId={dialogs.sceneAssetDraftId}
        selectedImage={dialogs.sceneImageDraft || dialogs.activeSceneCard?.image || ''}
        recommendations={dialogs.sceneRecommendations}
        recommendationsLoading={dialogs.sceneRecommendationsLoading}
        uploadSlot={(
          <div className={styles.assetUploadBox}>
            <input
              ref={dialogs.sceneUploadInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className={styles.assetUploadInput}
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                void dialogs.handleSceneUpload(file);
              }}
            />
            <button
              type="button"
              className={styles.assetUploadButton}
              onClick={() => dialogs.sceneUploadInputRef.current?.click()}
              disabled={!dialogs.runtimeEnabled || dialogs.assetUploadPending === 'scene'}
            >
              {dialogs.assetUploadPending === 'scene' ? '上传中...' : '选择本地图片'}
            </button>
            <p className={styles.assetUploadHint}>支持 png / jpeg / webp，上传后会进入项目素材并自动绑定到当前场景。</p>
          </div>
        )}
        onClose={dialogs.closeSceneAdjustDialog}
        onSelectThumb={(thumb) => {
          dialogs.setSceneImageDraft(thumb.image);
          dialogs.setSceneAssetDraftId(thumb.assetId);
        }}
        onPromptChange={dialogs.setScenePromptDraft}
        onPromptModeChange={dialogs.setSceneAdjustMode}
        onApplyRecommendation={dialogs.applySceneRecommendation}
        onGenerate={() => void dialogs.generateSceneImage()}
        onRerun={() => void dialogs.rerunSceneAdjust()}
        onApply={() => void dialogs.applySceneAdjust()}
      />

      <PlannerDeleteShotDialog
        open={Boolean(dialogs.shotDeleteDialog && dialogs.deletingShot)}
        shotTitle={dialogs.deletingShot?.title ?? null}
        onClose={dialogs.closeShotDeleteDialog}
        onConfirm={() => void dialogs.confirmDeleteShot()}
      />

      <PlannerCreationBootDialog
        open={dialogs.booting}
        progress={dialogs.bootProgress}
        remainingPoints={dialogs.remainingPoints}
      />
    </>
  );
}
