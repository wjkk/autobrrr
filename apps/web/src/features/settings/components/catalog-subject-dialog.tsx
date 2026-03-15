'use client';

import type { CatalogVisibility, SubjectGenderTag, SubjectType } from '../lib/catalog-management-api';
import type { SubjectDraft } from './catalog-management-editor-types';
import styles from './catalog-management-page.module.css';
import { Dialog } from '../../shared/components/dialog';
import { genderLabel, subjectTypeLabel, visibilityLabel } from './catalog-management-presenters';

export function CatalogSubjectDialog(props: {
  open: boolean;
  draft: SubjectDraft;
  saving: boolean;
  feedback: string;
  feedbackError: boolean;
  imageSubmitting: boolean;
  imageFeedback: string;
  imageFeedbackTone: 'idle' | 'pending' | 'success' | 'error';
  imageMode: 'upload' | 'ai';
  imagePrompt: string;
  imagePreviewPulse: boolean;
  onClose: () => void;
  onUseForCreation: () => void;
  onClear: () => void;
  onSave: () => void;
  onDraftChange: (updater: (current: SubjectDraft) => SubjectDraft) => void;
  onImageModeChange: (mode: 'upload' | 'ai') => void;
  onImagePromptChange: (value: string) => void;
  onUploadImage: (file: File) => void;
  onGenerateImage: () => void;
}) {
  return (
    <Dialog
      open={props.open}
      title={props.draft.id ? `编辑主体：${props.draft.name || props.draft.slug}` : '创建主体'}
      description="在弹层里集中维护主体信息，并可直接使用当前主体继续创作。"
      size="wide"
      onClose={props.onClose}
      footer={(
        <div className={styles.dialogFooter}>
          <div className={styles.dialogFooterInfo}>
            <div className={styles.dialogFooterTitle}>下一步动作</div>
            <div className={`${styles.feedback} ${props.feedbackError ? styles.feedbackError : ''}`}>
              {props.feedback || '先完善主体信息，再选择继续创作或保存入库。'}
            </div>
          </div>
          <div className={styles.dialogFooterActions}>
            <button type="button" className={styles.secondaryButton} onClick={props.onUseForCreation}>使用主体创作</button>
            <button type="button" className={styles.ghostButton} onClick={props.onClear}>清空</button>
            <button type="button" className={styles.primaryButton} disabled={props.saving} onClick={props.onSave}>
              {props.saving ? '保存中...' : props.draft.id ? '保存主体' : '创建主体'}
            </button>
          </div>
        </div>
      )}
    >
      <div className={styles.dialogLayout}>
        <div className={styles.dialogPreviewColumn}>
          <div className={`${styles.previewHero} ${props.imagePreviewPulse ? styles.previewHeroPulse : ''}`}>
            <img src={props.draft.imageUrl || props.draft.referenceImageUrl || 'https://placehold.co/640x720/e5e7eb/111827?text=Subject'} alt={props.draft.name || 'subject'} className={styles.previewHeroImage} />
            <div className={styles.previewHeroMeta}>
              <span className={styles.previewPill}>{visibilityLabel(props.draft.visibility)}</span>
              <span className={styles.previewPill}>{subjectTypeLabel(props.draft.subjectType)}</span>
              <span className={styles.previewPill}>{genderLabel(props.draft.genderTag)}</span>
              {props.imageSubmitting ? <span className={`${styles.previewPill} ${styles.previewPillPending}`}>{props.imageMode === 'upload' ? '上传中' : '生成中'}</span> : null}
            </div>
          </div>
          <div className={styles.imageToolCard}>
            <div className={styles.imageToolHeader}>
              <div>
                <div className={styles.imageToolEyebrow}>主体图工具</div>
                <div className={styles.imageToolTitle}>默认按 3:4 主体封面处理</div>
              </div>
              <span className={styles.imageToolRatio}>3:4</span>
            </div>
            <div className={styles.imageModeTabs}>
              <button type="button" className={`${styles.imageModeTab} ${props.imageMode === 'upload' ? styles.imageModeTabActive : ''}`} onClick={() => props.onImageModeChange('upload')}>
                本地上传
              </button>
              <button type="button" className={`${styles.imageModeTab} ${props.imageMode === 'ai' ? styles.imageModeTabActive : ''}`} onClick={() => props.onImageModeChange('ai')}>
                AI 生成
              </button>
            </div>
            {props.imageMode === 'upload' ? (
              <label className={styles.uploadBox}>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className={styles.hiddenFileInput}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.currentTarget.value = '';
                    if (file) {
                      props.onUploadImage(file);
                    }
                  }}
                />
                <span className={styles.uploadBoxIcon}>+</span>
                <span className={styles.uploadBoxTitle}>{props.imageSubmitting ? '上传中…' : '上传主体图'}</span>
                <span className={styles.uploadBoxHint}>支持 PNG / JPG / WEBP，建议使用干净背景、完整主体的 3:4 竖图。</span>
              </label>
            ) : (
              <div className={styles.aiToolStack}>
                <div className={styles.aiPromptExamples}>
                  {[
                    '温柔知性的年轻女老师，浅米色背景，半写实，完整半身到全身',
                    '可爱拟人狐狸侦探，暖色工作室灯光，童话质感，完整主体',
                    '未来感机甲少年，干净科技背景，角色海报感，完整人物',
                  ].map((example) => (
                    <button key={example} type="button" className={styles.examplePromptChip} onClick={() => props.onImagePromptChange(example)}>
                      {example}
                    </button>
                  ))}
                </div>
                <textarea
                  className={`${styles.textarea} ${styles.imageToolTextarea}`}
                  value={props.imagePrompt}
                  onChange={(event) => props.onImagePromptChange(event.target.value)}
                  placeholder="输入你对主体图的描述；留空则默认使用主体描述字段。"
                />
                <button type="button" className={styles.primaryButton} disabled={props.imageSubmitting} onClick={props.onGenerateImage}>
                  {props.imageSubmitting ? '生成中…' : 'AI 生成主体图'}
                </button>
              </div>
            )}
            {props.imageFeedback ? (
              <div
                className={`${styles.inlineFeedback} ${
                  props.imageFeedbackTone === 'error'
                    ? styles.inlineFeedbackError
                    : props.imageFeedbackTone === 'pending'
                      ? styles.inlineFeedbackPending
                      : styles.inlineFeedbackSuccess
                }`}
              >
                {props.imageFeedback}
              </div>
            ) : null}
          </div>
        </div>
        <div className={styles.dialogFormColumn}>
          <div className={styles.formGrid}>
            <div className={styles.field}><label className={styles.label}>名称</label><input className={styles.input} value={props.draft.name} onChange={(event) => props.onDraftChange((current) => ({ ...current, name: event.target.value }))} /></div>
            <div className={styles.field}><label className={styles.label}>Slug</label><input className={styles.input} value={props.draft.slug} onChange={(event) => props.onDraftChange((current) => ({ ...current, slug: event.target.value }))} /></div>
            <div className={styles.field}><label className={styles.label}>可见性</label><select className={styles.select} value={props.draft.visibility} onChange={(event) => props.onDraftChange((current) => ({ ...current, visibility: event.target.value as CatalogVisibility }))}><option value="public">公共</option><option value="personal">个人</option></select></div>
            <div className={styles.field}><label className={styles.label}>主体类型</label><select className={styles.select} value={props.draft.subjectType} onChange={(event) => props.onDraftChange((current) => ({ ...current, subjectType: event.target.value as SubjectType }))}><option value="human">人物</option><option value="animal">动物</option><option value="creature">幻想生物</option><option value="object">物体</option></select></div>
            <div className={styles.field}><label className={styles.label}>性别标签</label><select className={styles.select} value={props.draft.genderTag} onChange={(event) => props.onDraftChange((current) => ({ ...current, genderTag: event.target.value as SubjectGenderTag }))}><option value="unknown">未知</option><option value="female">女性</option><option value="male">男性</option><option value="child">儿童</option></select></div>
            <div className={styles.field}><label className={styles.label}>排序</label><input className={styles.input} type="number" value={props.draft.sortOrder} onChange={(event) => props.onDraftChange((current) => ({ ...current, sortOrder: Number(event.target.value) || 0 }))} /></div>
            <div className={styles.fieldFull}><label className={styles.label}>封面图 URL</label><input className={styles.input} value={props.draft.imageUrl} onChange={(event) => props.onDraftChange((current) => ({ ...current, imageUrl: event.target.value }))} /></div>
            <div className={styles.fieldFull}><label className={styles.label}>参考图 URL</label><input className={styles.input} value={props.draft.referenceImageUrl} onChange={(event) => props.onDraftChange((current) => ({ ...current, referenceImageUrl: event.target.value }))} /></div>
            <div className={styles.fieldFull}><label className={styles.label}>描述</label><textarea className={styles.textarea} value={props.draft.description} onChange={(event) => props.onDraftChange((current) => ({ ...current, description: event.target.value }))} /></div>
            <div className={styles.fieldFull}><label className={styles.label}>正向 Prompt 模板</label><textarea className={styles.textarea} value={props.draft.promptTemplate} onChange={(event) => props.onDraftChange((current) => ({ ...current, promptTemplate: event.target.value }))} /></div>
            <div className={styles.fieldFull}><label className={styles.label}>负向 Prompt 模板</label><textarea className={styles.textarea} value={props.draft.negativePrompt} onChange={(event) => props.onDraftChange((current) => ({ ...current, negativePrompt: event.target.value }))} /></div>
            <div className={styles.field}><label className={styles.label}>标签</label><input className={styles.input} value={props.draft.tags} onChange={(event) => props.onDraftChange((current) => ({ ...current, tags: event.target.value }))} placeholder="狐狸, 童话, 可爱" /></div>
            <div className={styles.field}><label className={styles.label}>启用状态</label><div className={styles.checkboxRow}><input type="checkbox" checked={props.draft.enabled} onChange={(event) => props.onDraftChange((current) => ({ ...current, enabled: event.target.checked }))} /><span className={styles.hint}>关闭后首页不会显示该主体</span></div></div>
            <div className={styles.fieldFull}><label className={styles.label}>扩展 Metadata(JSON)</label><textarea className={styles.textarea} value={props.draft.metadata} onChange={(event) => props.onDraftChange((current) => ({ ...current, metadata: event.target.value }))} placeholder='{"identityKey":"fox-main","voiceProfileId":"vp_123"}' /></div>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
