'use client';

import { cx } from '@aiv/ui';
import type { ChangeEvent, FormEvent, RefObject } from 'react';

import type { CreationWorkspaceController } from '../lib/use-creation-workspace';
import type { ComposerMode } from './creation-visual-sidebar-helpers';
import { getDurationLabel, IMAGE_PROMPT_ASSIST_OPTIONS } from './creation-visual-sidebar-helpers';
import { CreationIcon, type CreationIconName } from './creation-icons';
import styles from './creation-visual-sidebar.module.css';

interface CreationVisualSidebarComposerProps {
  controller: CreationWorkspaceController;
  composerMode: ComposerMode;
  composerText: string;
  composerPlaceholder: string;
  composerModeLabel: string;
  composerModeIcon: CreationIconName;
  isImageComposer: boolean;
  canSubmitComposer: boolean;
  composerCost: number;
  settingsOpen: boolean;
  modeMenuOpen: boolean;
  tailFrameMenuOpen: boolean;
  imageModelMenuOpen: boolean;
  imageReferenceMenuOpen: boolean;
  promptAssistMenuOpen: boolean;
  tailFramePreviewUrl: string;
  sourceImageUrl: string;
  imageResultUrl: string;
  nextShotFrameUrl: string;
  visibleHistoryWorks: Array<{ id: string; title: string; durationLabel: string }>;
  modeMenuRef: RefObject<HTMLDivElement | null>;
  settingsRef: RefObject<HTMLDivElement | null>;
  tailFrameMenuRef: RefObject<HTMLDivElement | null>;
  imageModelMenuRef: RefObject<HTMLDivElement | null>;
  imageReferenceMenuRef: RefObject<HTMLDivElement | null>;
  promptAssistMenuRef: RefObject<HTMLDivElement | null>;
  tailFrameUploadRef: RefObject<HTMLInputElement | null>;
  imageReferenceUploadRef: RefObject<HTMLInputElement | null>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onComposerTextChange: (value: string) => void;
  onSwitchComposerMode: (nextMode: ComposerMode) => void;
  onRevealVideoThread: () => void;
  onToggleModeMenu: () => void;
  onToggleSettings: () => void;
  onToggleTailFrameMenu: () => void;
  onToggleImageModelMenu: () => void;
  onToggleImageReferenceMenu: () => void;
  onTogglePromptAssistMenu: () => void;
  onHandleTailFrameUpload: () => void;
  onGenerateTailFrame: () => void;
  onUseNextShotAsTailFrame: () => void;
  onHandleTailFrameFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onApplyImageModel: (modelId: string, category?: 'auto' | 'detail' | 'reference') => void;
  onHandleImageReferenceUpload: () => void;
  onHandleImageReferenceFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onApplyPromptAssist: (suffix: string) => void;
}

