'use client';

import { Button, cx } from '@aiv/ui';

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

export function CreationDialogs({ controller }: CreationDialogsProps) {
  const {
    dialog,
    studio,
    activeShot,
    activeVersion,
    generateDraft,
    canvasDraft,
    storyToolDraft,
    modelPickerDraft,
  } = controller;

  if (!activeShot) {
    return null;
  }

  const sourceVersion = activeShot.versions.find((version) => version.id === storyToolDraft.sourceVersionId) ?? activeVersion;
  const modelOptions = MODEL_OPTIONS.filter((item) => item.category === modelPickerDraft.category);

  return (
    <>
      <CreationModalShell
        open={dialog.type === 'generate'}
        eyebrow="Single Shot"
        title="单分镜转视频"
        description="保留 Seko 工作台里的“左预览 + 右参数”结构，提交后会追加新候选版本。"
        size="wide"
        onClose={() => controller.setDialog({ type: 'none' })}
        footerInfo={<span className={dialogStyles.footerNote}>提交后不会直接覆盖当前成片，会先在版本轨生成一个待替换候选。</span>}
        footerActions={
          <>
            <Button variant="secondary" onClick={() => controller.setDialog({ type: 'none' })}>
              取消
            </Button>
            <Button onClick={controller.submitGeneration}>提交生成</Button>
          </>
        }
      >
        <div className={dialogStyles.modalSplit}>
          <div className={dialogStyles.previewCard}>
            <div className={dialogStyles.previewFrame}>
              <ShotPoster shot={activeShot} size="sidebar" accent={controller.shotAccent(activeShot.id)} caption={activeShot.title} activeMaterialLabel={controller.activeMaterial?.label ?? null} />
            </div>
            <div className={dialogStyles.previewMeta}>
              <h3>{activeShot.title}</h3>
              <p>{activeShot.motionPrompt}</p>
            </div>
            <div className={dialogStyles.previewStats}>
              <div className={dialogStyles.previewStatCard}>
                <small>当前模型</small>
                <strong>{activeShot.preferredModel}</strong>
              </div>
              <div className={dialogStyles.previewStatCard}>
                <small>当前时长</small>
                <strong>{controller.formatShotDuration(activeShot.durationSeconds)}</strong>
              </div>
              <div className={dialogStyles.previewStatCard}>
                <small>版本数</small>
                <strong>{activeShot.versions.length}</strong>
              </div>
            </div>
          </div>
          <div className={dialogStyles.optionStack}>
            <div className={dialogStyles.optionCard}>
              <h4>生成参数</h4>
              <div className={styles.dialogGrid}>
                <label className={styles.fieldBlock}>
                  <span>模型</span>
                  <select className={styles.fieldSelect} value={generateDraft.model} onChange={(event) => controller.setGenerateDraft({ ...generateDraft, model: event.target.value })}>
                    {MODEL_OPTIONS.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title}
                      </option>
                    ))}
                  </select>
                </label>
                <div className={styles.fieldRow}>
                  <label className={styles.fieldBlock}>
                    <span>清晰度</span>
                    <select
                      className={styles.fieldSelect}
                      value={generateDraft.resolution}
                      onChange={(event) => controller.setGenerateDraft({ ...generateDraft, resolution: event.target.value as typeof generateDraft.resolution })}
                    >
                      {['720P', '1080P'].map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={styles.fieldBlock}>
                    <span>时长</span>
                    <select
                      className={styles.fieldSelect}
                      value={generateDraft.durationMode}
                      onChange={(event) => controller.setGenerateDraft({ ...generateDraft, durationMode: event.target.value as typeof generateDraft.durationMode })}
                    >
                      {['智能', '4s', '6s'].map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={generateDraft.cropToVoice}
                    onChange={(event) => controller.setGenerateDraft({ ...generateDraft, cropToVoice: event.target.checked })}
                  />
                  <span>裁剪至配音时长</span>
                </label>
              </div>
            </div>
            <div className={dialogStyles.optionCard}>
              <h4>生成结果规则</h4>
              <p>mock 会把结果追加到版本轨，而不是直接替换当前成片。你可以在右侧先预览，再决定是否应用。</p>
            </div>
          </div>
        </div>
      </CreationModalShell>

      <CreationModalShell
        open={dialog.type === 'batch'}
        eyebrow="Batch"
        title="批量转视频"
        description="支持全部分镜或仅补缺分镜，便于覆盖批量任务与失败恢复流程。"
        onClose={() => controller.setDialog({ type: 'none' })}
        footerInfo={<span className={dialogStyles.footerNote}>当前批量规则会故意保留一条失败分镜，用于验证重试和替换闭环。</span>}
        footerActions={
          <>
            <Button variant="secondary" onClick={() => controller.setDialog({ type: 'none' })}>
              取消
            </Button>
            <Button onClick={() => controller.submitBatch(dialog.type === 'batch' ? dialog.target : 'all')}>提交任务</Button>
          </>
        }
      >
        <div className={dialogStyles.optionStack}>
          <div className={dialogStyles.optionCard}>
            <h4>任务目标</h4>
            <div className={styles.segmentedGroup}>
              {(['all', 'missing'] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  className={item === (dialog.type === 'batch' ? dialog.target : 'all') ? styles.segmentedButtonActive : styles.segmentedButton}
                  onClick={() => controller.setDialog({ type: 'batch', target: item })}
                >
                  {item === 'all' ? '全部分镜' : '仅缺失分镜'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </CreationModalShell>

      <CreationModalShell
        open={dialog.type === 'materials'}
        eyebrow="Materials"
        title="提交素材"
        description="延续工作台内部的“本地上传 / 历史创作”双来源结构。"
        size="wide"
        onClose={() => controller.setDialog({ type: 'none' })}
        footerInfo={<span className={dialogStyles.footerNote}>绑定后会直接进入当前分镜的素材栈，可继续设为主素材或移除。</span>}
        footerActions={
          <>
            <Button variant="secondary" onClick={() => controller.setDialog({ type: 'none' })}>
              取消
            </Button>
            <Button onClick={controller.attachLocalMaterial}>绑定本地素材</Button>
          </>
        }
      >
        <div className={dialogStyles.optionStack}>
          <div className={styles.segmentedGroup}>
            {(['local', 'history'] as const).map((item) => (
              <button
                key={item}
                type="button"
                className={item === controller.materialTab ? styles.segmentedButtonActive : styles.segmentedButton}
                onClick={() => controller.setMaterialTab(item)}
              >
                {item === 'local' ? '本地上传' : '历史创作'}
              </button>
            ))}
          </div>
          {controller.materialTab === 'local' ? (
            <div className={dialogStyles.uploadCard}>
              <strong>上传本地文件</strong>
              <p>图片和视频都允许进入当前分镜的素材栈，后续可作为生成参考继续使用。</p>
              <input
                className={styles.fieldInput}
                type="file"
                accept="image/*,video/*"
                onChange={(event) => controller.setUploadedMaterialName(event.target.files?.[0]?.name ?? '')}
              />
            </div>
          ) : (
            <div className={styles.historyGrid}>
              {studio.historyWorks.map((item) => (
                <button key={item.id} type="button" className={styles.historyPickCard} onClick={() => controller.attachHistoryMaterial(item.title)}>
                  <strong>{item.title}</strong>
                  <small>{item.intro}</small>
                </button>
              ))}
            </div>
          )}
        </div>
      </CreationModalShell>

      <CreationModalShell
        open={dialog.type === 'canvas'}
        eyebrow="Canvas"
        title="画布编辑"
        description="通过缩放、偏移和比例模拟画面裁切。"
        size="xl"
        onClose={() => controller.setDialog({ type: 'none' })}
        footerInfo={<span className={dialogStyles.footerNote}>这一步只改当前分镜的取景方式，不会直接生成新版本。</span>}
        footerActions={
          <>
            <Button variant="secondary" onClick={controller.resetCanvasDraft}>
              重置参数
            </Button>
            <Button onClick={controller.applyCanvasDraft}>应用到分镜</Button>
          </>
        }
      >
        <div className={styles.canvasEditorDialog}>
          <div className={styles.canvasPreviewCard}>
            <div
              className={styles.canvasPreviewFrame}
              style={{ transform: `translate(${canvasDraft.offsetX}px, ${canvasDraft.offsetY}px) scale(${canvasDraft.zoom / 100})` }}
            >
              <strong>{activeShot.title}</strong>
              <span>{canvasDraft.ratio}</span>
            </div>
          </div>
          <div className={styles.dialogGrid}>
            <label className={styles.fieldBlock}>
              <span>目标比例</span>
              <select className={styles.fieldSelect} value={canvasDraft.ratio} onChange={(event) => controller.setCanvasField('ratio', event.target.value as typeof canvasDraft.ratio)}>
                {['9:16', '16:9', '1:1'].map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.fieldBlock}>
              <span>{`缩放 ${canvasDraft.zoom}%`}</span>
              <input type="range" min="60" max="180" value={canvasDraft.zoom} onChange={(event) => controller.setCanvasField('zoom', Number(event.target.value))} />
            </label>
            <label className={styles.fieldBlock}>
              <span>{`水平偏移 ${canvasDraft.offsetX}px`}</span>
              <input type="range" min="-120" max="120" value={canvasDraft.offsetX} onChange={(event) => controller.setCanvasField('offsetX', Number(event.target.value))} />
            </label>
            <label className={styles.fieldBlock}>
              <span>{`垂直偏移 ${canvasDraft.offsetY}px`}</span>
              <input type="range" min="-120" max="120" value={canvasDraft.offsetY} onChange={(event) => controller.setCanvasField('offsetY', Number(event.target.value))} />
            </label>
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
        eyebrow="Confirm"
        title="确认切换模型"
        description="已有版本存在时，切换模型会把当前分镜重置回待生成状态，再从新的模型重新开始。"
        onClose={() => controller.setDialog({ type: 'none' })}
        footerInfo={<span className={dialogStyles.footerNote}>{`${activeShot.preferredModel} -> ${dialog.type === 'confirm-model-reset' ? dialog.nextModel : ''}`}</span>}
        footerActions={
          <>
            <Button variant="secondary" onClick={() => controller.setDialog({ type: 'none' })}>
              取消
            </Button>
            <Button onClick={() => dialog.type === 'confirm-model-reset' && controller.confirmModelChange(dialog.nextModel)}>确认重置</Button>
          </>
        }
      >
        <div className={dialogStyles.warningCard}>
          <strong>版本与候选结果会被清空</strong>
          <p>当前分镜会回到“待生成”状态，后续生成结果将按新的模型重新进入版本轨。</p>
        </div>
      </CreationModalShell>
    </>
  );
}
