'use client';

import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';

import { getCreationShotMediaUrl, getCreationShotSummaryMediaUrl, getCreationVersionMediaUrl } from '../lib/creation-media';
import type { CreationWorkspaceController } from '../lib/use-creation-workspace';
import pageStyles from './creation-page.module.css';
import { CreationIcon } from './creation-icons';
import { CreationVisualSidebarComposer } from './creation-visual-sidebar-composer';
import { CreationVisualSidebarThread } from './creation-visual-sidebar-thread';
import {
  canElementConsumeWheel,
  ComposerMode,
  EDIT_COST,
  getShotBadgeLabel,
  hasVideoResult,
  IMAGE_COST,
  VIDEO_COST,
} from './creation-visual-sidebar-helpers';
import styles from './creation-visual-sidebar.module.css';

interface CreationVisualSidebarProps {
  controller: CreationWorkspaceController;
}

export function CreationVisualSidebar({ controller }: CreationVisualSidebarProps) {
  const { activeShot, activeVersion, selectedVersion, generateDraft, creation, studio } = controller;
  const [composerMode, setComposerMode] = useState<ComposerMode>('edit');
  const [videoThreadVisible, setVideoThreadVisible] = useState(() => hasVideoResult(controller.activeShot));
  const [composerText, setComposerText] = useState('');
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tailFrameMenuOpen, setTailFrameMenuOpen] = useState(false);
  const [imageModelMenuOpen, setImageModelMenuOpen] = useState(false);
  const [imageReferenceMenuOpen, setImageReferenceMenuOpen] = useState(false);
  const [promptAssistMenuOpen, setPromptAssistMenuOpen] = useState(false);
  const [tailFramePreviewUrl, setTailFramePreviewUrl] = useState('');
  const modeMenuRef = useRef<HTMLDivElement | null>(null);
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const tailFrameMenuRef = useRef<HTMLDivElement | null>(null);
  const imageModelMenuRef = useRef<HTMLDivElement | null>(null);
  const imageReferenceMenuRef = useRef<HTMLDivElement | null>(null);
  const promptAssistMenuRef = useRef<HTMLDivElement | null>(null);
  const tailFrameUploadRef = useRef<HTMLInputElement | null>(null);
  const imageReferenceUploadRef = useRef<HTMLInputElement | null>(null);
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

      if (imageModelMenuRef.current && !imageModelMenuRef.current.contains(target)) {
        setImageModelMenuOpen(false);
      }

      if (imageReferenceMenuRef.current && !imageReferenceMenuRef.current.contains(target)) {
        setImageReferenceMenuOpen(false);
      }

      if (promptAssistMenuRef.current && !promptAssistMenuRef.current.contains(target)) {
        setPromptAssistMenuOpen(false);
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
    setImageModelMenuOpen(false);
    setImageReferenceMenuOpen(false);
    setPromptAssistMenuOpen(false);
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
    setVideoThreadVisible(nextMode === 'video');
    setComposerText(nextMode === 'video' ? videoPrompt : '');
    setModeMenuOpen(false);
    setSettingsOpen(false);
    setTailFrameMenuOpen(false);
    setImageModelMenuOpen(false);
    setImageReferenceMenuOpen(false);
    setPromptAssistMenuOpen(false);
  };

  const composerModeLabel = composerMode === 'video' ? '视频生成' : composerMode === 'image' ? '图片生成' : '对话改图';
  const composerPlaceholder =
    composerMode === 'video'
      ? '结合图片，描述你想生成的角色动作和画面动态'
      : composerMode === 'image'
        ? '输入你想生成的图片内容'
        : '输入你想要对当前画面修改的内容';
  const composerModeIcon = composerMode === 'video' ? 'video' : composerMode === 'image' ? 'imageMagic' : 'magic';
  const isImageComposer = composerMode === 'image';
  const canSubmitComposer = !isGenerating && composerText.trim().length > 0;
  const composerCost = composerMode === 'video' ? VIDEO_COST : composerMode === 'image' ? IMAGE_COST : EDIT_COST;

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

    if (!canSubmitComposer) {
      return;
    }

    if (composerMode === 'video') {
      setVideoThreadVisible(true);
    }

    controller.submitInlineGeneration(
      composerMode === 'video' ? 'video' : 'image',
      composerMode === 'video'
        ? {
            ...(sourceImageUrl ? { firstFrameUrl: sourceImageUrl } : {}),
            ...(tailFramePreviewUrl ? { lastFrameUrl: tailFramePreviewUrl } : {}),
          }
        : undefined,
    );
  };

  const applyPromptAssist = (suffix: string) => {
    setComposerText((current) => `${current.trim()}${suffix}`.trim());
    setPromptAssistMenuOpen(false);
  };

  const applyImageModel = (modelId: string, category?: 'auto' | 'detail' | 'reference') => {
    if (category) {
      controller.setModelPickerField('category', category);
    }
    controller.setModelPickerField('selectedModel', modelId);
    controller.requestModelChange(modelId);
    setImageModelMenuOpen(false);
  };

  const handleImageReferenceUpload = () => {
    imageReferenceUploadRef.current?.click();
  };

  const handleImageReferenceFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    controller.applyUploadedMaterial(file.name);
    setImageReferenceMenuOpen(false);
    event.target.value = '';
  };

  const visibleHistoryWorks = studio.historyWorks.slice(0, 4);

  return (
    <aside className={pageStyles.sidebar}>
      <div className={styles.root} data-mode={composerMode} ref={rootRef}>
        <header className={styles.panelHeader}>
          <div className={styles.panelHeaderLabel}>
            <span className={styles.panelHeaderDot} />
            <span>{shotLabel}</span>
          </div>
        </header>

        <div ref={threadRef}>
          <CreationVisualSidebarThread
            activeShotTitle={activeShot.title}
            shotLabel={shotLabel}
            summaryImageUrl={summaryImageUrl}
            imageResultUrl={imageResultUrl}
            videoResultUrl={videoResultUrl}
            visiblePrompt={visiblePrompt}
            visiblePromptLabel={visiblePromptLabel}
            videoThreadVisible={videoThreadVisible}
            modelDisplayName={controller.resolveModelDisplayName(generateDraft.model)}
            onApplyQuotedImage={applyQuotedImage}
            onRevealVideoThread={revealVideoThread}
            onOpenExternalMedia={openExternalMedia}
            onOpenMaterialsDialog={controller.openMaterialsDialog}
            onRetryCurrent={() =>
              controller.submitInlineGeneration(
                videoThreadVisible ? 'video' : 'image',
                videoThreadVisible
                  ? {
                      ...(sourceImageUrl ? { firstFrameUrl: sourceImageUrl } : {}),
                      ...(tailFramePreviewUrl ? { lastFrameUrl: tailFramePreviewUrl } : {}),
                    }
                  : undefined,
              )
            }
          />
        </div>

        <CreationVisualSidebarComposer
          controller={controller}
          composerMode={composerMode}
          composerText={composerText}
          composerPlaceholder={composerPlaceholder}
          composerModeLabel={composerModeLabel}
          composerModeIcon={composerModeIcon}
          isImageComposer={isImageComposer}
          canSubmitComposer={canSubmitComposer}
          composerCost={composerCost}
          settingsOpen={settingsOpen}
          modeMenuOpen={modeMenuOpen}
          tailFrameMenuOpen={tailFrameMenuOpen}
          imageModelMenuOpen={imageModelMenuOpen}
          imageReferenceMenuOpen={imageReferenceMenuOpen}
          promptAssistMenuOpen={promptAssistMenuOpen}
          tailFramePreviewUrl={tailFramePreviewUrl}
          sourceImageUrl={sourceImageUrl}
          imageResultUrl={imageResultUrl}
          nextShotFrameUrl={nextShotFrameUrl}
          visibleHistoryWorks={visibleHistoryWorks}
          modeMenuRef={modeMenuRef}
          settingsRef={settingsRef}
          tailFrameMenuRef={tailFrameMenuRef}
          imageModelMenuRef={imageModelMenuRef}
          imageReferenceMenuRef={imageReferenceMenuRef}
          promptAssistMenuRef={promptAssistMenuRef}
          tailFrameUploadRef={tailFrameUploadRef}
          imageReferenceUploadRef={imageReferenceUploadRef}
          onSubmit={submitComposer}
          onComposerTextChange={setComposerText}
          onSwitchComposerMode={switchComposerMode}
          onRevealVideoThread={revealVideoThread}
          onToggleModeMenu={() => {
            setSettingsOpen(false);
            setModeMenuOpen((current) => !current);
          }}
          onToggleSettings={() => setSettingsOpen((current) => !current)}
          onToggleTailFrameMenu={() => setTailFrameMenuOpen((current) => !current)}
          onToggleImageModelMenu={() => {
            setImageReferenceMenuOpen(false);
            setPromptAssistMenuOpen(false);
            setImageModelMenuOpen((current) => !current);
          }}
          onToggleImageReferenceMenu={() => {
            setImageModelMenuOpen(false);
            setPromptAssistMenuOpen(false);
            setImageReferenceMenuOpen((current) => !current);
          }}
          onTogglePromptAssistMenu={() => {
            setImageModelMenuOpen(false);
            setImageReferenceMenuOpen(false);
            setPromptAssistMenuOpen((current) => !current);
          }}
          onHandleTailFrameUpload={handleTailFrameUpload}
          onGenerateTailFrame={generateTailFrame}
          onUseNextShotAsTailFrame={useNextShotAsTailFrame}
          onHandleTailFrameFileChange={handleTailFrameFileChange}
          onApplyImageModel={applyImageModel}
          onHandleImageReferenceUpload={handleImageReferenceUpload}
          onHandleImageReferenceFileChange={handleImageReferenceFileChange}
          onApplyPromptAssist={applyPromptAssist}
        />

        {controller.notice ? <div className={styles.notice}>{controller.notice}</div> : null}
      </div>
    </aside>
  );
}
