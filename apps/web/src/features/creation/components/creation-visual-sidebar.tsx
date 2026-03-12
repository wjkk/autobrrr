'use client';

import { cx } from '@aiv/ui';
import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';

import { getCreationShotMediaUrl, getCreationShotSummaryMediaUrl, getCreationVersionMediaUrl } from '../lib/creation-media';
import type { CreationWorkspaceController } from '../lib/use-creation-workspace';
import pageStyles from './creation-page.module.css';
import { CreationIcon } from './creation-icons';
import styles from './creation-visual-sidebar.module.css';

interface CreationVisualSidebarProps {
  controller: CreationWorkspaceController;
}

type ComposerMode = 'edit' | 'image' | 'video';

const IMAGE_COST = 1;
const VIDEO_COST = 8;

function hasVideoResult(shot: CreationWorkspaceController['activeShot']) {
  if (!shot) {
    return false;
  }

  return shot.versions.some((version) => version.mediaKind === 'video');
}

function getShotBadgeLabel(shotId: string, fallback: string) {
  const index = Number(shotId.match(/(\d+)(?!.*\d)/)?.[1] ?? 0);
  return index > 0 ? `分镜${index}` : fallback;
}

function getDurationLabel(durationMode: string) {
  if (durationMode === '4s' || durationMode === '6s') {
    return durationMode;
  }

  return '智能';
}

function canElementConsumeWheel(target: EventTarget | null, boundary: HTMLElement | null, deltaY: number) {
  if (typeof window === 'undefined' || !(target instanceof HTMLElement)) {
    return false;
  }

  let current: HTMLElement | null = target;

  while (current && current !== boundary) {
    const { overflowY } = window.getComputedStyle(current);
    const isScrollable = (overflowY === 'auto' || overflowY === 'scroll') && current.scrollHeight > current.clientHeight + 1;

    if (isScrollable) {
      const atTop = current.scrollTop <= 0;
      const atBottom = current.scrollTop + current.clientHeight >= current.scrollHeight - 1;

      if ((deltaY < 0 && !atTop) || (deltaY > 0 && !atBottom)) {
        return true;
      }
    }

    current = current.parentElement;
  }

  return false;
}

