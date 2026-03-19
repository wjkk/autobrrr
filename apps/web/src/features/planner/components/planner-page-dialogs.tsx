'use client';

import { usePlannerPageContext } from '../lib/planner-page-context';
import { SUBJECT_TONE_LABEL, SUBJECT_TONE_META } from '../lib/planner-page-helpers';
import { PlannerAssetDialog } from './planner-asset-dialog';
import { PlannerCreationBootDialog } from './planner-creation-boot-dialog';
import { PlannerDeleteShotDialog } from './planner-delete-shot-dialog';
import styles from './planner-page.module.css';

export function PlannerPageDialogs() {
  const state = usePlannerPageContext();

  return (
    <>
      <PlannerAssetDialog
        open={Boolean(state.subjectDialogCardId && state.activeSubjectCard)}
        dialogTitle="编辑主体"
        previewAlt={state.activeSubjectCard?.title ?? '主体'}
        previewImage={state.subjectImageDraft || state.activeSubjectCard?.image || ''}
        cardName={state.subjectNameDraft}
        categoryLabel="角色"
        categoryMode="subject"
        promptLabel="形象"
        promptPlaceholder="输入你的主体描述，点击发送即可生成图片"
        promptValue={state.subjectPromptDraft}
        promptMode={state.subjectAdjustMode}
        promptSendAriaLabel="根据描述生成图片"
        plannerSubmitting={state.plannerSubmitting}
        runtimeEnabled={Boolean(state.runtimeApi)}
        selectedAssetLabel={state.activeSubjectAssetLabel}
        thumbs={state.subjectAssetThumbs}
        selectedAssetId={state.subjectAssetDraftId}
        selectedImage={state.subjectImageDraft || state.activeSubjectCard?.image || ''}
        recommendations={state.subjectRecommendations}
        recommendationsLoading={state.subjectRecommendationsLoading}
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
              ref={state.subjectUploadInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className={styles.assetUploadInput}
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                void state.handleSubjectUpload(file);
              }}
            />
            <button
              type="button"
              className={styles.assetUploadButton}
              onClick={() => state.subjectUploadInputRef.current?.click()}
              disabled={!state.runtimeApi || state.assetUploadPending === 'subject'}
            >
              {state.assetUploadPending === 'subject' ? '上传中...' : '选择本地图片'}
            </button>
            <p className={styles.assetUploadHint}>支持 png / jpeg / webp，上传后会进入项目素材并自动绑定到当前主体。</p>
          </div>
        )}
        onClose={state.closeSubjectAdjustDialog}
        onSelectThumb={(thumb) => {
          state.setSubjectImageDraft(thumb.image);
          state.setSubjectAssetDraftId(thumb.assetId);
        }}
        onPromptChange={state.setSubjectPromptDraft}
        onPromptModeChange={state.setSubjectAdjustMode}
        onApplyRecommendation={state.applySubjectRecommendation}
        onGenerate={() => void state.generateSubjectImage()}
        onRerun={() => void state.rerunSubjectAdjust()}
        onApply={() => void state.applySubjectAdjust()}
      />

      <PlannerAssetDialog
        open={Boolean(state.sceneDialogCardId && state.activeSceneCard)}
        dialogTitle="编辑场景"
        previewAlt={state.activeSceneCard?.title ?? '场景'}
        previewImage={state.sceneImageDraft || state.activeSceneCard?.image || ''}
        cardName={state.sceneNameDraft}
        categoryLabel="场景"
        categoryMode="scene"
        promptLabel="场景"
        promptPlaceholder="输入你的场景描述，点击发送即可生成图片"
        promptValue={state.scenePromptDraft}
        promptMode={state.sceneAdjustMode}
        promptSendAriaLabel="根据描述生成图片"
        plannerSubmitting={state.plannerSubmitting}
        runtimeEnabled={Boolean(state.runtimeApi)}
        selectedAssetLabel={state.activeSceneAssetLabel}
        thumbs={state.sceneAssetThumbs}
        selectedAssetId={state.sceneAssetDraftId}
        selectedImage={state.sceneImageDraft || state.activeSceneCard?.image || ''}
        recommendations={state.sceneRecommendations}
        recommendationsLoading={state.sceneRecommendationsLoading}
        uploadSlot={(
          <div className={styles.assetUploadBox}>
            <input
              ref={state.sceneUploadInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className={styles.assetUploadInput}
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                void state.handleSceneUpload(file);
              }}
            />
            <button
              type="button"
              className={styles.assetUploadButton}
              onClick={() => state.sceneUploadInputRef.current?.click()}
              disabled={!state.runtimeApi || state.assetUploadPending === 'scene'}
            >
              {state.assetUploadPending === 'scene' ? '上传中...' : '选择本地图片'}
            </button>
            <p className={styles.assetUploadHint}>支持 png / jpeg / webp，上传后会进入项目素材并自动绑定到当前场景。</p>
          </div>
        )}
        onClose={state.closeSceneAdjustDialog}
        onSelectThumb={(thumb) => {
          state.setSceneImageDraft(thumb.image);
          state.setSceneAssetDraftId(thumb.assetId);
        }}
        onPromptChange={state.setScenePromptDraft}
        onPromptModeChange={state.setSceneAdjustMode}
        onApplyRecommendation={state.applySceneRecommendation}
        onGenerate={() => void state.generateSceneImage()}
        onRerun={() => void state.rerunSceneAdjust()}
        onApply={() => void state.applySceneAdjust()}
      />

      <PlannerDeleteShotDialog
        open={Boolean(state.shotDeleteDialog && state.deletingShot)}
        shotTitle={state.deletingShot?.title ?? null}
        onClose={state.closeShotDeleteDialog}
        onConfirm={() => void state.confirmDeleteShot()}
      />

      <PlannerCreationBootDialog
        open={state.booting}
        progress={state.bootProgress}
        remainingPoints={state.remainingPoints}
      />
    </>
  );
}
