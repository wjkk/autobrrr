'use client';

import { Button, cx } from '@aiv/ui';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';

import type { CreationWorkspaceController } from '../lib/use-creation-workspace';
import { CreationIcon } from './creation-icons';
import { CreationModalShell } from './creation-modal-shell';
import { ShotPoster } from './shot-poster';
import dialogStyles from './creation-dialogs.module.css';
import styles from './creation-page.module.css';

interface CreationDialogsProps {
  controller: CreationWorkspaceController;
}

const MODEL_OPTIONS = [
  {
    id: 'Vision Auto',
    category: 'auto' as const,
    title: 'Vision Auto',
    description: '默认推荐，适合保持角色和场景的一致稳定。',
    tags: ['推荐', '稳定'],
  },
  {
    id: 'Vision Detail',
    category: 'detail' as const,
    title: 'Vision Detail',
    description: '强调服装、表情与材质细节，适合角色近景和高质感镜头。',
    tags: ['细节', '高保真'],
  },
  {
    id: 'Vision Reference',
    category: 'reference' as const,
    title: 'Vision Reference',
    description: '更依赖参考图和已有版本，适合局部重做与一致性修补。',
    tags: ['参考图', '一致性'],
  },
];

function getVideoTaskShotCount(controller: CreationWorkspaceController, target: 'single' | 'all' | 'missing') {
  if (target === 'single') {
    return 1;
  }

  const missing = controller.creation.shots.filter((shot) => shot.status === 'failed' || !shot.versions.some((version) => version.mediaKind === 'video')).length;
  return target === 'missing' ? Math.max(1, missing) : controller.creation.shots.length;
}