export function CreationVisualSidebar({ controller }: CreationVisualSidebarProps) {
  const { activeShot, activeVersion, selectedVersion, generateDraft, creation } = controller;
  const [composerMode, setComposerMode] = useState<ComposerMode>('edit');
  const [videoThreadVisible, setVideoThreadVisible] = useState(() => hasVideoResult(controller.activeShot));
  const [composerText, setComposerText] = useState('');
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tailFrameMenuOpen, setTailFrameMenuOpen] = useState(false);
  const [tailFramePreviewUrl, setTailFramePreviewUrl] = useState('');
  const modeMenuRef = useRef<HTMLDivElement | null>(null);
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const tailFrameMenuRef = useRef<HTMLDivElement | null>(null);
  const tailFrameUploadRef = useRef<HTMLInputElement | null>(null);
  const threadRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;

      if (modeMenuRef.current && !modeMenuRef.current.contains(target)) {
        setModeMenuOpen(false);
      }

      if (settingsRef.current && !settingsRef.current.contains(target)) {
        setSettingsOpen(false);
      }

      if (tailFrameMenuRef.current && !tailFrameMenuRef.current.contains(target)) {
        setTailFrameMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  useEffect(() => {
    const root = rootRef.current;

    if (!root) {
      return;
    }

    const handleWheel = (event: globalThis.WheelEvent) => {
      if (event.ctrlKey) {
        return;
      }

      const thread = threadRef.current;

      if (!thread || thread.scrollHeight <= thread.clientHeight + 1) {
        return;
      }

      if (canElementConsumeWheel(event.target, thread, event.deltaY)) {
        return;
      }

      const maxScrollTop = thread.scrollHeight - thread.clientHeight;
      const nextScrollTop = Math.max(0, Math.min(maxScrollTop, thread.scrollTop + event.deltaY));

      if (Math.abs(nextScrollTop - thread.scrollTop) < 0.5) {
        return;
      }

      event.preventDefault();
      thread.scrollTop = nextScrollTop;
    };

    root.addEventListener('wheel', handleWheel, { passive: false, capture: true });

    return () => {
      root.removeEventListener('wheel', handleWheel, { capture: true });
    };
  }, []);

  useEffect(() => {
    if (!activeShot) {
      return;
    }

    setVideoThreadVisible(hasVideoResult(activeShot));
    setComposerMode('edit');
    setComposerText('');
    setModeMenuOpen(false);
    setSettingsOpen(false);
    setTailFrameMenuOpen(false);
    setTailFramePreviewUrl('');
  }, [activeShot]);

  if (!activeShot) {
    return null;
  }

  const displayVersion = selectedVersion ?? activeVersion;
  const imagePrompt = activeShot.imagePrompt.trim();
  const fallbackVideoPrompt = '固定镜头。青年抱着金属机器猫稳步走向客厅中心，笑容灿烂；鸟架上的绿羽鹦鹉保持歪头姿势，黑色圆眼睛紧盯着移动的目标。';
  const videoPrompt = activeShot.motionPrompt.trim() || fallbackVideoPrompt;
  const imageResultUrl = getCreationShotMediaUrl(activeShot.id) || (displayVersion ? getCreationVersionMediaUrl(activeShot.id, displayVersion.id) : '');
  const summaryImageUrl = imageResultUrl || getCreationShotSummaryMediaUrl(activeShot.id);
  const videoResultUrl = imageResultUrl;
  const sourceImageUrl = imageResultUrl || videoResultUrl;
  const shotLabel = getShotBadgeLabel(activeShot.id, activeShot.title);
  const visiblePrompt = videoThreadVisible ? videoPrompt : imagePrompt;
  const visiblePromptLabel = videoThreadVisible ? '视频提示词' : '图片提示词';
  const isGenerating = activeShot.status === 'generating';
  const activeShotIndex = creation.shots.findIndex((shot) => shot.id === activeShot.id);
  const nextShot = activeShotIndex >= 0 ? creation.shots[activeShotIndex + 1] ?? null : null;
  const nextShotVersion = nextShot
    ? nextShot.versions.find((version) => version.id === nextShot.activeVersionId) ?? nextShot.versions[0] ?? null
    : null;
  const nextShotFrameUrl = nextShot
    ? getCreationShotMediaUrl(nextShot.id) || (nextShotVersion ? getCreationVersionMediaUrl(nextShot.id, nextShotVersion.id) : '')
    : '';

  const flashNotice = (message: string | null) => controller.setNotice(message);

  const applyQuotedImage = () => {
    controller.applySelectedVersion(activeShot.id, displayVersion?.id);
    flashNotice('已应用至当前分镜');
  };

  const revealVideoThread = () => {
    setVideoThreadVisible(true);
    setComposerMode('video');
    setComposerText(videoPrompt);
    setModeMenuOpen(false);
    setSettingsOpen(false);
    setTailFrameMenuOpen(false);
  };

  const switchComposerMode = (nextMode: ComposerMode) => {
    setComposerMode(nextMode);
    setComposerText(nextMode === 'video' ? videoPrompt : '');
    setModeMenuOpen(false);
    setSettingsOpen(false);
    setTailFrameMenuOpen(false);
  };

  const composerModeLabel = composerMode === 'video' ? '视频生成' : composerMode === 'image' ? '图片生成' : '对话改图';
  const composerPlaceholder =
    composerMode === 'video'
      ? '结合图片，描述你想生成的角色动作和画面动态'
      : composerMode === 'image'
        ? '输入你想生成的图片内容'
        : '输入你想要对当前画面修改的内容';
  const composerModeIcon = composerMode === 'video' ? 'video' : composerMode === 'image' ? 'image' : 'magic';

  const handleTailFrameUpload = () => {
    tailFrameUploadRef.current?.click();
    setTailFrameMenuOpen(false);
  };

  const handleTailFrameFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setTailFramePreviewUrl(URL.createObjectURL(file));
    flashNotice(`已选择尾帧：${file.name}`);
    event.target.value = '';
  };

  const useNextShotAsTailFrame = () => {
    if (!nextShotFrameUrl) {
      flashNotice('下一分镜暂无可用首帧。');
      setTailFrameMenuOpen(false);
      return;
    }

    setTailFramePreviewUrl(nextShotFrameUrl);
    flashNotice(`已引用 ${nextShot?.title ?? '下一分镜'} 首帧。`);
    setTailFrameMenuOpen(false);
  };

  const generateTailFrame = () => {
    setTailFramePreviewUrl(sourceImageUrl);
    flashNotice('已生成尾帧占位图。');
    setTailFrameMenuOpen(false);
  };

  const openExternalMedia = (targetUrl: string) => {
    if (!targetUrl || typeof window === 'undefined') {
      return;
    }

    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  const submitComposer = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (composerMode === 'video') {
      setVideoThreadVisible(true);
    }

    controller.submitInlineGeneration();
  };

  return (
    <aside className={pageStyles.sidebar}>
      <div className={styles.root} data-mode={composerMode} ref={rootRef}>
        <header className={styles.panelHeader}>
          <div className={styles.panelHeaderLabel}>
            <span className={styles.panelHeaderDot} />
            <span>{shotLabel}</span>
          </div>
        </header>

        <div className={styles.thread} ref={threadRef}>
          <div className={styles.messageList}>
            <section className={styles.summarySection}>
              <div className={styles.shotSummaryCard}>
                <div className={styles.shotSummaryTitleRow}>
                  <span className={styles.panelHeaderDot} />
                  <div className={styles.shotSummaryTitle}>{shotLabel}</div>
                </div>
                <div className={styles.shotSummaryStrip}>
                  <div className={styles.shotSummaryStripTrack} />
                  {summaryImageUrl ? <img className={styles.shotSummaryStripImage} src={summaryImageUrl} alt={activeShot.title} /> : null}
                </div>
                <div className={styles.shotSummaryActions}>
                  <button type="button" className={styles.summaryActionButton} onClick={applyQuotedImage}>
                    <CreationIcon name="replace" className={styles.smallIcon} />
                    <span>引用图片</span>
                  </button>
                  <button type="button" className={styles.summaryActionButton} onClick={revealVideoThread}>
                    <CreationIcon name="video" className={styles.smallIcon} />
                    <span>转视频</span>
                  </button>
                </div>
              </div>

              <div className={styles.userMessageRow}>
                <button type="button" className={styles.userMessageBubble} onClick={revealVideoThread}>
                  <span className={styles.userMessageBubbleInner}>图片生成视频</span>
                </button>
              </div>
            </section>

            <section className={styles.assistantSection}>
              <div className={styles.assistantBadge}>
                <span className={styles.assistantBadgeIcon}>
                  <CreationIcon name="brand" className={styles.assistantBrandIcon} />
                </span>
                <span>Seko</span>
              </div>

              <div className={styles.promptCard}>
                <div className={styles.promptCardHeader}>
                  <div className={styles.promptCardTitle}>
                    <CreationIcon name={videoThreadVisible ? 'video' : 'image'} className={styles.cardIcon} />
                    <span>{visiblePromptLabel}</span>
                  </div>
                </div>
                <p className={styles.promptText}>{visiblePrompt}</p>
              </div>

              <div className={styles.resultCard}>
                <div className={styles.resultCanvas} data-video={videoThreadVisible ? 'true' : 'false'}>
                  {videoThreadVisible ? (
                    <div className={styles.smartChip}>
                      <CreationIcon name="magic" className={styles.smallIcon} />
                      <span>智能选择</span>
                    </div>
                  ) : null}

                  {(videoThreadVisible ? videoResultUrl : imageResultUrl) ? (
                    <img className={styles.resultImage} src={videoThreadVisible ? videoResultUrl : imageResultUrl} alt={activeShot.title} />
                  ) : (
                    <div className={styles.emptyState}>暂无生成结果</div>
                  )}

                  {videoThreadVisible ? (
                    <button type="button" className={styles.playButton} aria-label="播放预览" onClick={() => openExternalMedia(videoResultUrl)}>
                      <CreationIcon name="play" className={styles.playIcon} />
                    </button>
                  ) : null}

                  <div className={styles.resultHoverToolbar}>
                    <button type="button" className={styles.resultHoverAction} aria-label="下载结果" onClick={() => openExternalMedia(videoThreadVisible ? videoResultUrl : imageResultUrl)}>
                      <CreationIcon name="download" className={styles.smallIcon} />
                    </button>
                    <button type="button" className={styles.resultHoverAction} aria-label="打开素材" onClick={controller.openMaterialsDialog}>
                      <CreationIcon name="image" className={styles.smallIcon} />
                    </button>
                    <button type="button" className={styles.resultHoverAction} aria-label="重新生成" onClick={controller.submitInlineGeneration}>
                      <CreationIcon name="retry" className={styles.smallIcon} />
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

        <form className={styles.composerForm} onSubmit={submitComposer}>
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
                <button
                  type="button"
                  className={styles.tailFrameCard}
                  onClick={() => {
                    setTailFrameMenuOpen((current) => !current);
                  }}
                  aria-label="选择尾帧"
                >
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

          <textarea
            className={styles.textarea}
            placeholder={composerPlaceholder}
            value={composerText}
            onChange={(event) => setComposerText(event.target.value)}
          />

          {modeMenuOpen ? (
            <div className={styles.modeMenu} ref={modeMenuRef}>
              <button type="button" className={cx(styles.modeMenuItem, composerMode === 'image' && styles.modeMenuItemActive)} onClick={() => switchComposerMode('image')}>
                <CreationIcon name="image" className={styles.smallIcon} />
                <span>图片生成</span>
                {composerMode === 'image' ? <span className={styles.menuCheck}>✓</span> : null}
              </button>
              <button type="button" className={cx(styles.modeMenuItem, composerMode === 'edit' && styles.modeMenuItemActive)} onClick={() => switchComposerMode('edit')}>
                <CreationIcon name="magic" className={styles.smallIcon} />
                <span>对话改图</span>
                {composerMode === 'edit' ? <span className={styles.menuCheck}>✓</span> : null}
              </button>
              <button type="button" className={cx(styles.modeMenuItem, composerMode === 'video' && styles.modeMenuItemActive)} onClick={revealVideoThread}>
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
              <button type="button" className={styles.settingRow} onClick={controller.openModelPicker}>
                <span>选用模型</span>
                <span className={styles.settingValue}>
                  {generateDraft.model}
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
              <button type="button" className={styles.tailFrameMenuItem} onClick={handleTailFrameUpload}>
                上传尾帧
              </button>
              <button type="button" className={styles.tailFrameMenuItem} onClick={generateTailFrame}>
                生成图片
              </button>
              <button type="button" className={styles.tailFrameMenuItem} onClick={useNextShotAsTailFrame} disabled={!nextShotFrameUrl}>
                使用下一分镜首帧图
              </button>
            </div>
          ) : null}

          <div className={styles.composerFooter}>
            <div className={styles.footerLeft}>
              <button
                type="button"
                className={styles.modeButton}
                onClick={() => {
                  setSettingsOpen(false);
                  setModeMenuOpen((current) => !current);
                }}
              >
                <CreationIcon name={composerModeIcon} className={styles.smallIcon} />
                <span>{composerModeLabel}</span>
                <CreationIcon name="chevron" className={styles.smallIcon} />
              </button>

              <button
                type="button"
                className={styles.utilityButton}
                onClick={composerMode === 'video' ? () => setSettingsOpen((current) => !current) : controller.openMaterialsDialog}
                aria-label={composerMode === 'video' ? '打开视频设置' : '打开素材面板'}
              >
                <CreationIcon name="model" className={styles.smallIcon} />
              </button>
            </div>

            <div className={styles.footerRight}>
              <span className={styles.costBadge}>{`✦ ${composerMode === 'video' ? VIDEO_COST : IMAGE_COST}`}</span>
              <button type="submit" className={styles.submitButton} disabled={isGenerating} aria-label="提交生成">
                <span className={styles.submitArrow}>↑</span>
              </button>
            </div>
          </div>

          <input ref={tailFrameUploadRef} type="file" accept="image/*" hidden onChange={handleTailFrameFileChange} />
        </form>

        {controller.notice ? <div className={styles.notice}>{controller.notice}</div> : null}
      </div>
    </aside>
  );
}
