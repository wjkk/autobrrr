'use client';

import { CreationIcon } from './creation-icons';
import styles from './creation-visual-sidebar.module.css';

interface CreationVisualSidebarThreadProps {
  activeShotTitle: string;
  shotLabel: string;
  summaryImageUrl: string;
  imageResultUrl: string;
  videoResultUrl: string;
  visiblePrompt: string;
  visiblePromptLabel: string;
  videoThreadVisible: boolean;
  modelDisplayName: string;
  onApplyQuotedImage: () => void;
  onRevealVideoThread: () => void;
  onOpenExternalMedia: (targetUrl: string) => void;
  onOpenMaterialsDialog: () => void;
  onRetryCurrent: () => void;
}

export function CreationVisualSidebarThread(props: CreationVisualSidebarThreadProps) {
  const {
    activeShotTitle,
    shotLabel,
    summaryImageUrl,
    imageResultUrl,
    videoResultUrl,
    visiblePrompt,
    visiblePromptLabel,
    videoThreadVisible,
    modelDisplayName,
    onApplyQuotedImage,
    onRevealVideoThread,
    onOpenExternalMedia,
    onOpenMaterialsDialog,
    onRetryCurrent,
  } = props;

  const visibleResultUrl = videoThreadVisible ? videoResultUrl : imageResultUrl;

  return (
    <div className={styles.thread}>
      <div className={styles.messageList}>
        <section className={styles.summarySection}>
          <div className={styles.shotSummaryCard}>
            <div className={styles.shotSummaryTitleRow}>
              <span className={styles.panelHeaderDot} />
              <div className={styles.shotSummaryTitle}>{shotLabel}</div>
            </div>
            <div className={styles.shotSummaryStrip}>
              <div className={styles.shotSummaryStripTrack} />
              {summaryImageUrl ? <img className={styles.shotSummaryStripImage} src={summaryImageUrl} alt={activeShotTitle} /> : null}
            </div>
            <div className={styles.shotSummaryActions}>
              <button type="button" className={styles.summaryActionButton} onClick={onApplyQuotedImage}>
                <CreationIcon name="replace" className={styles.smallIcon} />
                <span>引用图片</span>
              </button>
              <button type="button" className={styles.summaryActionButton} onClick={onRevealVideoThread}>
                <CreationIcon name="video" className={styles.smallIcon} />
                <span>转视频</span>
              </button>
            </div>
          </div>

          <div className={styles.userMessageRow}>
            <button type="button" className={styles.userMessageBubble} onClick={onRevealVideoThread}>
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
                  <span>{modelDisplayName}</span>
                </div>
              ) : null}

              {visibleResultUrl ? (
                <img className={styles.resultImage} src={visibleResultUrl} alt={activeShotTitle} />
              ) : (
                <div className={styles.emptyState}>暂无生成结果</div>
              )}

              {videoThreadVisible ? (
                <button type="button" className={styles.playButton} aria-label="播放预览" onClick={() => onOpenExternalMedia(videoResultUrl)}>
                  <CreationIcon name="play" className={styles.playIcon} />
                </button>
              ) : null}

              <div className={styles.resultHoverToolbar}>
                <button type="button" className={styles.resultHoverAction} aria-label="下载结果" onClick={() => onOpenExternalMedia(visibleResultUrl)}>
                  <CreationIcon name="download" className={styles.smallIcon} />
                </button>
                <button type="button" className={styles.resultHoverAction} aria-label="打开素材" onClick={onOpenMaterialsDialog}>
                  <CreationIcon name="image" className={styles.smallIcon} />
                </button>
                <button type="button" className={styles.resultHoverAction} aria-label="重新生成" onClick={onRetryCurrent}>
                  <CreationIcon name="retry" className={styles.smallIcon} />
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