export function CreationVisualSidebarComposer(props: CreationVisualSidebarComposerProps) {
  const {
    controller,
    composerMode,
    composerText,
    composerPlaceholder,
    composerModeLabel,
    composerModeIcon,
    isImageComposer,
    canSubmitComposer,
    composerCost,
    settingsOpen,
    modeMenuOpen,
    tailFrameMenuOpen,
    imageModelMenuOpen,
    imageReferenceMenuOpen,
    promptAssistMenuOpen,
    tailFramePreviewUrl,
    sourceImageUrl,
    imageResultUrl,
    nextShotFrameUrl,
    visibleHistoryWorks,
    modeMenuRef,
    settingsRef,
    tailFrameMenuRef,
    imageModelMenuRef,
    imageReferenceMenuRef,
    promptAssistMenuRef,
    tailFrameUploadRef,
    imageReferenceUploadRef,
    onSubmit,
    onComposerTextChange,
    onSwitchComposerMode,
    onRevealVideoThread,
    onToggleModeMenu,
    onToggleSettings,
    onToggleTailFrameMenu,
    onToggleImageModelMenu,
    onToggleImageReferenceMenu,
    onTogglePromptAssistMenu,
    onHandleTailFrameUpload,
    onGenerateTailFrame,
    onUseNextShotAsTailFrame,
    onHandleTailFrameFileChange,
    onApplyImageModel,
    onHandleImageReferenceUpload,
    onHandleImageReferenceFileChange,
    onApplyPromptAssist,
  } = props;

  const { activeShot, generateDraft, modelPickerDraft, activeMaterial } = controller;
  if (!activeShot) {
    return null;
  }

  return (
    <form className={styles.composerForm} onSubmit={onSubmit}>
      {composerMode !== 'image' ? (
        <div className={styles.composerDeck}>
          <div className={styles.frameCardShell}>
            <div className={styles.frameThumbStatic} aria-hidden="true">
              {sourceImageUrl ? (
                <img className={styles.sourceThumbImage} src={sourceImageUrl} alt={activeShot.title} />
              ) : (
                <span className={styles.sourceThumbPlaceholder}>首帧</span>
              )}
            </div>
          </div>

          {composerMode === 'video' ? (
            <div className={styles.frameCardShell}>
              <button type="button" className={styles.tailFrameCard} onClick={onToggleTailFrameMenu} aria-label="选择尾帧">
                {tailFramePreviewUrl ? (
                  <img className={styles.tailFramePreview} src={tailFramePreviewUrl} alt="尾帧预览" />
                ) : (
                  <>
                    <span className={styles.tailFramePlus}>+</span>
                    <span className={styles.tailFrameLabel}>尾帧</span>
                  </>
                )}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <textarea className={styles.textarea} placeholder={composerPlaceholder} value={composerText} onChange={(event) => onComposerTextChange(event.target.value)} />

      {modeMenuOpen ? (
        <div className={styles.modeMenu} ref={modeMenuRef}>
          <button type="button" className={cx(styles.modeMenuItem, composerMode === 'image' && styles.modeMenuItemActive)} onClick={() => onSwitchComposerMode('image')}>
            <CreationIcon name="image" className={styles.smallIcon} />
            <span>图片生成</span>
            {composerMode === 'image' ? <span className={styles.menuCheck}>✓</span> : null}
          </button>
          <button type="button" className={cx(styles.modeMenuItem, composerMode === 'edit' && styles.modeMenuItemActive)} onClick={() => onSwitchComposerMode('edit')}>
            <CreationIcon name="magic" className={styles.smallIcon} />
            <span>对话改图</span>
            {composerMode === 'edit' ? <span className={styles.menuCheck}>✓</span> : null}
          </button>
          <button type="button" className={cx(styles.modeMenuItem, composerMode === 'video' && styles.modeMenuItemActive)} onClick={onRevealVideoThread}>
            <CreationIcon name="video" className={styles.smallIcon} />
            <span>视频生成</span>
            {composerMode === 'video' ? <span className={styles.menuCheck}>✓</span> : null}
          </button>
        </div>
      ) : null}

      {settingsOpen && composerMode === 'video' ? (
        <div className={styles.settingsPanel} ref={settingsRef}>
          <div className={styles.settingRow}>
            <span>分辨率</span>
            <div className={styles.segmentedGroup}>
              {(['720P', '1080P'] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  className={cx(styles.segmentedButton, generateDraft.resolution === item && styles.segmentedButtonActive)}
                  onClick={() => controller.setGenerateDraft({ ...generateDraft, resolution: item })}
                >
                  <span>{item}</span>
                  {item === '1080P' ? <span className={styles.crown}>♛</span> : null}
                </button>
              ))}
            </div>
          </div>
          <button type="button" className={styles.settingRow} onClick={() => controller.openModelPicker('video')}>
            <span>选用模型</span>
            <span className={styles.settingValue}>
              {controller.resolveModelDisplayName(generateDraft.model)}
              <CreationIcon name="chevron" className={styles.smallIcon} />
            </span>
          </button>
          <button
            type="button"
            className={styles.settingRow}
            onClick={() => controller.setGenerateDraft({ ...generateDraft, durationMode: generateDraft.durationMode === '智能' ? '4s' : generateDraft.durationMode === '4s' ? '6s' : '智能' })}
          >
            <span>视频时长</span>
            <span className={styles.settingValue}>
              {getDurationLabel(generateDraft.durationMode)}
              <CreationIcon name="chevron" className={styles.smallIcon} />
            </span>
          </button>
          <div className={styles.settingRow}>
            <span>裁剪至配音时长</span>
            <button
              type="button"
              className={cx(styles.switch, generateDraft.cropToVoice && styles.switchActive)}
              aria-pressed={generateDraft.cropToVoice}
              onClick={() => controller.setGenerateDraft({ ...generateDraft, cropToVoice: !generateDraft.cropToVoice })}
            />
          </div>
        </div>
      ) : null}

      {tailFrameMenuOpen && composerMode === 'video' ? (
        <div className={styles.tailFrameMenu} ref={tailFrameMenuRef}>
          <button type="button" className={styles.tailFrameMenuItem} onClick={onHandleTailFrameUpload}>
            上传尾帧
          </button>
          <button type="button" className={styles.tailFrameMenuItem} onClick={onGenerateTailFrame}>
            生成图片
          </button>
          <button type="button" className={styles.tailFrameMenuItem} onClick={onUseNextShotAsTailFrame} disabled={!nextShotFrameUrl}>
            使用下一分镜首帧图
          </button>
        </div>
      ) : null}

      {imageModelMenuOpen && composerMode === 'image' ? (
        <div className={cx(styles.inlinePanel, styles.modelPanel)} ref={imageModelMenuRef}>
          <div className={styles.inlinePanelHeader}>选择模型</div>
          <div className={styles.inlinePanelList}>
            {(controller.availableModelOptions.length ? controller.availableModelOptions.filter((item) => item.modelKind === 'image') : []).map((item) => (
              <button key={item.id} type="button" className={cx(styles.inlinePanelItem, modelPickerDraft.selectedModel === item.id && styles.inlinePanelItemActive)} onClick={() => onApplyImageModel(item.id)}>
                <span className={styles.inlinePanelItemTitle}>{item.title}</span>
                <span className={styles.inlinePanelItemMeta}>{item.description}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {imageReferenceMenuOpen && composerMode === 'image' ? (
        <div className={cx(styles.inlinePanel, styles.referencePanel)} ref={imageReferenceMenuRef}>
          <div className={styles.inlinePanelHeader}>引用与素材</div>
          <div className={styles.inlineActionRow}>
            <button type="button" className={styles.inlineActionChip} onClick={onHandleImageReferenceUpload}>
              上传图片
            </button>
            {imageResultUrl ? (
              <button
                type="button"
                className={styles.inlineActionChip}
                onClick={() => {
                  controller.applyUploadedMaterial(`${activeShot.title}-当前图`);
                  onToggleImageReferenceMenu();
                }}
              >
                引用当前图
              </button>
            ) : null}
          </div>
          {activeShot.materials.length ? (
            <div className={styles.inlineSection}>
              <div className={styles.inlineSectionTitle}>当前分镜素材</div>
              <div className={styles.inlineTokenRow}>
                {activeShot.materials.slice(0, 4).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={cx(styles.inlineToken, activeMaterial?.id === item.id && styles.inlineTokenActive)}
                    onClick={() => {
                      controller.setActiveMaterial(item.id);
                      onToggleImageReferenceMenu();
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <div className={styles.inlineSection}>
            <div className={styles.inlineSectionTitle}>历史作品</div>
            <div className={styles.inlineWorkList}>
              {visibleHistoryWorks.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={styles.inlineWorkCard}
                  onClick={() => {
                    controller.attachHistoryMaterial(item.title);
                    onToggleImageReferenceMenu();
                  }}
                >
                  <span className={styles.inlineWorkTitle}>{item.title}</span>
                  <span className={styles.inlineWorkMeta}>{item.durationLabel}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {promptAssistMenuOpen && composerMode === 'image' ? (
        <div className={cx(styles.inlinePanel, styles.promptAssistMenu)} ref={promptAssistMenuRef}>
          <div className={styles.inlinePanelHeader}>提示词辅助</div>
          {IMAGE_PROMPT_ASSIST_OPTIONS.map((item) => (
            <button key={item.id} type="button" className={styles.promptAssistItem} onClick={() => onApplyPromptAssist(item.suffix)}>
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className={styles.composerFooter}>
        <div className={styles.footerLeft}>
          <button type="button" className={styles.modeButton} onClick={onToggleModeMenu}>
            <CreationIcon name={composerModeIcon} className={styles.smallIcon} />
            <span>{composerModeLabel}</span>
            <CreationIcon name="chevron" className={styles.smallIcon} />
          </button>

          <button
            type="button"
            className={styles.utilityButton}
            onClick={composerMode === 'video' ? onToggleSettings : onToggleImageModelMenu}
            aria-label={composerMode === 'video' ? '打开视频设置' : '打开模型面板'}
          >
            <CreationIcon name="model" className={styles.smallIcon} />
          </button>

          {isImageComposer ? (
            <>
              <button type="button" className={cx(styles.utilityButton, imageReferenceMenuOpen && styles.utilityButtonActive)} onClick={onToggleImageReferenceMenu} aria-label="打开引用素材">
                <CreationIcon name="mention" className={styles.smallIcon} />
              </button>
              <button type="button" className={cx(styles.utilityButton, promptAssistMenuOpen && styles.utilityButtonActive)} onClick={onTogglePromptAssistMenu} aria-label="打开提示词辅助">
                <CreationIcon name="edit" className={styles.smallIcon} />
              </button>
            </>
          ) : null}
        </div>

        <div className={styles.footerRight}>
          <span className={styles.costBadge}>{`✦ ${composerCost}`}</span>
          <button type="submit" className={styles.submitButton} disabled={!canSubmitComposer} aria-label="提交生成">
            <span className={styles.submitArrow}>↑</span>
          </button>
        </div>
      </div>

      <input ref={tailFrameUploadRef} type="file" accept="image/*" hidden onChange={onHandleTailFrameFileChange} />
      <input ref={imageReferenceUploadRef} type="file" accept="image/*" hidden onChange={onHandleImageReferenceFileChange} />
    </form>
  );
}
