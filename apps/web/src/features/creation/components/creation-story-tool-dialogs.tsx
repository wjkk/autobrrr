'use client';

import { Button, cx } from '@aiv/ui';

import type { CreationWorkspaceController } from '../lib/use-creation-workspace';
import { CreationIcon } from './creation-icons';
import { CreationModalShell } from './creation-modal-shell';
import { ShotPoster } from './shot-poster';
import dialogStyles from './creation-dialogs.module.css';
import styles from './creation-page.module.css';

export function CreationStoryToolDialogs(props: {
  controller: CreationWorkspaceController;
}) {
  const { controller } = props;
  const { dialog, activeShot, activeVersion, storyToolDraft } = controller;

  if (!activeShot || dialog.type !== 'story-tool') {
    return null;
  }

  const sourceVersion = activeShot.versions.find((version) => version.id === storyToolDraft.sourceVersionId) ?? activeVersion;

  return (
    <>
      <CreationModalShell
        open={dialog.type === 'story-tool' && dialog.mode === 'crop'}
        eyebrow="Storyboard Tool"
        title="裁剪分镜"
        description="更接近 Seko 的二级工具面板：左侧看预览，右侧调画幅、焦点和保留时长。"
        size="wide"
        onClose={() => controller.setDialog({ type: 'none' })}
        footerInfo={<span className={dialogStyles.footerNote}>确认后会回写当前分镜的画幅、焦点和镜头时长。</span>}
        footerActions={
          <>
            <Button variant="secondary" onClick={() => controller.setDialog({ type: 'none' })}>
              取消
            </Button>
            <Button onClick={controller.submitStoryboardTool}>应用裁剪</Button>
          </>
        }
      >
        <div className={dialogStyles.modalSplit}>
          <div className={dialogStyles.previewCard}>
            <div className={dialogStyles.previewFrame}>
              <ShotPoster shot={activeShot} size="sidebar" accent={controller.shotAccent(activeShot.id)} caption={activeShot.title} activeMaterialLabel={controller.activeMaterial?.label ?? null} />
            </div>
            <div className={dialogStyles.previewStats}>
              <div className={dialogStyles.previewStatCard}>
                <small>裁剪起点</small>
                <strong>{storyToolDraft.clipIn}s</strong>
              </div>
              <div className={dialogStyles.previewStatCard}>
                <small>裁剪终点</small>
                <strong>{storyToolDraft.clipOut}s</strong>
              </div>
              <div className={dialogStyles.previewStatCard}>
                <small>目标比例</small>
                <strong>{storyToolDraft.ratio}</strong>
              </div>
            </div>
          </div>
          <div className={dialogStyles.optionStack}>
            <div className={dialogStyles.optionCard}>
              <h4>取景与焦点</h4>
              <div className={styles.segmentedGroup}>
                {(['9:16', '16:9', '1:1'] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={storyToolDraft.ratio === item ? styles.segmentedButtonActive : styles.segmentedButton}
                    onClick={() => controller.setStoryToolField('ratio', item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <div className={dialogStyles.inlinePillRow}>
                {([
                  ['subject', '聚焦主体'],
                  ['motion', '保留动作'],
                  ['environment', '保留环境'],
                ] as const).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className={storyToolDraft.focus === key ? styles.segmentedButtonActive : styles.segmentedButton}
                    onClick={() => controller.setStoryToolField('focus', key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className={dialogStyles.optionCard}>
              <h4>镜头时长</h4>
              <div className={styles.dialogGrid}>
                <label className={styles.fieldBlock}>
                  <span>{`起点 ${storyToolDraft.clipIn}s`}</span>
                  <input type="range" min="0" max={String(Math.max(1, activeShot.durationSeconds - 1))} value={storyToolDraft.clipIn} onChange={(event) => controller.setStoryToolField('clipIn', Number(event.target.value))} />
                </label>
                <label className={styles.fieldBlock}>
                  <span>{`终点 ${storyToolDraft.clipOut}s`}</span>
                  <input type="range" min="2" max={String(Math.max(2, activeShot.durationSeconds + 2))} value={storyToolDraft.clipOut} onChange={(event) => controller.setStoryToolField('clipOut', Number(event.target.value))} />
                </label>
              </div>
              <label className={styles.checkboxRow}>
                <input type="checkbox" checked={storyToolDraft.keepNarration} onChange={(event) => controller.setStoryToolField('keepNarration', event.target.checked)} />
                <span>尽量保留原旁白与节奏</span>
              </label>
            </div>
          </div>
        </div>
      </CreationModalShell>

      <CreationModalShell
        open={dialog.type === 'story-tool' && dialog.mode === 'frame'}
        eyebrow="Storyboard Tool"
        title="选帧生分镜"
        description="从当前版本选出关键帧，直接派生一个新的候选分镜并插入到时间轴。"
        size="xl"
        onClose={() => controller.setDialog({ type: 'none' })}
        footerInfo={<span className={dialogStyles.footerNote}>确认后会在当前分镜后插入一个新的衍生分镜，便于继续生成版本。</span>}
        footerActions={
          <>
            <Button variant="secondary" onClick={() => controller.setDialog({ type: 'none' })}>
              取消
            </Button>
            <Button onClick={controller.submitStoryboardTool}>生成衍生分镜</Button>
          </>
        }
      >
        <div className={dialogStyles.modalSplit}>
          <div className={dialogStyles.previewCard}>
            <div className={dialogStyles.previewFrame}>
              <ShotPoster shot={activeShot} size="sidebar" accent={controller.shotAccent(activeShot.id)} caption={sourceVersion?.label ?? activeShot.title} />
            </div>
            <div className={dialogStyles.versionSourceList}>
              {activeShot.versions.map((version) => (
                <button
                  key={version.id}
                  type="button"
                  className={cx(dialogStyles.versionSourceCard, storyToolDraft.sourceVersionId === version.id && dialogStyles.versionSourceCardActive)}
                  onClick={() => controller.setStoryToolField('sourceVersionId', version.id)}
                >
                  <span className={dialogStyles.versionSourceBadge}>{version.label}</span>
                  <strong>{version.modelId}</strong>
                  <p>{version.id === activeShot.activeVersionId ? '当前生效版本' : version.id === activeShot.pendingApplyVersionId ? '待替换版本' : '历史候选版本'}</p>
                </button>
              ))}
            </div>
          </div>
          <div className={dialogStyles.optionStack}>
            <div className={dialogStyles.optionCard}>
              <h4>选择关键帧</h4>
              <div className={dialogStyles.frameGrid}>
                {[1, 2, 3, 4, 5, 6].map((frame) => (
                  <button
                    key={frame}
                    type="button"
                    className={cx(dialogStyles.frameButton, storyToolDraft.selectedFrames.includes(frame) && dialogStyles.frameButtonActive)}
                    onClick={() => controller.toggleStoryToolFrame(frame)}
                  >
                    <div className={dialogStyles.frameThumb} />
                    <div className={dialogStyles.frameMeta}>
                      <strong>{`关键帧 ${frame}`}</strong>
                      <small>{storyToolDraft.selectedFrames.includes(frame) ? '已加入新分镜' : '点击加入候选'}</small>
                    </div>
                    {storyToolDraft.selectedFrames.includes(frame) ? <CreationIcon name="magic" className={styles.buttonGlyph} /> : null}
                  </button>
                ))}
              </div>
            </div>
            <div className={dialogStyles.optionCard}>
              <h4>输出设置</h4>
              <div className={dialogStyles.inlinePillRow}>
                {([2, 3, 4] as const).map((count) => (
                  <button
                    key={count}
                    type="button"
                    className={storyToolDraft.frameCount === count ? styles.segmentedButtonActive : styles.segmentedButton}
                    onClick={() => controller.setStoryToolField('frameCount', count)}
                  >
                    {`${count} 帧密度`}
                  </button>
                ))}
              </div>
              <div className={styles.segmentedGroup}>
                {(['9:16', '16:9', '1:1'] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={storyToolDraft.ratio === item ? styles.segmentedButtonActive : styles.segmentedButton}
                    onClick={() => controller.setStoryToolField('ratio', item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CreationModalShell>
    </>
  );
}