export function CreationDialogs({ controller }: CreationDialogsProps) {
  const {
    dialog,
    studio,
    creation,
    activeShot,
    activeVersion,
    generateDraft,
    canvasDraft,
    storyToolDraft,
    modelPickerDraft,
    lipsyncNotice,
  } = controller;

  if (!activeShot) {
    return null;
  }

  const sourceVersion = activeShot.versions.find((version) => version.id === storyToolDraft.sourceVersionId) ?? activeVersion;
  const modelOptions = MODEL_OPTIONS.filter((item) => item.category === modelPickerDraft.category);
  const lipsyncBaseShot = creation.shots.find((shot) => shot.id === creation.lipSync.baseShotId) ?? activeShot;
  const [historyCategory, setHistoryCategory] = useState<(typeof studio.explore.categories)[number]>('全部');
  const [selectedHistoryWorkId, setSelectedHistoryWorkId] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [uploadedImageName, setUploadedImageName] = useState('');
  const [uploadedImageUrl, setUploadedImageUrl] = useState('');
  const [cropRatio, setCropRatio] = useState<'自由' | '9:16' | '16:9' | '3:4' | '4:3'>('自由');
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const filteredHistoryWorks = studio.historyWorks.filter((item) => historyCategory === '全部' || item.category === historyCategory);
  const selectedHistoryWork = filteredHistoryWorks.find((item) => item.id === selectedHistoryWorkId) ?? studio.historyWorks.find((item) => item.id === selectedHistoryWorkId) ?? null;
  const batchShotCount = getVideoTaskShotCount(controller, dialog.type === 'batch' ? dialog.target : 'all');
  const generateShotCount = getVideoTaskShotCount(controller, 'single');
  const taskShotCount = dialog.type === 'batch' ? batchShotCount : generateShotCount;
  const taskCost = taskShotCount * 10;

  useEffect(() => {
    if (dialog.type === 'materials') {
      setHistoryCategory('全部');
      setSelectedHistoryWorkId(null);
    }
  }, [dialog.type]);

  useEffect(() => {
    return () => {
      if (uploadedImageUrl) {
        URL.revokeObjectURL(uploadedImageUrl);
      }
    };
  }, [uploadedImageUrl]);

  const handleUploadImage = () => {
    uploadInputRef.current?.click();
  };

  const handleUploadChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      if (image.naturalWidth < 300 || image.naturalHeight < 300) {
        controller.setDialog({ type: 'none' });
        controller.setNotice(`图片最小尺寸为 300*300，当前图片尺寸为 ${image.naturalWidth}*${image.naturalHeight}`);
        URL.revokeObjectURL(objectUrl);
        event.target.value = '';
        return;
      }

      if (uploadedImageUrl) {
        URL.revokeObjectURL(uploadedImageUrl);
      }
      setUploadedImageName(file.name);
      setUploadedImageUrl(objectUrl);
      setCropRatio('自由');
      controller.setDialog({ type: 'none' });
      setCropOpen(true);
      event.target.value = '';
    };
    image.onerror = () => {
      controller.setNotice('图片读取失败，请重试。');
      URL.revokeObjectURL(objectUrl);
      event.target.value = '';
    };
    image.src = objectUrl;
  };

  const applyHistoryWork = () => {
    if (!selectedHistoryWork) {
      return;
    }
    controller.attachHistoryMaterial(selectedHistoryWork.title);
  };

  const applyUploadedImage = () => {
    controller.applyUploadedMaterial(uploadedImageName);
    setCropOpen(false);
  };

  return (
    <>
      <CreationModalShell
        open={dialog.type === 'generate'}
        title="转视频任务明细"
        size="compact"
        onClose={() => controller.setDialog({ type: 'none' })}
        footerActions={
          <>
            <button type="button" className={styles.darkGhostButton} onClick={() => controller.setDialog({ type: 'none' })}>
              取消
            </button>
            <button type="button" className={styles.darkPrimaryButton} onClick={controller.submitGeneration}>
              确认
            </button>
          </>
        }
      >
        <div className={dialogStyles.videoTaskPanel}>
          <div className={dialogStyles.videoTaskBadge}>
            <span className={dialogStyles.videoTaskStack} />
            <strong>{`x ${generateShotCount}`}</strong>
          </div>
          <div className={dialogStyles.videoTaskCard}>
            <div className={dialogStyles.videoTaskHeader}>转视频任务明细</div>
            <div className={dialogStyles.videoTaskRow}>
              <span>分辨率</span>
              <div className={dialogStyles.videoTaskSeg}>
                {(['720P', '1080P'] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={cx(dialogStyles.videoTaskSegButton, generateDraft.resolution === item && dialogStyles.videoTaskSegButtonActive)}
                    onClick={() => controller.setGenerateDraft({ ...generateDraft, resolution: item })}
                  >
                    {item}
                    {item === '1080P' ? <span className={dialogStyles.videoTaskCrown}>♛</span> : null}
                  </button>
                ))}
              </div>
            </div>
            <div className={dialogStyles.videoTaskRow}>
              <div>
                <span>普通画面模型</span>
                <small>{`${generateShotCount}个分镜`}</small>
              </div>
              <div className={dialogStyles.videoTaskValue}>
                <strong>智能选择</strong>
                <small>智能 | 镜切</small>
              </div>
            </div>
            <div className={dialogStyles.videoTaskCostRow}>
              <span>积分消耗</span>
              <strong>{taskCost}</strong>
            </div>
          </div>
        </div>
      </CreationModalShell>

      <CreationModalShell
        open={dialog.type === 'batch'}
        title="转视频任务明细"
        size="compact"
        onClose={() => controller.setDialog({ type: 'none' })}
        footerActions={
          <>
            <button type="button" className={styles.darkGhostButton} onClick={() => controller.setDialog({ type: 'none' })}>
              取消
            </button>
            <button type="button" className={styles.darkPrimaryButton} onClick={() => controller.submitBatch(dialog.type === 'batch' ? dialog.target : 'all')}>
              确认
            </button>
          </>
        }
      >
        <div className={dialogStyles.videoTaskPanel}>
          <div className={dialogStyles.videoTaskBadge}>
            <span className={dialogStyles.videoTaskStack} />
            <strong>{`x ${batchShotCount}`}</strong>
          </div>
          <div className={dialogStyles.videoTaskCard}>
            <div className={dialogStyles.videoTaskHeader}>转视频任务明细</div>
            <div className={dialogStyles.videoTaskRow}>
              <span>分辨率</span>
              <div className={dialogStyles.videoTaskSeg}>
                {(['720P', '1080P'] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={cx(dialogStyles.videoTaskSegButton, generateDraft.resolution === item && dialogStyles.videoTaskSegButtonActive)}
                    onClick={() => controller.setGenerateDraft({ ...generateDraft, resolution: item })}
                  >
                    {item}
                    {item === '1080P' ? <span className={dialogStyles.videoTaskCrown}>♛</span> : null}
                  </button>
                ))}
              </div>
            </div>
            <div className={dialogStyles.videoTaskRow}>
              <div>
                <span>普通画面模型</span>
                <small>{`${batchShotCount}个分镜`}</small>
              </div>
              <div className={dialogStyles.videoTaskValue}>
                <strong>{dialog.type === 'batch' && dialog.target === 'missing' ? '补齐缺失' : '智能选择'}</strong>
                <small>智能 | 镜切</small>
              </div>
            </div>
            <div className={dialogStyles.videoTaskModeRow}>
              {(['all', 'missing'] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  className={cx(dialogStyles.videoTaskModeButton, dialog.type === 'batch' && dialog.target === item && dialogStyles.videoTaskModeButtonActive)}
                  onClick={() => controller.setDialog({ type: 'batch', target: item })}
                >
                  {item === 'all' ? '全部分镜' : '仅缺失分镜'}
                </button>
              ))}
            </div>
            <div className={dialogStyles.videoTaskCostRow}>
              <span>积分消耗</span>
              <strong>{taskCost}</strong>
            </div>
          </div>
        </div>
      </CreationModalShell>

      <CreationModalShell
        open={dialog.type === 'materials'}
        eyebrow="History"
        title="从历史创作中选择"
        description="仅展示已导出成片的视频作品。"
        size="wide"
        onClose={() => controller.setDialog({ type: 'none' })}
        footerInfo={<span className={dialogStyles.historyPickerHint}>仅展示已导出成片的视频作品</span>}
        footerActions={
          <>
            <input ref={uploadInputRef} className={dialogStyles.hiddenUploadInput} type="file" accept="image/*" onChange={handleUploadChange} />
            <Button variant="secondary" onClick={handleUploadImage}>
              上传图片
            </Button>
            <Button onClick={applyHistoryWork} disabled={!selectedHistoryWork}>
              选择作品
            </Button>
          </>
        }
      >
        <div className={dialogStyles.historyPickerLayout}>
          <div className={dialogStyles.historyCategoryTabs}>
            {studio.explore.categories.map((item) => (
              <button
                key={item}
                type="button"
                className={cx(dialogStyles.historyCategoryTab, historyCategory === item && dialogStyles.historyCategoryTabActive)}
                onClick={() => setHistoryCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <div className={dialogStyles.historyWorksGrid}>
            {filteredHistoryWorks.map((item) => (
              <button
                key={item.id}
                type="button"
                className={cx(dialogStyles.historyWorkCard, selectedHistoryWorkId === item.id && dialogStyles.historyWorkCardActive)}
                onClick={() => setSelectedHistoryWorkId(item.id)}
              >
                <div className={dialogStyles.historyWorkPoster}>
                  <span className={dialogStyles.historyWorkPosterLabel}>{item.coverLabel}</span>
                </div>
                <div className={dialogStyles.historyWorkMeta}>
                  <strong>{item.title}</strong>
                  <small>{item.durationLabel}</small>
                </div>
              </button>
            ))}
          </div>
        </div>
      </CreationModalShell>

      <CreationModalShell
        open={cropOpen}
        title="裁剪图片"
        description="上传后先确认裁剪比例，再应用到当前分镜。"
        size="wide"
        onClose={() => setCropOpen(false)}
        footerActions={
          <>
            <Button variant="secondary" onClick={() => setCropOpen(false)}>
              取消
            </Button>
            <Button onClick={applyUploadedImage}>应用</Button>
          </>
        }
      >
        <div className={dialogStyles.cropLayout}>
          <div className={dialogStyles.cropPreviewSurface}>
            <div className={dialogStyles.cropPreviewFrame}>
              <div className={dialogStyles.cropPreviewInner}>
                {uploadedImageUrl ? (
                  <img className={dialogStyles.cropPreviewImage} src={uploadedImageUrl} alt={uploadedImageName || '上传图片预览'} />
                ) : (
                  <ShotPoster shot={activeShot} size="stage" accent={controller.shotAccent(activeShot.id)} className={dialogStyles.cropPreviewPoster} showCaption={false} showTag={false} />
                )}
              </div>
            </div>
          </div>
          <div className={dialogStyles.cropRatioRow}>
            {(['自由', '9:16', '16:9', '3:4', '4:3'] as const).map((item) => (
              <button
                key={item}
                type="button"
                className={cx(dialogStyles.cropRatioChip, cropRatio === item && dialogStyles.cropRatioChipActive)}
                onClick={() => setCropRatio(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </CreationModalShell>

      <CreationModalShell
        open={dialog.type === 'canvas'}
        eyebrow="Canvas"
        title="画布编辑"
        description="在不生成新版本的前提下，精调当前分镜的取景比例、缩放和偏移。"
        size="wide"
        onClose={() => controller.setDialog({ type: 'none' })}
        footerInfo={<span className={dialogStyles.lightFooterNote}>修改只会作用到当前分镜的裁切参数，不会覆盖素材内容。</span>}
        footerActions={
          <>
            <Button variant="secondary" onClick={controller.resetCanvasDraft}>
              重置参数
            </Button>
            <Button onClick={controller.applyCanvasDraft}>应用到分镜</Button>
          </>
        }
      >
        <div className={dialogStyles.lightToolLayout}>
          <div className={dialogStyles.lightToolPreviewCard}>
            <div className={dialogStyles.canvasPreviewViewport} style={{ aspectRatio: canvasDraft.ratio.replace(':', ' / ') }}>
              <div className={dialogStyles.canvasPreviewInner} style={{ transform: `translate(${canvasDraft.offsetX}px, ${canvasDraft.offsetY}px) scale(${canvasDraft.zoom / 100})` }}>
                <ShotPoster
                  shot={activeShot}
                  size="stage"
                  accent={controller.shotAccent(activeShot.id)}
                  className={dialogStyles.canvasShotPoster}
                  showCaption={false}
                  showTag={false}
                />
              </div>
            </div>
            <div className={dialogStyles.lightToolPreviewMeta}>
              <h3>{activeShot.title}</h3>
              <p>预览画布比例、镜头缩放和主体偏移，所见即应用结果。</p>
            </div>
            <div className={dialogStyles.lightToolStats}>
              <div className={dialogStyles.lightToolStatCard}>
                <small>当前比例</small>
                <strong>{canvasDraft.ratio}</strong>
              </div>
              <div className={dialogStyles.lightToolStatCard}>
                <small>缩放</small>
                <strong>{canvasDraft.zoom}%</strong>
              </div>
              <div className={dialogStyles.lightToolStatCard}>
                <small>偏移</small>
                <strong>{`${canvasDraft.offsetX}/${canvasDraft.offsetY}`}</strong>
              </div>
            </div>
          </div>

          <div className={dialogStyles.lightToolOptionCard}>
            <h4>构图控制</h4>
            <p>用更接近工作台的方式直接调构图，按钮、滑杆和预览实时联动。</p>
            <label className={styles.fieldBlock}>
              <span>目标比例</span>
              <div className={dialogStyles.lightSegmentRow}>
                {(['9:16', '16:9', '1:1'] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={cx(styles.segmentedButton, canvasDraft.ratio === item && styles.segmentedButtonActive)}
                    onClick={() => controller.setCanvasField('ratio', item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </label>
            <div className={dialogStyles.lightToolSliderGrid}>
              <label className={styles.sliderBlock}>
                <span>{`缩放 ${canvasDraft.zoom}%`}</span>
                <input type="range" min="60" max="180" value={canvasDraft.zoom} onChange={(event) => controller.setCanvasField('zoom', Number(event.target.value))} />
              </label>
              <label className={styles.sliderBlock}>
                <span>{`水平偏移 ${canvasDraft.offsetX}px`}</span>
                <input type="range" min="-120" max="120" value={canvasDraft.offsetX} onChange={(event) => controller.setCanvasField('offsetX', Number(event.target.value))} />
              </label>
            </div>
            <label className={styles.sliderBlock}>
              <span>{`垂直偏移 ${canvasDraft.offsetY}px`}</span>
              <input type="range" min="-120" max="120" value={canvasDraft.offsetY} onChange={(event) => controller.setCanvasField('offsetY', Number(event.target.value))} />
            </label>
          </div>
        </div>
      </CreationModalShell>

      <CreationModalShell
        open={dialog.type === 'lipsync'}
        eyebrow="Lip Sync"
        title="对口型"
        description="把原先切侧栏的交互收束成独立工具面板，直接在当前创作流里配置对白、音频和口型参数。"
        size="xl"
        onClose={() => controller.setDialog({ type: 'none' })}
        footerInfo={<span className={dialogStyles.lightFooterNote}>生成结果仍为 mock 流程，但配置结构已对齐为工具区弹层。</span>}
        footerActions={
          <>
            <Button variant="secondary" onClick={() => controller.setDialog({ type: 'none' })}>
              取消
            </Button>
            <Button onClick={controller.submitLipsync}>生成对口型</Button>
          </>
        }
      >
        <div className={dialogStyles.lightToolLayout}>
          <div className={dialogStyles.lightToolPreviewCard}>
            <div className={dialogStyles.lightToolPreviewFrame}>
              <ShotPoster
                shot={lipsyncBaseShot}
                size="sidebar"
                accent={controller.shotAccent(lipsyncBaseShot.id)}
                className={dialogStyles.lipsyncPreviewShot}
                showCaption={false}
                showTag={false}
              />
            </div>
            <div className={dialogStyles.lightToolPreviewMeta}>
              <h3>{lipsyncBaseShot.title}</h3>
              <p>当前底图、对白输入方式和音色模型会共同决定口型生成结果。</p>
            </div>
            <div className={dialogStyles.lightToolStats}>
              <div className={dialogStyles.lightToolStatCard}>
                <small>底图时长</small>
                <strong>{controller.formatShotDuration(lipsyncBaseShot.durationSeconds)}</strong>
              </div>
              <div className={dialogStyles.lightToolStatCard}>
                <small>输入模式</small>
                <strong>{creation.lipSync.inputMode === 'text' ? '文本朗读' : '上传配音'}</strong>
              </div>
              <div className={dialogStyles.lightToolStatCard}>
                <small>音色模型</small>
                <strong>{creation.lipSync.voiceModel}</strong>
              </div>
            </div>
          </div>

          <div className={dialogStyles.lightToolOptionCard}>
            <h4>口型配置</h4>
            <p>模式、输入源和语音参数全部集中在一个弹层中，避免切换页面工作区。</p>

            <label className={styles.fieldBlock}>
              <span>模式</span>
              <div className={dialogStyles.lightSegmentRow}>
                {(['single', 'multi'] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={cx(styles.segmentedButton, creation.lipSync.mode === item && styles.segmentedButtonActive)}
                    onClick={() => controller.setLipsyncField('mode', item)}
                  >
                    {item === 'single' ? '单人模式' : '多人模式'}
                  </button>
                ))}
              </div>
            </label>

            <div className={dialogStyles.lightToolFieldGrid}>
              <label className={styles.fieldBlock}>
                <span>输入方式</span>
                <div className={dialogStyles.lightSegmentRow}>
                  {(['text', 'audio'] as const).map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={cx(styles.segmentedButton, creation.lipSync.inputMode === item && styles.segmentedButtonActive)}
                      onClick={() => controller.setLipsyncField('inputMode', item)}
                    >
                      {item === 'text' ? '文本朗读' : '上传配音'}
                    </button>
                  ))}
                </div>
              </label>

              <label className={styles.fieldBlock}>
                <span>底图</span>
                <select className={styles.fieldSelect} value={creation.lipSync.baseShotId} onChange={(event) => controller.setLipsyncField('baseShotId', event.target.value)}>
                  {creation.shots.map((shot) => (
                    <option key={shot.id} value={shot.id}>
                      {shot.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {creation.lipSync.inputMode === 'text' ? (
              <div className={dialogStyles.lightToolDialogueStack}>
                {creation.lipSync.dialogues.map((item, index) => (
                  <div key={item.id} className={dialogStyles.lightToolDialogueCard}>
                    <div className={dialogStyles.lipsyncDialogueHead}>
                      <strong>{`对白 ${index + 1}`}</strong>
                      {creation.lipSync.mode === 'multi' ? (
                        <button type="button" className={styles.darkGhostButton} onClick={() => controller.removeLipsyncDialogue(item.id)}>
                          删除
                        </button>
                      ) : null}
                    </div>
                    <div className={dialogStyles.lightToolFieldGrid}>
                      <input className={styles.fieldInput} value={item.speaker} onChange={(event) => controller.updateLipsyncDialogue(item.id, 'speaker', event.target.value)} />
                      <textarea className={styles.fieldTextarea} value={item.text} onChange={(event) => controller.updateLipsyncDialogue(item.id, 'text', event.target.value)} placeholder="输入对白内容" />
                    </div>
                  </div>
                ))}
                {creation.lipSync.mode === 'multi' ? (
                  <div className={dialogStyles.lightActionRow}>
                    <span className={dialogStyles.lightFooterNote}>多人模式下可继续追加对白。</span>
                    <Button variant="secondary" onClick={controller.addLipsyncDialogue}>新增对白</Button>
                  </div>
                ) : null}
              </div>
            ) : (
              <label className={dialogStyles.lightToolUploadCard}>
                <strong>上传配音</strong>
                <small>选择一段音频作为口型驱动源。</small>
                <input className={styles.fieldInput} type="file" accept="audio/*" onChange={(event) => controller.setLipsyncField('audioName', event.target.files?.[0]?.name ?? '')} />
              </label>
            )}

            <div className={dialogStyles.lightToolFieldGrid}>
              <label className={styles.fieldBlock}>
                <span>音色模型</span>
                <select className={styles.fieldSelect} value={creation.lipSync.voiceModel} onChange={(event) => controller.setLipsyncField('voiceModel', event.target.value)}>
                  {['Sync Voice', 'Sync Voice Pro', 'Sync Voice Max'].map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.fieldBlock}>
                <span>情绪</span>
                <select className={styles.fieldSelect} value={creation.lipSync.emotion} onChange={(event) => controller.setLipsyncField('emotion', event.target.value as typeof creation.lipSync.emotion)}>
                  {['默认', '温暖', '急促'].map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className={dialogStyles.lightToolSliderGrid}>
              <label className={styles.sliderBlock}>
                <span>音量 {creation.lipSync.volume}</span>
                <input type="range" min="0" max="100" value={creation.lipSync.volume} onChange={(event) => controller.setLipsyncField('volume', Number(event.target.value))} />
              </label>
              <label className={styles.sliderBlock}>
                <span>语速 {Number(creation.lipSync.speed).toFixed(1)}x</span>
                <input type="range" min="50" max="150" value={creation.lipSync.speed * 100} onChange={(event) => controller.setLipsyncField('speed', Number(event.target.value) / 100)} />
              </label>
            </div>

            {lipsyncNotice ? <div className={styles.noticeInline}>{lipsyncNotice}</div> : null}
          </div>
        </div>
      </CreationModalShell>

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

      <CreationModalShell
        open={dialog.type === 'model-picker'}
        eyebrow="Model Picker"
        title="模型选择器"
        description="保持我们自己的视觉层，但把结构做成 Creation 工作台内部的专用模型面板。"
        size="wide"
        onClose={() => controller.setDialog({ type: 'none' })}
        footerInfo={<span className={dialogStyles.footerNote}>若与当前模型不同，确认后会进入“重置并重新生成”的确认步骤。</span>}
        footerActions={
          <>
            <Button variant="secondary" onClick={() => controller.setDialog({ type: 'none' })}>
              取消
            </Button>
            <Button onClick={controller.applyModelPicker}>应用模型</Button>
          </>
        }
      >
        <div className={dialogStyles.modelCategoryTabs}>
          {([
            ['auto', '自动推荐'],
            ['detail', '细节强化'],
            ['reference', '参考一致'],
          ] as const).map(([category, label]) => (
            <button
              key={category}
              type="button"
              className={modelPickerDraft.category === category ? styles.segmentedButtonActive : styles.segmentedButton}
              onClick={() => controller.setModelPickerField('category', category)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className={dialogStyles.modelGrid}>
          {modelOptions.map((item) => (
            <button
              key={item.id}
              type="button"
              className={cx(dialogStyles.modelCard, modelPickerDraft.selectedModel === item.id && dialogStyles.modelCardActive)}
              onClick={() => {
                controller.setModelPickerField('category', item.category);
                controller.setModelPickerField('selectedModel', item.id);
              }}
            >
              <div className={dialogStyles.modelHead}>
                <strong>{item.title}</strong>
                {modelPickerDraft.selectedModel === item.id ? <CreationIcon name="magic" className={styles.buttonGlyph} /> : null}
              </div>
              <p>{item.description}</p>
              <div className={dialogStyles.modelTags}>
                {item.tags.map((tag) => (
                  <span key={tag} className={dialogStyles.modelTag}>
                    {tag}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </CreationModalShell>

      <CreationModalShell
        open={dialog.type === 'confirm-model-reset'}
        title="模型发生变更"
        description="模型发生变更，将为你重新生成主体图和场景图"
        size="compact"
        onClose={() => controller.setDialog({ type: 'none' })}
        footerActions={
          <>
            <button type="button" className={styles.darkGhostButton} onClick={() => controller.setDialog({ type: 'none' })}>
              取消
            </button>
            <button type="button" className={styles.darkPrimaryButton} onClick={() => dialog.type === 'confirm-model-reset' && controller.confirmModelChange(dialog.nextModel)}>
              确定
            </button>
          </>
        }
      >
        <div className={dialogStyles.warningCard}>
          <strong>{`${activeShot.preferredModel} -> ${dialog.type === 'confirm-model-reset' ? dialog.nextModel : ''}`}</strong>
          <p>确认后会将主体图和场景图回退到待生成状态，并按新模型重新生成。</p>
        </div>
      </CreationModalShell>
    </>
  );
}
